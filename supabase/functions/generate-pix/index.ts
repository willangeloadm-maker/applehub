import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Buscar configurações da Pagar.me
    const { data: settings, error: settingsError } = await supabase
      .from("payment_settings")
      .select("*")
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: "Configurações de pagamento não encontradas" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Chamar API da Pagar.me para gerar PIX
    const pagarmeResponse = await fetch("https://api.pagar.me/core/v5/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(settings.secret_key + ":")}`,
      },
      body: JSON.stringify({
        customer: {
          name: "Cliente AppleHub",
        },
        items: [
          {
            amount: Math.round(amount * 100), // Converter para centavos
            description,
            quantity: 1,
          },
        ],
        payments: [
          {
            payment_method: "pix",
            pix: {
              expires_in: 3600, // 1 hora
            },
          },
        ],
      }),
    });

    if (!pagarmeResponse.ok) {
      const errorData = await pagarmeResponse.text();
      console.error("Erro Pagar.me:", errorData);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar PIX", details: errorData }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const pixData = await pagarmeResponse.json();
    const qrCode = pixData.charges[0].last_transaction.qr_code;
    const qrCodeUrl = pixData.charges[0].last_transaction.qr_code_url;

    // Salvar transação no banco
    const { error: transactionError } = await supabase.from("transactions").insert({
      user_id,
      order_id,
      tipo: "entrada",
      valor: amount,
      status: "pendente",
      metodo_pagamento: "pix",
      pix_qr_code: qrCodeUrl,
      pix_copia_cola: qrCode,
      data_vencimento: new Date(Date.now() + 3600000).toISOString(), // 1 hora
    });

    if (transactionError) {
      console.error("Erro ao salvar transação:", transactionError);
    }

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