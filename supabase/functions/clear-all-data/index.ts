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
    const { admin_password } = await req.json();

    // Verificar senha de administrador
    if (admin_password !== "Ar102030") {
      throw new Error("Senha de administrador inválida");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Iniciando limpeza de dados...");

    // Deletar na ordem correta devido às foreign keys
    // 1. Histórico de status de pedidos
    await supabase.from("order_status_history").delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Histórico de status apagado");

    // 2. Itens de pedidos
    await supabase.from("order_items").delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Itens de pedidos apagados");

    // 3. Transações
    await supabase.from("transactions").delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Transações apagadas");

    // 4. Análises de crédito
    await supabase.from("credit_analyses").delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Análises de crédito apagadas");

    // 5. Pedidos
    await supabase.from("orders").delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Pedidos apagados");

    // 6. Itens do carrinho
    await supabase.from("cart_items").delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Itens do carrinho apagados");

    // 7. Favoritos
    await supabase.from("favorites").delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Favoritos apagados");

    // 8. Verificações de conta
    await supabase.from("account_verifications").delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Verificações apagadas");

    // 9. Tentativas de pagamento com cartão
    await supabase.from("card_payment_attempts").delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Tentativas de pagamento apagadas");

    // 10. Perfis de usuários
    await supabase.from("profiles").delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Perfis apagados");

    // 11. Roles de usuários
    await supabase.from("user_roles").delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Roles de usuários apagadas");

    // 12. Deletar usuários da tabela auth.users usando admin API
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Erro ao listar usuários:", usersError);
    } else if (users && users.users) {
      console.log(`Deletando ${users.users.length} usuários...`);
      
      for (const user of users.users) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`Erro ao deletar usuário ${user.id}:`, deleteError);
        }
      }
      console.log("Usuários apagados");
    }

    console.log("Limpeza concluída com sucesso!");

    return new Response(
      JSON.stringify({ success: true, message: "Todos os dados foram apagados com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro ao limpar dados:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
