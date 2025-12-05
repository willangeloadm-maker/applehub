import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, origin",
};

interface PixRequest {
  amount: number;
  description: string;
  user_id: string;
  order_id?: string;
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

    const { amount, description, user_id, order_id }: PixRequest = await req.json();

    console.log("📌 Gerando PIX para usuário:", user_id, "valor:", amount);

    // Extrair domínio da origem da requisição
    const origin = req.headers.get('origin') || '';
    let domain = '';
    
    try {
      if (origin) {
        const url = new URL(origin);
        domain = url.hostname;
      }
    } catch (e) {
      console.log('Não foi possível extrair domínio:', e);
    }

    console.log('Domínio da requisição:', domain);

    // Buscar configurações da Pagar.me pelo domínio
    let settings = null;
    
    if (domain) {
      const { data: domainSettings } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("domain", domain)
        .maybeSingle();
      
      if (domainSettings) {
        settings = domainSettings;
        console.log("Usando configurações do domínio:", domain);
      }
    }
    
    // Fallback para qualquer configuração
    if (!settings) {
      const { data: fallbackSettings, error: settingsError } = await supabase
        .from("payment_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (settingsError || !fallbackSettings) {
        console.error("❌ Erro ao buscar configurações:", settingsError);
        return new Response(
          JSON.stringify({ error: "Configurações de pagamento não encontradas" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      settings = fallbackSettings;
      console.log("Usando configurações fallback");
    }

    // Buscar dados do perfil do usuário (obrigatório para PSP)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("nome_completo, cpf, telefone, id")
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

    // Buscar email do usuário
    const { data: emailData, error: emailError } = await supabase.rpc('get_user_email_by_id', { 
      user_id: profile.id 
    }) as { data: string | null, error: any };
    
    if (emailError || !emailData) {
      console.error("❌ Erro ao buscar email:", emailError);
      return new Response(
        JSON.stringify({ error: "Email do usuário não encontrado" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("📧 Email:", emailData);

    // Formatar telefone
    const phoneNumbers = profile.telefone.replace(/\D/g, "");
    console.log("📞 Telefone completo:", phoneNumbers);
    
    if (phoneNumbers.length !== 11) {
      console.error("❌ Telefone inválido. Precisa ter 11 dígitos (DDD + 9 dígitos). Atual:", phoneNumbers.length);
      return new Response(
        JSON.stringify({ error: "Telefone do usuário está em formato inválido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const ddd = phoneNumbers.substring(0, 2);
    const number = phoneNumbers.substring(2);
    
    console.log("📱 DDD:", ddd, "Número:", number);

    // Determinar tipo de transação baseado no order_id
    let tipoTransacao = "pagamento_completo";
    if (order_id) {
      const { data: orderData } = await supabase
        .from("orders")
        .select("payment_type")
        .eq("id", order_id)
        .single();
      
      if (orderData?.payment_type === "parcelamento_applehub") {
        tipoTransacao = "entrada";
      }
    }

    console.log("💰 Tipo de transação:", tipoTransacao);

    // Chamar API da Pagar.me para gerar PIX
    const startTime = Date.now();
    const requestBody = {
      customer: {
        name: profile.nome_completo,
        email: emailData,
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
          code: `ITEM-${Date.now()}`,
          amount: Math.round(amount * 100),
          description,
          quantity: 1,
        },
      ],
      payments: [
        {
          payment_method: "pix",
          pix: {
            expires_in: 3600,
          },
        },
      ],
    };

    const pagarmeResponse = await fetch("https://api.pagar.me/core/v5/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(settings.secret_key + ":")}`,
      },
      body: JSON.stringify(requestBody),
    });

    const duration = Date.now() - startTime;
    const responseStatus = pagarmeResponse.status;
    let responseBody: any = null;
    let errorData: string | null = null;

    if (!pagarmeResponse.ok) {
      errorData = await pagarmeResponse.text();
      console.error("Erro Pagar.me:", errorData);
      
      // Registrar log de erro
      await supabase.from("pagarme_api_logs").insert({
        endpoint: "/core/v5/orders",
        method: "POST",
        request_body: requestBody,
        response_status: responseStatus,
        response_body: { error: errorData },
        error_message: `Erro ao gerar PIX: ${errorData}`,
        user_id,
        order_id,
        duration_ms: duration,
        metadata: { type: "pix_generation", description, domain }
      });

      return new Response(
        JSON.stringify({ error: "Erro ao gerar PIX", details: errorData }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const pixData = await pagarmeResponse.json();
    responseBody = pixData;
    const qrCode = pixData.charges[0].last_transaction.qr_code;
    const qrCodeUrl = pixData.charges[0].last_transaction.qr_code_url;

    // Salvar transação no banco
    const { data: transactionData, error: transactionError } = await supabase.from("transactions").insert({
      user_id,
      order_id,
      tipo: tipoTransacao,
      valor: amount,
      status: "pendente",
      metodo_pagamento: "pix",
      pix_qr_code: qrCodeUrl,
      pix_copia_cola: qrCode,
      data_vencimento: new Date(Date.now() + 3600000).toISOString(),
    }).select().single();

    if (transactionError) {
      console.error("Erro ao salvar transação:", transactionError);
    }

    // Registrar log de sucesso
    await supabase.from("pagarme_api_logs").insert({
      endpoint: "/core/v5/orders",
      method: "POST",
      request_body: requestBody,
      response_status: responseStatus,
      response_body: responseBody,
      user_id,
      order_id,
      transaction_id: transactionData?.id,
      duration_ms: duration,
      metadata: { 
        type: "pix_generation", 
        description,
        domain,
        qr_code_generated: true,
        expires_at: new Date(Date.now() + 3600000).toISOString()
      }
    });

    console.log(`✅ PIX gerado com sucesso em ${duration}ms`);

    return new Response(
      JSON.stringify({
        qr_code: qrCode,
        qr_code_url: qrCodeUrl,
        amount,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
