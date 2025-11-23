import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckCircle, Clock, QrCode as QrCodeIcon } from "lucide-react";
import QRCode from "react-qr-code";
import { formatInTimeZone } from 'date-fns-tz';

const PixPayment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [loading, setLoading] = useState(true);
  const [pixData, setPixData] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  useEffect(() => {
    if (!orderId) {
      navigate("/pedidos");
      return;
    }
    loadPixData();
  }, [orderId]);

  // Realtime para atualização de pagamento
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          console.log('Transaction updated:', payload);
          const newStatus = payload.new.status;
          
          if (newStatus === 'pago' || newStatus === 'paid') {
            setPaymentConfirmed(true);
            toast({
              title: "Pagamento Confirmado! 🎉",
              description: "Seu pagamento foi confirmado com sucesso. Seu pedido está sendo processado.",
              duration: 10000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          console.log('Order updated:', payload);
          const newStatus = payload.new.status;
          setOrder((prev: any) => ({ ...prev, status: newStatus }));
          
          if (newStatus === 'pagamento_confirmado') {
            setPaymentConfirmed(true);
            toast({
              title: "Pedido Confirmado! 🎉",
              description: "Seu pedido foi confirmado e está sendo preparado para envio.",
              duration: 10000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, toast]);

  useEffect(() => {
    if (!pixData?.expires_at) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const expiresAt = new Date(pixData.expires_at).getTime();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeRemaining("Expirado");
        clearInterval(timer);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [pixData]);

  const loadPixData = async () => {
    try {
      setLoading(true);

      // Buscar dados do pedido
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            *,
            products (*)
          )
        `)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Buscar transação PIX
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("order_id", orderId)
        .eq("metodo_pagamento", "pix")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (txError) throw txError;

      if (transaction) {
        setPixData({
          qr_code: transaction.pix_copia_cola,
          qr_code_url: transaction.pix_qr_code,
          amount: transaction.valor,
          expires_at: transaction.data_vencimento,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados do pagamento",
        description: error.message,
        variant: "destructive",
      });
      navigate("/pedidos");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      toast({
        title: "Copiado!",
        description: "Código PIX copiado para a área de transferência",
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Carregando dados do pagamento...</p>
        </div>
      </AppLayout>
    );
  }

  if (!pixData || !order) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Dados do pagamento não encontrados</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-6">
          {/* Header com status */}
          <Card className={paymentConfirmed ? "border-green-500" : "border-primary/20"}>
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                  paymentConfirmed ? 'bg-green-500/10' : 'bg-primary/10'
                }`}>
                  {paymentConfirmed ? (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  ) : (
                    <Clock className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">
                    {paymentConfirmed ? 'Pagamento Confirmado!' : 'Aguardando Pagamento'}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Pedido #{order.numero_pedido}
                  </p>
                  {order.updated_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Atualizado em: {formatInTimeZone(new Date(order.updated_at), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss')}
                    </p>
                  )}
                </div>
                {!paymentConfirmed && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono font-semibold">{timeRemaining}</span>
                  </div>
                )}
                {paymentConfirmed && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-700 dark:text-green-300">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-semibold">Pagamento Recebido</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-center">
                <QrCodeIcon className="w-5 h-5" />
                Escaneie o QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white p-6 rounded-xl mx-auto w-fit">
                {pixData.qr_code && (
                  <QRCode
                    value={pixData.qr_code}
                    size={256}
                    level="M"
                  />
                )}
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Abra o app do seu banco e escaneie o QR Code acima
                </p>
                <div className="text-3xl font-bold text-primary">
                  {formatPrice(pixData.amount)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Código Copia e Cola */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                Ou pague com PIX Copia e Cola
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-secondary/50 p-4 rounded-lg break-all text-sm font-mono">
                {pixData.qr_code}
              </div>
              <Button 
                onClick={handleCopyPix} 
                className="w-full"
                size="lg"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Código PIX
              </Button>
            </CardContent>
          </Card>

          {/* Informações do Pedido */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {order.order_items.map((item: any) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.products.imagens[0] || "/placeholder.svg"}
                      alt={item.nome_produto}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.nome_produto}</p>
                      <p className="text-xs text-muted-foreground">
                        Qtd: {item.quantidade}
                      </p>
                    </div>
                    <p className="font-semibold text-sm">
                      {formatPrice(Number(item.subtotal))}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete</span>
                  <span>{formatPrice(Number(order.frete))}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(Number(order.total))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instruções */}
          <Card className={paymentConfirmed ? "border-green-500/20 bg-green-500/5" : "border-accent/20 bg-accent/5"}>
            <CardContent className="pt-6">
              {paymentConfirmed ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <p>
                      <strong>Pagamento Confirmado:</strong> Recebemos seu pagamento com sucesso!
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <p>
                      <strong>Próximos Passos:</strong> Seu pedido está sendo processado e você receberá atualizações por e-mail
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <p>
                      <strong>Acompanhamento:</strong> Acesse "Meus Pedidos" para ver o status da entrega em tempo real
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p>
                      <strong>Pagamento instantâneo:</strong> Assim que você pagar, receberemos a confirmação automaticamente
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p>
                      <strong>Notificação:</strong> Você receberá um e-mail confirmando o pagamento
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p>
                      <strong>Acompanhamento:</strong> Você pode acompanhar o status do seu pedido na área "Meus Pedidos"
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botões de ação */}
          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/pedidos")} 
              className="w-full"
              size="lg"
              variant="outline"
            >
              Ver Meus Pedidos
            </Button>
            <Button 
              onClick={() => navigate("/")} 
              className="w-full"
              size="lg"
              variant="ghost"
            >
              Voltar para Home
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PixPayment;
