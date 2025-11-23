import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, userId, documentType } = await req.json();
    
    console.log('Validando PDF:', { userId, documentType });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Erro ao buscar perfil:', profileError);
      return new Response(
        JSON.stringify({ error: 'Perfil não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Perfil encontrado:', profile.nome_completo);

    // Usar Lovable AI para extrair dados do PDF
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const prompt = `Você é um especialista em análise de documentos brasileiros. Analise este PDF de CNH (Carteira Nacional de Habilitação) e extraia as seguintes informações em formato JSON:

{
  "nome_completo": "nome completo do titular",
  "cpf": "CPF sem formatação (apenas números)",
  "data_nascimento": "data no formato YYYY-MM-DD",
  "nome_mae": "nome da mãe (se disponível)",
  "tipo_documento": "CNH"
}

IMPORTANTE:
- Retorne APENAS o JSON, sem texto adicional
- Se algum campo não estiver disponível, use null
- CPF deve conter apenas números
- Data deve estar no formato YYYY-MM-DD`;

    // Usar o modelo Gemini Pro que suporta PDF
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: prompt 
              },
              {
                type: 'image_url',
                image_url: {
                  url: pdfBase64.startsWith('data:') ? pdfBase64 : `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API Lovable AI:', aiResponse.status, errorText);
      throw new Error(`Erro ao processar PDF: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('Resposta da AI:', aiData);

    const aiContent = aiData.choices?.[0]?.message?.content;
    if (!aiContent) {
      throw new Error('Resposta da AI vazia');
    }

    // Extrair JSON da resposta (remover markdown se houver)
    let extractedData;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : aiContent;
      extractedData = JSON.parse(jsonText);
      console.log('Dados extraídos:', extractedData);
    } catch (e) {
      console.error('Erro ao parsear JSON da AI:', e, aiContent);
      throw new Error('Não foi possível extrair dados do documento');
    }

    // Validar se é realmente CNH
    if (extractedData.tipo_documento !== 'CNH' && extractedData.tipo_documento !== 'cnh') {
      console.log('Documento não é CNH:', extractedData.tipo_documento);
      return new Response(
        JSON.stringify({
          isValid: false,
          reason: 'O documento enviado não é uma CNH válida'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalizar CPF (remover formatação)
    const normalizeCPF = (cpf: string) => cpf.replace(/\D/g, '');
    const profileCPF = normalizeCPF(profile.cpf);
    const extractedCPF = normalizeCPF(extractedData.cpf || '');

    // Comparar dados
    const errors: string[] = [];

    if (extractedCPF && extractedCPF !== profileCPF) {
      errors.push(`CPF não corresponde (documento: ${extractedCPF}, cadastro: ${profileCPF})`);
    }

    if (extractedData.nome_completo) {
      // Função para normalizar nome removendo acentos e padronizando
      const normalizeNome = (n: string) => {
        return n
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ' ')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
      };
      
      const profileNome = normalizeNome(profile.nome_completo);
      const extractedNome = normalizeNome(extractedData.nome_completo);
      
      console.log('Comparando nomes:', { profileNome, extractedNome });
      
      // Verificar se os nomes têm similaridade (primeiro nome ou nome completo)
      const profileParts = profileNome.split(' ');
      const extractedParts = extractedNome.split(' ');
      
      // Comparar primeiro nome
      const firstNameMatch = profileParts[0] === extractedParts[0];
      // Comparar último nome
      const lastNameMatch = profileParts[profileParts.length - 1] === extractedParts[extractedParts.length - 1];
      
      if (!firstNameMatch && !lastNameMatch) {
        errors.push('Nome não corresponde');
      }
    }

    if (extractedData.data_nascimento && extractedData.data_nascimento !== profile.data_nascimento) {
      errors.push('Data de nascimento não corresponde');
    }

    console.log('Validação concluída:', { errors });

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({
          isValid: false,
          reason: `Dados do documento não correspondem aos dados cadastrados: ${errors.join(', ')}`,
          extractedData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        isValid: true,
        extractedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na validação do PDF:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        isValid: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
