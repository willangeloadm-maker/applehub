import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Calculate 30 minutes ago
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    console.log(`Buscando pedidos PIX pendentes criados antes de ${thirtyMinutesAgo}`);

    // Find pending PIX transactions older than 30 minutes
    const { data: expiredTransactions, error: fetchError } = await supabase
      .from("transactions")
      .select("*, orders!inner(*)")
      .eq("status", "pendente")
      .eq("metodo_pagamento", "pix")
      .lt("created_at", thirtyMinutesAgo)
      .not("pix_copia_cola", "is", null);

    if (fetchError) {
      console.error("Erro ao buscar transações:", fetchError);
      throw fetchError;
    }

    console.log(`Encontradas ${expiredTransactions?.length || 0} transações expiradas`);

    if (!expiredTransactions || expiredTransactions.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhuma transação expirada encontrada", cancelled: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let cancelledCount = 0;

    for (const transaction of expiredTransactions) {
      try {
        // Update transaction status to cancelled
        const { error: transactionError } = await supabase
          .from("transactions")
          .update({ status: "cancelado" })
          .eq("id", transaction.id);

        if (transactionError) {
          console.error(`Erro ao cancelar transação ${transaction.id}:`, transactionError);
          continue;
        }

        // Update order status to cancelled
        if (transaction.order_id) {
          const { error: orderError } = await supabase
            .from("orders")
            .update({ status: "cancelado" })
            .eq("id", transaction.order_id)
            .eq("status", "em_analise"); // Only cancel if still pending

          if (!orderError) {
            // Add to order history
            await supabase
              .from("order_status_history")
              .insert({
                order_id: transaction.order_id,
                status: "cancelado",
                observacao: "Pedido cancelado automaticamente - PIX não pago em 30 minutos",
              });

            console.log(`Pedido ${transaction.order_id} cancelado com sucesso`);
            cancelledCount++;
          }
        }
      } catch (error) {
        console.error(`Erro ao processar transação ${transaction.id}:`, error);
      }
    }

    console.log(`Total de pedidos cancelados: ${cancelledCount}`);

    return new Response(
      JSON.stringify({ 
        message: "Processamento concluído", 
        cancelled: cancelledCount,
        processed: expiredTransactions.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro no processamento:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
