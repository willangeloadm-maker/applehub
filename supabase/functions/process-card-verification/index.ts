import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CardVerificationRequest {
  card_number: string;
  card_holder_name: string;
  card_expiration_date: string; // MMYY
  card_cvv: string;
  amount: number;
  user_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      card_number,
      card_holder_name,
      card_expiration_date,
      card_cvv,
      amount,
      user_id,
    }: CardVerificationRequest = await req.json();

    console.log("🔐 Iniciando verificação de cartão para usuário:", user_id);

    // Buscar configurações da Pagar.me
    const { data: settings, error: settingsError } = await supabase
      .from("payment_settings")
      .select("*")
      .maybeSingle();

    if (settingsError || !settings) {
      console.error("❌ Erro ao buscar configurações:", settingsError);
      return new Response(
        JSON.stringify({ error: "Configurações de pagamento não encontradas" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Buscar dados do perfil do usuário para obter telefone, CPF e endereço
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("telefone, cpf, rua, numero, cep, cidade, estado")
      .eq("id", user_id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("❌ Erro ao buscar perfil:", profileError);
      return new Response(
        JSON.stringify({ error: "Perfil do usuário não encontrado" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("📱 Telefone do usuário:", profile.telefone);

    // Criar pedido com cobrança no cartão
    console.log("💳 Criando cobrança de R$", amount.toFixed(2));
    
    // Formatar telefone removendo caracteres não numéricos
    const phoneNumbers = profile.telefone.replace(/\D/g, "");
    const ddd = phoneNumbers.substring(0, 2);
    const number = phoneNumbers.substring(2);
    
    const pagarmeResponse = await fetch("https://api.pagar.me/core/v5/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(settings.secret_key + ":")}`,
      },
      body: JSON.stringify({
        customer: {
          name: card_holder_name,
          type: "individual",
          document: profile.cpf.replace(/\D/g, ""),
          document_type: "CPF",
          phones: {
            mobile_phone: {
              country_code: "55",
              area_code: ddd,
              number: number,
            }
          }
        },
        items: [
          {
            amount: Math.round(amount * 100), // Converter para centavos
            description: "Verificação de cartão AppleHub",
            quantity: 1,
          },
        ],
        payments: [
          {
            payment_method: "credit_card",
            credit_card: {
              card: {
                number: card_number.replace(/\s/g, ""),
                holder_name: card_holder_name,
                exp_month: parseInt(card_expiration_date.substring(0, 2)),
                exp_year: parseInt("20" + card_expiration_date.substring(2, 4)),
                cvv: card_cvv,
                billing_address: {
                  line_1: `${profile.rua}, ${profile.numero}`,
                  zip_code: profile.cep.replace(/\D/g, ""),
                  city: profile.cidade,
                  state: profile.estado,
                  country: "BR",
                }
              },
              installments: 1,
              statement_descriptor: "APPLEHUB",
            },
          },
        ],
      }),
    });

    if (!pagarmeResponse.ok) {
      const errorData = await pagarmeResponse.text();
      console.error("❌ Erro Pagar.me na cobrança:", errorData);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao processar cartão", 
          details: errorData,
          success: false 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const orderData = await pagarmeResponse.json();
    console.log("✅ Cobrança criada:", orderData.id);

    const chargeId = orderData.charges?.[0]?.id;
    const transactionId = orderData.charges?.[0]?.last_transaction?.id;
    const status = orderData.charges?.[0]?.status;
    const gatewayResponse = orderData.charges?.[0]?.last_transaction?.gateway_response;

    console.log("💳 Status da cobrança:", status);
    
    if (gatewayResponse) {
      console.log("🔍 Gateway Response:", JSON.stringify(gatewayResponse, null, 2));
    }

    // Se a cobrança foi bem-sucedida, fazer o reembolso imediato
    if (status === "paid" && chargeId) {
      console.log("💰 Processando reembolso imediato...");
      
      const refundResponse = await fetch(
        `https://api.pagar.me/core/v5/charges/${chargeId}/refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${btoa(settings.secret_key + ":")}`,
          },
          body: JSON.stringify({
            amount: Math.round(amount * 100),
          }),
        }
      );

      if (refundResponse.ok) {
        const refundData = await refundResponse.json();
        console.log("✅ Reembolso processado:", refundData.id);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Cartão verificado com sucesso. O valor foi estornado imediatamente.",
            charge_id: chargeId,
            refund_id: refundData.id,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        const refundError = await refundResponse.text();
        console.error("⚠️ Erro no reembolso:", refundError);
        
        // Cobrança foi feita mas reembolso falhou
        return new Response(
          JSON.stringify({
            success: false,
            error: "Cartão foi cobrado mas o reembolso falhou. Entre em contato com o suporte.",
            charge_id: chargeId,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      console.error("❌ Cobrança não foi autorizada:", status);
      
      // Logar detalhes do erro para debug
      if (gatewayResponse) {
        console.error("🔍 Detalhes do erro:", JSON.stringify(gatewayResponse));
      }
      
      // Extrair mensagem de erro amigável
      let errorMessage = "Cartão não foi autorizado. Verifique os dados e tente novamente.";
      
      if (gatewayResponse?.errors && gatewayResponse.errors.length > 0) {
        errorMessage = gatewayResponse.errors[0].message || errorMessage;
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("❌ Erro geral:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
