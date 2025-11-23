import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, documentType, userData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não está configurada');
    }

    // Preparar o prompt baseado no tipo de documento
    let prompt = '';
    if (documentType === 'RG' || documentType === 'CNH') {
      prompt = `Você é um sistema de validação de documentos. Analise esta imagem de ${documentType} e extraia as seguintes informações:
      
      1. Nome completo
      2. CPF (apenas números)
      3. Data de nascimento (formato DD/MM/AAAA)
      
      Compare com os dados fornecidos pelo usuário:
      - Nome: ${userData.nome_completo}
      - CPF: ${userData.cpf}
      - Data de Nascimento: ${userData.data_nascimento}
      
      Responda em JSON com o seguinte formato:
      {
        "valido": true/false,
        "confianca": 0-100,
        "dados_extraidos": {
          "nome": "nome extraído",
          "cpf": "cpf extraído",
          "data_nascimento": "data extraída"
        },
        "problemas": ["lista de problemas encontrados, se houver"]
      }
      
      Se não conseguir ler o documento claramente, retorne valido: false e explique o problema.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API Lovable AI:', response.status, errorText);
      throw new Error(`Erro ao validar documento: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Não foi possível extrair JSON da resposta');
    }
    
    const validationResult = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(validationResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na validação OCR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      valido: false,
      confianca: 0,
      problemas: ['Erro ao processar documento']
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
