import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck, MapPin } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { formatDateTimeBrasilia } from "@/lib/dateUtils";

type Order = Tables<"orders"> & {
  order_items: (Tables<"order_items"> & {
    products: Tables<"products">;
  })[];
};

type OrderHistory = Tables<"order_status_history">;

const Orders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Faça login",
          description: "Você precisa estar logado para ver seus pedidos",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            *,
            products (*)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data as Order[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar pedidos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrderHistory = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setOrderHistory(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar histórico",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectOrder = async (order: Order) => {
    setSelectedOrder(order);
    loadOrderHistory(order.id);
    
    // Carregar transação pendente se existir
    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("order_id", order.id)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    setPendingTransaction(transaction);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      em_analise: { label: "Em Análise", variant: "secondary" },
      aprovado: { label: "Aprovado", variant: "default" },
      reprovado: { label: "Reprovado", variant: "destructive" },
      pagamento_confirmado: { label: "Pago", variant: "default" },
      em_separacao: { label: "Separando", variant: "default" },
      em_transporte: { label: "Em Transporte", variant: "default" },
      entregue: { label: "Entregue", variant: "outline" },
      cancelado: { label: "Cancelado", variant: "destructive" },
    };
    
    const status_info = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={status_info.variant}>{status_info.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "em_analise":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "aprovado":
      case "pagamento_confirmado":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "em_separacao":
        return <Package className="w-5 h-5 text-blue-600" />;
      case "em_transporte":
        return <Truck className="w-5 h-5 text-blue-600" />;
      case "entregue":
        return <MapPin className="w-5 h-5 text-green-600" />;
      case "reprovado":
      case "cancelado":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  if (selectedOrder) {
    const endereco = selectedOrder.endereco_entrega as any;
    
    return (
      <AppLayout>
        <div className="min-h-screen bg-background">
          <div className="sticky top-14 z-30 bg-card/95 backdrop-blur border-b border-border/40 px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>

          <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Pedido #{selectedOrder.numero_pedido}</h1>
              <p className="text-sm text-muted-foreground">
                Realizado em {formatDateTimeBrasilia(selectedOrder.created_at!)}
              </p>
            </div>

            {/* Status Atual */}
            <Card>
              <CardHeader>
                <CardTitle>Status do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {getStatusIcon(selectedOrder.status)}
                  <div>
                    {getStatusBadge(selectedOrder.status)}
                    <p className="text-sm text-muted-foreground mt-1">
                      Atualizado em {formatDateTimeBrasilia(selectedOrder.updated_at!)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderHistory.map((item, idx) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="rounded-full p-2 bg-primary/10">
                          {getStatusIcon(item.status)}
                        </div>
                        {idx < orderHistory.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTimeBrasilia(item.created_at!)}
                        </p>
                        {item.observacao && (
                          <p className="text-sm mt-1">{item.observacao}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Itens do Pedido */}
            <Card>
              <CardHeader>
                <CardTitle>Itens do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedOrder.order_items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <img
                      src={item.products.imagens[0] || "/placeholder.svg"}
                      alt={item.nome_produto}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.nome_produto}</h3>
                      <p className="text-sm text-muted-foreground">
                        Quantidade: {item.quantidade}
                      </p>
                      <p className="text-sm font-semibold text-primary mt-1">
                        {formatPrice(Number(item.subtotal))}
                      </p>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatPrice(Number(selectedOrder.subtotal))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Frete</span>
                    <span>{formatPrice(Number(selectedOrder.frete))}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(Number(selectedOrder.total))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Endereço de Entrega */}
            <Card>
              <CardHeader>
                <CardTitle>Endereço de Entrega</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p>{endereco.rua}, {endereco.numero}</p>
                  {endereco.complemento && <p>{endereco.complemento}</p>}
                  <p>{endereco.bairro}</p>
                  <p>{endereco.cidade} - {endereco.estado}</p>
                  <p>CEP: {endereco.cep}</p>
                </div>
              </CardContent>
            </Card>

            {/* Pagamento */}
            <Card>
              <CardHeader>
                <CardTitle>Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p className="font-semibold">
                    {selectedOrder.payment_type === "pix" && "PIX"}
                    {selectedOrder.payment_type === "cartao" && "Cartão de Crédito"}
                    {selectedOrder.payment_type === "parcelamento_applehub" && "Parcelamento AppleHub"}
                  </p>
                  {selectedOrder.parcelas && (
                    <p className="text-muted-foreground mt-1">
                      {selectedOrder.parcelas}x de {formatPrice(Number(selectedOrder.valor_parcela))}
                    </p>
                  )}
                </div>

                {/* Mostrar botão de pagamento se houver transação pendente */}
                {pendingTransaction && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                        Pagamento Pendente
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Valor: {formatPrice(Number(pendingTransaction.valor))}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {pendingTransaction.tipo === "entrada" 
                          ? "Entrada do parcelamento" 
                          : "Pagamento à vista"}
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate(`/pagamento-pix?orderId=${selectedOrder.id}`)}
                      className="w-full"
                    >
                      Pagar Agora
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 lg:p-6">
          <h1 className="text-2xl font-bold mb-6">Meus Pedidos</h1>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando pedidos...</p>
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Você ainda não fez nenhum pedido</p>
                <Button onClick={() => navigate("/produtos")}>
                  Ver Produtos
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card
                  key={order.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSelectOrder(order)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold">Pedido #{order.numero_pedido}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTimeBrasilia(order.created_at!)}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="flex gap-2 mb-3 overflow-x-auto">
                      {order.order_items.slice(0, 3).map((item) => (
                        <img
                          key={item.id}
                          src={item.products.imagens[0] || "/placeholder.svg"}
                          alt={item.nome_produto}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ))}
                      {order.order_items.length > 3 && (
                        <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center text-sm font-semibold">
                          +{order.order_items.length - 3}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        {order.order_items.length} {order.order_items.length === 1 ? "item" : "itens"}
                      </p>
                      <p className="font-bold text-primary">{formatPrice(Number(order.total))}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Orders;
