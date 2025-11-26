import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order");
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error || !data) {
        navigate("/");
        return;
      }

      setOrderData(data);
      setLoading(false);
    };

    loadOrder();
  }, [orderId, navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Card className="border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <CheckCircle2 className="w-16 h-16 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl">Pedido Confirmado!</CardTitle>
            <CardDescription className="text-lg">
              Seu pedido foi recebido com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Número do Pedido:</span>
                <span className="font-mono font-bold text-lg">{orderData?.numero_pedido}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Código de Rastreio:</span>
                <span className="font-mono font-bold text-lg text-primary">{orderData?.codigo_rastreio}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valor Total:</span>
                <span className="font-bold text-lg">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderData?.total || 0)}
                </span>
              </div>
            </div>

            <div className="bg-accent/50 rounded-lg p-6 space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Preparando seu pedido</h3>
                  <p className="text-sm text-muted-foreground">
                    Dentro de algumas horas seu pedido sairá para envio. Estamos separando os produtos com todo cuidado.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Acompanhe seu pedido</h3>
                  <p className="text-sm text-muted-foreground">
                    Você pode acompanhar o status do seu pedido em tempo real na seção "Meus Pedidos".
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate("/")}
              >
                Voltar para Home
              </Button>
              <Button 
                className="flex-1"
                onClick={() => navigate("/pedidos")}
              >
                Ver Meus Pedidos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
