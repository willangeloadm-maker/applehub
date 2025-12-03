import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature",
};

// Função para criar transferência (saque) na Pagar.me
async function createTransfer(recipientId: string, secretKey: string, withdrawPassword: string | null, amount: number): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const amountInCents = Math.round(amount * 100);
    
    console.log(`Iniciando transferência de R$ ${amount} (${amountInCents} centavos) para recipient ${recipientId}`);
    
    const requestBody: { amount: number; metadata?: { password?: string } } = {
      amount: amountInCents
    };
    
    // Adicionar senha se configurada
    if (withdrawPassword) {
      requestBody.metadata = { password: withdrawPassword };
    }
    
    const response = await fetch(`https://api.pagar.me/core/v5/recipients/${recipientId}/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(secretKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erro na transferência Pagar.me:', data);
      return { success: false, error: data.message || 'Erro ao criar transferência' };
    }

    console.log('Transferência criada com sucesso:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao criar transferência:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar configurações de pagamento (incluindo auto_withdraw_enabled e withdraw_password)
    const { data: settings } = await supabase
      .from("payment_settings")
      .select("secret_key, recipient_id, auto_withdraw_enabled, withdraw_password")
      .single();

    if (!settings) {
      return new Response(
        JSON.stringify({ error: "Configurações não encontradas" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validar assinatura do webhook
    const signature = req.headers.get("x-hub-signature");
    const body = await req.text();
    
    if (signature) {
      const hmac = createHmac("sha256", settings.secret_key);
      hmac.update(body);
      const expectedSignature = `sha256=${hmac.digest("hex")}`;
      
      if (signature !== expectedSignature) {
        console.error("Assinatura inválida");
        return new Response(
          JSON.stringify({ error: "Assinatura inválida" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const webhookData = JSON.parse(body);
    console.log("Webhook recebido:", webhookData);

    // Processar evento de pagamento
    if (webhookData.type === "order.paid" || webhookData.type === "charge.paid") {
      const orderId = webhookData.data?.id;
      const pixCode = webhookData.data?.charges?.[0]?.last_transaction?.qr_code;
      const paidAmount = webhookData.data?.charges?.[0]?.paid_amount || webhookData.data?.amount;

      if (!pixCode) {
        console.error("QR Code não encontrado no webhook");
        return new Response(
          JSON.stringify({ error: "QR Code não encontrado" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Buscar transação pelo código PIX
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .select("*")
        .eq("pix_copia_cola", pixCode)
        .single();

      if (transactionError || !transaction) {
        console.error("Transação não encontrada:", transactionError);
        return new Response(
          JSON.stringify({ error: "Transação não encontrada" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Atualizar status da transação
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: "pago",
          data_pagamento: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      if (updateError) {
        console.error("Erro ao atualizar transação:", updateError);
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar transação" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // ========== SAQUE AUTOMÁTICO ==========
      let transferResult = null;
      if (settings.auto_withdraw_enabled && settings.recipient_id) {
        // Valor a transferir (em reais)
        const transferAmount = paidAmount ? paidAmount / 100 : transaction.valor;
        
        console.log(`🏦 Saque automático ativado. Iniciando transferência de R$ ${transferAmount}`);
        
        transferResult = await createTransfer(settings.recipient_id, settings.secret_key, settings.withdraw_password, transferAmount);
        
        if (transferResult.success) {
          console.log(`✅ Saque automático realizado com sucesso! ID: ${transferResult.data?.id}`);
          
          // Registrar log do saque
          await supabase.from("pagarme_api_logs").insert({
            endpoint: `/recipients/${settings.recipient_id}/transfers`,
            method: "POST",
            request_body: { amount: Math.round(transferAmount * 100) },
            response_status: 200,
            response_body: transferResult.data,
            user_id: transaction.user_id,
            order_id: transaction.order_id,
            transaction_id: transaction.id,
            metadata: { 
              type: "auto_withdraw", 
              transfer_id: transferResult.data?.id,
              transfer_amount: transferAmount
            }
          });
        } else {
          console.error(`❌ Erro no saque automático: ${transferResult.error}`);
          
          // Registrar log de erro do saque
          await supabase.from("pagarme_api_logs").insert({
            endpoint: `/recipients/${settings.recipient_id}/transfers`,
            method: "POST",
            request_body: { amount: Math.round(transferAmount * 100) },
            response_status: 400,
            error_message: transferResult.error,
            user_id: transaction.user_id,
            order_id: transaction.order_id,
            transaction_id: transaction.id,
            metadata: { type: "auto_withdraw_error" }
          });
        }
      } else {
        console.log("⏸️ Saque automático desativado ou recipient_id não configurado");
      }
      // ========================================

      // Atualizar status do pedido baseado no tipo de transação
      if (transaction.order_id) {
        if (transaction.tipo === "entrada") {
          // Se for entrada (parcelamento), criar as parcelas futuras
          const { data: creditAnalysis } = await supabase
            .from("credit_analyses")
            .select("*")
            .eq("user_id", transaction.user_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (creditAnalysis) {
            const valorFinanciado = creditAnalysis.valor_aprovado - transaction.valor;
            const numParcelas = 24; // Ou buscar do pedido
            
            // Buscar configurações de juros (simplificado)
            const jurosBase = 2.0; // Pode vir do cálculo baseado na entrada
            const valorParcela = (valorFinanciado * Math.pow(1 + jurosBase/100, numParcelas)) / numParcelas;

            // Criar parcelas
            const parcelas = [];
            for (let i = 1; i <= numParcelas; i++) {
              const dataVencimento = new Date();
              dataVencimento.setDate(dataVencimento.getDate() + (30 * i));

              parcelas.push({
                user_id: transaction.user_id,
                order_id: transaction.order_id,
                tipo: "parcela",
                valor: valorParcela,
                status: "pendente",
                metodo_pagamento: "parcelamento_applehub",
                parcela_numero: i,
                total_parcelas: numParcelas,
                data_vencimento: dataVencimento.toISOString(),
              });
            }

            const { error: parcelasError } = await supabase
              .from("transactions")
              .insert(parcelas);

            if (parcelasError) {
              console.error("Erro ao criar parcelas:", parcelasError);
            }

            // Atualizar pedido como pagamento_confirmado
            await supabase
              .from("orders")
              .update({ status: "pagamento_confirmado" })
              .eq("id", transaction.order_id);

            // Adicionar ao histórico
            await supabase
              .from("order_status_history")
              .insert({
                order_id: transaction.order_id,
                status: "pagamento_confirmado",
                observacao: "Entrada paga via PIX",
              });
          }
        } else {
          // Pagamento PIX normal (não é entrada de parcelamento)
          // Atualizar pedido para pagamento_confirmado (Faturado)
          await supabase
            .from("orders")
            .update({ status: "pagamento_confirmado" })
            .eq("id", transaction.order_id);

          // Adicionar ao histórico
          await supabase
            .from("order_status_history")
            .insert({
              order_id: transaction.order_id,
              status: "pagamento_confirmado",
              observacao: "Pagamento PIX confirmado. Pedido faturado.",
            });

          console.log("Pedido atualizado para pagamento_confirmado:", transaction.order_id);
        }
      }

      console.log("Pagamento confirmado com sucesso");
    }

    const duration = Date.now() - startTime;
    
    // Registrar log do webhook
    await supabase.from("pagarme_api_logs").insert({
      endpoint: "/webhook",
      method: "POST",
      request_body: webhookData,
      response_status: 200,
      response_body: { success: true },
      user_id: webhookData.data?.customer?.id || null,
      order_id: webhookData.data?.id || null,
      duration_ms: duration,
      metadata: { 
        type: "webhook_received", 
        event: webhookData.type || "unknown",
        signature_valid: !!signature
      }
    });

    console.log(`✅ Webhook processado com sucesso em ${duration}ms`);

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processado" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro no webhook:", error);
    
    const duration = Date.now() - startTime;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Registrar log de erro
    await supabase.from("pagarme_api_logs").insert({
      endpoint: "/webhook",
      method: "POST",
      response_status: 500,
      error_message: error instanceof Error ? error.message : "Erro desconhecido",
      duration_ms: duration,
      metadata: { type: "webhook_error" }
    });
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});