import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  orderId: string;
  status: string;
  observacao?: string;
}

const statusLabels: Record<string, string> = {
  'em_analise': 'Em Análise',
  'aprovado': 'Aprovado',
  'reprovado': 'Reprovado',
  'pagamento_confirmado': 'Pagamento Confirmado',
  'em_separacao': 'Em Separação',
  'em_transporte': 'Em Transporte',
  'entregue': 'Entregue',
  'cancelado': 'Cancelado'
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, status, observacao }: NotificationRequest = await req.json();

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do pedido e usuário
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('numero_pedido, user_id, total')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Pedido não encontrado');
    }

    // Buscar email do usuário através do auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(order.user_id);
    
    if (userError || !user?.email) {
      throw new Error('Email do usuário não encontrado');
    }

    // Buscar nome do usuário no perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome_completo')
      .eq('id', order.user_id)
      .single();

    const statusLabel = statusLabels[status] || status;
    const userName = profile?.nome_completo?.split(' ')[0] || 'Cliente';

    // Enviar email
    const emailResponse = await resend.emails.send({
      from: "AppleHub <onboarding@resend.dev>",
      to: [user.email],
      subject: `Pedido ${order.numero_pedido} - ${statusLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ff6b35 0%, #ff4757 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px 20px; border-radius: 0 0 8px 8px; }
              .status-badge { display: inline-block; background: #ff6b35; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 15px 0; }
              .order-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🍎 AppleHub</h1>
                <p>Atualização do seu pedido</p>
              </div>
              <div class="content">
                <h2>Olá, ${userName}!</h2>
                <p>Seu pedido foi atualizado para:</p>
                <div class="status-badge">${statusLabel}</div>
                
                <div class="order-info">
                  <p><strong>Número do Pedido:</strong> ${order.numero_pedido}</p>
                  <p><strong>Valor Total:</strong> R$ ${order.total.toFixed(2)}</p>
                  ${observacao ? `<p><strong>Observação:</strong> ${observacao}</p>` : ''}
                </div>
                
                <p>Você pode acompanhar todos os detalhes do seu pedido na área de "Meus Pedidos" no aplicativo.</p>
                <p>Obrigado por comprar na AppleHub! 🎉</p>
              </div>
              <div class="footer">
                <p>AppleHub - Sua loja especializada em iPhones e produtos Apple</p>
                <p>Este é um email automático, por favor não responda.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email enviado:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Erro ao enviar email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
