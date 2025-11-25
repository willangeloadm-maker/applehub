import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteUserRequest {
  userId: string;
  adminPassword: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, adminPassword }: DeleteUserRequest = await req.json();

    console.log('🗑️ Solicitação de exclusão de usuário:', userId);

    // Verificar senha de admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: settings } = await supabaseClient
      .from('admin_settings')
      .select('senha')
      .single();

    if (!settings || settings.senha !== adminPassword) {
      console.log('❌ Senha de admin incorreta');
      return new Response(
        JSON.stringify({ error: 'Senha de administrador incorreta' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Criar cliente com service role para deletar usuário
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Verificando se usuário existe...');
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userData) {
      console.log('❌ Usuário não encontrado:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🗑️ Deletando dados relacionados do usuário...');
    
    // Deletar dados relacionados primeiro para evitar conflitos de foreign key
    await supabaseAdmin.from('cart_items').delete().eq('user_id', userId);
    await supabaseAdmin.from('favorites').delete().eq('user_id', userId);
    await supabaseAdmin.from('product_reviews').delete().eq('user_id', userId);
    await supabaseAdmin.from('coupon_usage').delete().eq('user_id', userId);
    await supabaseAdmin.from('card_payment_attempts').delete().eq('user_id', userId);
    
    // Deletar transações
    await supabaseAdmin.from('transactions').delete().eq('user_id', userId);
    
    // Deletar análises de crédito
    await supabaseAdmin.from('credit_analyses').delete().eq('user_id', userId);
    
    // Buscar pedidos do usuário para deletar dados relacionados
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('user_id', userId);
    
    if (orders && orders.length > 0) {
      for (const order of orders) {
        // Deletar logs da API Pagar.me relacionados ao pedido
        await supabaseAdmin.from('pagarme_api_logs').delete().eq('order_id', order.id);
        // Deletar itens do pedido
        await supabaseAdmin.from('order_items').delete().eq('order_id', order.id);
        // Deletar histórico de status
        await supabaseAdmin.from('order_status_history').delete().eq('order_id', order.id);
      }
      // Agora deletar os pedidos
      await supabaseAdmin.from('orders').delete().eq('user_id', userId);
    }
    
    // Deletar logs da API Pagar.me relacionados ao usuário
    await supabaseAdmin.from('pagarme_api_logs').delete().eq('user_id', userId);
    
    // Deletar verificação de conta
    await supabaseAdmin.from('account_verifications').delete().eq('user_id', userId);
    
    // Deletar perfil
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    
    // Deletar roles
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
    
    console.log('🗑️ Deletando usuário do auth...');
    
    // Agora deletar o usuário do auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('❌ Erro ao deletar usuário:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Erro ao deletar usuário: ' + deleteError.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Usuário deletado com sucesso');
    return new Response(
      JSON.stringify({ success: true, message: 'Usuário deletado com sucesso' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    const error = err as Error;
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
