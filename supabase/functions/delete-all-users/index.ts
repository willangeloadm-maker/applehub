import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteAllUsersRequest {
  adminPassword: string;
  confirmationText: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminPassword, confirmationText }: DeleteAllUsersRequest = await req.json();

    console.log('🗑️ Solicitação de exclusão de TODOS os usuários');

    // Verificar texto de confirmação
    if (confirmationText !== 'DELETAR TODOS') {
      console.log('❌ Texto de confirmação incorreto');
      return new Response(
        JSON.stringify({ error: 'Texto de confirmação incorreto' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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

    // Criar cliente com service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Buscando todos os usuários clientes...');
    
    // Buscar apenas usuários com role 'cliente' (não deletar admins)
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'cliente');

    if (!userRoles || userRoles.length === 0) {
      console.log('⚠️ Nenhum usuário cliente encontrado');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum usuário para deletar', deletedCount: 0 }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🗑️ Deletando ${userRoles.length} usuários...`);
    let deletedCount = 0;
    const errors: string[] = [];

    // Deletar cada usuário
    for (const userRole of userRoles) {
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userRole.user_id);
        
        if (deleteError) {
          console.error(`❌ Erro ao deletar usuário ${userRole.user_id}:`, deleteError);
          errors.push(`Erro ao deletar ${userRole.user_id}: ${deleteError.message}`);
        } else {
          deletedCount++;
          console.log(`✅ Usuário ${userRole.user_id} deletado`);
        }
      } catch (err) {
        const error = err as Error;
        console.error(`❌ Exceção ao deletar usuário ${userRole.user_id}:`, error);
        errors.push(`Exceção ao deletar ${userRole.user_id}: ${error.message}`);
      }
    }

    console.log(`✅ Processo concluído. Deletados: ${deletedCount}/${userRoles.length}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${deletedCount} usuário(s) deletado(s) com sucesso`,
        deletedCount,
        totalUsers: userRoles.length,
        errors: errors.length > 0 ? errors : undefined
      }),
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
