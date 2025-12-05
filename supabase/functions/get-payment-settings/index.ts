import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, origin',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { admin_password } = await req.json();
    
    if (admin_password !== 'Ar102030') {
      return new Response(
        JSON.stringify({ error: 'Senha administrativa inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    console.log('Buscando configurações para domínio:', domain);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar configurações específicas do domínio ou configuração padrão
    let query = supabaseAdmin.from('payment_settings').select('*');
    
    if (domain) {
      // Tentar buscar pelo domínio específico primeiro
      const { data: domainData, error: domainError } = await query.eq('domain', domain).single();
      
      if (!domainError && domainData) {
        console.log('Configuração encontrada para domínio:', domain);
        return new Response(
          JSON.stringify({ data: domainData, domain }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Se não encontrou pelo domínio, buscar qualquer configuração (fallback)
    const { data, error } = await supabaseAdmin
      .from('payment_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return new Response(
      JSON.stringify({ data: data || null, domain }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao buscar configurações de pagamento:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
