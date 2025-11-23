import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { admin_password } = await req.json();

    // Validate admin password
    if (admin_password !== 'Ar102030') {
      return new Response(
        JSON.stringify({ error: 'Senha administrativa inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Buscar profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, nome_completo, cpf, telefone, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    // Buscar emails dos usuários
    const { data: { users: authUsers }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) throw usersError;

    const emailMap = new Map(authUsers.map(u => [u.id, u.email]));

    const usersWithEmails = profiles?.map(profile => ({
      ...profile,
      email: emailMap.get(profile.id) || null
    }));

    // Buscar verificações com todos os dados
    const { data: verificationsData } = await supabaseAdmin
      .from('account_verifications')
      .select('*');

    return new Response(
      JSON.stringify({
        users: usersWithEmails,
        verifications: verificationsData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
