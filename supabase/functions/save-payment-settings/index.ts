import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipient_id, secret_key, admin_password } = await req.json();

    // Validate admin password
    if (admin_password !== 'Ar102030') {
      return new Response(
        JSON.stringify({ error: 'Senha administrativa inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!recipient_id || !secret_key) {
      return new Response(
        JSON.stringify({ error: 'recipient_id e secret_key são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar credenciais com a API Pagar.me
    console.log('Validando credenciais Pagar.me...');
    try {
      const pagarmeResponse = await fetch(`https://api.pagar.me/core/v5/recipients/${recipient_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secret_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (!pagarmeResponse.ok) {
        const errorData = await pagarmeResponse.text();
        console.error('Erro ao validar credenciais Pagar.me:', pagarmeResponse.status, errorData);
        
        if (pagarmeResponse.status === 401 || pagarmeResponse.status === 403) {
          return new Response(
            JSON.stringify({ error: 'Secret Key inválida. Verifique suas credenciais no dashboard da Pagar.me.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (pagarmeResponse.status === 404) {
          return new Response(
            JSON.stringify({ error: 'Recipient ID não encontrado. Verifique se o ID está correto.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ error: `Erro ao validar credenciais Pagar.me: ${pagarmeResponse.status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const recipientData = await pagarmeResponse.json();
      console.log('Credenciais validadas com sucesso. Recipient:', recipientData.name || recipientData.id);
    } catch (validationError) {
      console.error('Erro na validação da API Pagar.me:', validationError);
      return new Response(
        JSON.stringify({ error: 'Não foi possível conectar à API Pagar.me. Verifique suas credenciais e tente novamente.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if settings already exist
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('payment_settings')
      .select('id')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching payment settings:', fetchError);
      throw fetchError;
    }

    let result;
    if (existing) {
      // Update existing settings
      const { data, error } = await supabaseAdmin
        .from('payment_settings')
        .update({ recipient_id, secret_key })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new settings
      const { data, error } = await supabaseAdmin
        .from('payment_settings')
        .insert([{ recipient_id, secret_key }])
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error saving payment settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
