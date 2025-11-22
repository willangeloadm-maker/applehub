import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  nome: string;
  status: "verificado" | "rejeitado";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, nome, status }: EmailRequest = await req.json();

    const subject = status === "verificado" 
      ? "Conta Verificada - AppleHub" 
      : "Verificação Rejeitada - AppleHub";

    const html = status === "verificado"
      ? `
        <h1>Parabéns, ${nome}!</h1>
        <p>Sua conta foi verificada com sucesso na AppleHub.</p>
        <p>Agora você pode aproveitar todos os benefícios do parcelamento AppleHub em até 24x.</p>
        <p>Acesse sua conta e comece a comprar!</p>
        <br/>
        <p>Equipe AppleHub</p>
      `
      : `
        <h1>Olá, ${nome}</h1>
        <p>Infelizmente sua verificação de conta não foi aprovada.</p>
        <p>Por favor, entre em contato conosco através do WhatsApp para mais informações.</p>
        <br/>
        <p>Equipe AppleHub</p>
      `;

    const { error } = await resend.emails.send({
      from: "AppleHub <onboarding@resend.dev>",
      to: [email],
      subject,
      html,
    });

    if (error) {
      console.error("Erro ao enviar email:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});