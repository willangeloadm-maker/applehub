import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { ArrowLeft, Truck, CreditCard, QrCode, BadgePercent } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

const Checkout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cartItems, getTotal, clearCart, loading: cartLoading } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cepFrete, setCepFrete] = useState("");
  const [frete, setFrete] = useState(0);
  const [tipoFrete, setTipoFrete] = useState<"normal" | "rapido">("normal");
  const [paymentType, setPaymentType] = useState<"pix" | "cartao" | "parcelamento_applehub">("pix");
  const [parcelas, setParcelas] = useState(1);
  const [loadingCep, setLoadingCep] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    // Só redireciona se o carrinho realmente estiver vazio E não estiver carregando
    if (cartItems.length === 0 && !cartLoading) {
      const timer = setTimeout(() => {
        toast({
          title: "Carrinho vazio",
          description: "Adicione produtos ao carrinho antes de fazer o checkout",
          variant: "destructive",
        });
        navigate("/products");
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [cartItems, cartLoading]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Faça login",
          description: "Você precisa estar logado para fazer o checkout",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setCepFrete(data.cep);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar perfil",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSimularFrete = async () => {
    if (cepFrete.replace(/\D/g, "").length !== 8) {
      toast({
        title: "CEP inválido",
        description: "Digite um CEP válido",
        variant: "destructive",
      });
      return;
    }

    setLoadingCep(true);
    // Simulação de frete
    setTimeout(() => {
      const freteNormal = 15 + Math.random() * 10;
      const freteRapido = freteNormal * 1.8;
      setFrete(tipoFrete === "normal" ? freteNormal : freteRapido);
      setLoadingCep(false);
      toast({
        title: "Frete calculado",
        description: `Valor do frete: R$ ${(tipoFrete === "normal" ? freteNormal : freteRapido).toFixed(2)}`,
      });
    }, 1500);
  };

  const handleFinalizarPedido = async () => {
    if (!profile) {
      toast({
        title: "Erro",
        description: "Perfil não encontrado",
        variant: "destructive",
      });
      return;
    }

    if (frete === 0) {
      toast({
        title: "Calcule o frete",
        description: "Por favor, calcule o frete antes de finalizar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const subtotal = getTotal();
      const total = subtotal + frete;
      const numeroPedido = `APH${Date.now()}`;

      const endereco = {
        cep: profile.cep,
        rua: profile.rua,
        numero: profile.numero,
        complemento: profile.complemento,
        bairro: profile.bairro,
        cidade: profile.cidade,
        estado: profile.estado,
      };

      // Criar pedido
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          numero_pedido: numeroPedido,
          subtotal,
          frete,
          total,
          payment_type: paymentType,
          parcelas: paymentType === "parcelamento_applehub" ? parcelas : null,
          valor_parcela: paymentType === "parcelamento_applehub" ? total / parcelas : null,
          endereco_entrega: endereco,
          status: paymentType === "parcelamento_applehub" ? "em_analise" : "pagamento_confirmado",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Criar itens do pedido
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        nome_produto: item.products.nome,
        quantidade: item.quantidade,
        preco_unitario: Number(item.products.preco_vista),
        subtotal: Number(item.products.preco_vista) * item.quantidade,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Criar histórico de status
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_id: order.id,
          status: paymentType === "parcelamento_applehub" ? "em_analise" : "pagamento_confirmado",
          observacao: paymentType === "parcelamento_applehub" 
            ? "Pedido em análise de crédito"
            : "Pagamento confirmado",
        });

      if (historyError) throw historyError;

      // Limpar carrinho
      await clearCart();

      toast({
        title: "Pedido realizado!",
        description: `Número do pedido: ${numeroPedido}`,
      });

      navigate("/pedidos");
    } catch (error: any) {
      toast({
        title: "Erro ao finalizar pedido",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="sticky top-14 z-30 bg-card/95 backdrop-blur border-b border-border/40 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
          <h1 className="text-2xl font-bold">Finalizar Compra</h1>

          {/* Endereço de Entrega */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Endereço de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile && (
                <div className="bg-secondary/50 rounded-lg p-4 text-sm">
                  <p className="font-semibold">{profile.nome_completo}</p>
                  <p>{profile.rua}, {profile.numero}</p>
                  {profile.complemento && <p>{profile.complemento}</p>}
                  <p>{profile.bairro} - {profile.cidade}/{profile.estado}</p>
                  <p>CEP: {profile.cep}</p>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <Label>Calcular Frete</Label>
                <div className="flex gap-2">
                  <Input
                    value={cepFrete}
                    onChange={(e) => setCepFrete(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  <Button onClick={handleSimularFrete} disabled={loadingCep}>
                    {loadingCep ? "Calculando..." : "Calcular"}
                  </Button>
                </div>

                <RadioGroup value={tipoFrete} onValueChange={(v) => setTipoFrete(v as "normal" | "rapido")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal" id="normal" />
                    <Label htmlFor="normal">Frete Normal (5-7 dias úteis)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rapido" id="rapido" />
                    <Label htmlFor="rapido">Frete Rápido (2-3 dias úteis)</Label>
                  </div>
                </RadioGroup>

                {frete > 0 && (
                  <p className="text-sm font-semibold text-primary">
                    Valor do frete: {formatPrice(frete)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Forma de Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Forma de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentType} onValueChange={(v) => setPaymentType(v as any)}>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-secondary/50">
                    <RadioGroupItem value="pix" id="pix" className="mt-1" />
                    <Label htmlFor="pix" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <QrCode className="w-5 h-5" />
                        PIX
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Pagamento instantâneo</p>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-secondary/50">
                    <RadioGroupItem value="cartao" id="cartao" className="mt-1" />
                    <Label htmlFor="cartao" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <CreditCard className="w-5 h-5" />
                        Cartão de Crédito
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Em até 12x sem juros</p>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-secondary/50">
                    <RadioGroupItem value="parcelamento_applehub" id="applehub" className="mt-1" />
                    <Label htmlFor="applehub" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <BadgePercent className="w-5 h-5" />
                        Parcelamento AppleHub
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Até 24x com análise de crédito
                      </p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>

              {paymentType === "parcelamento_applehub" && (
                <div className="mt-4 space-y-2">
                  <Label>Número de Parcelas</Label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={parcelas}
                    onChange={(e) => setParcelas(Number(e.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}x de {formatPrice((getTotal() + frete) / n)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-yellow-600">
                    * Sujeito a análise de crédito
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumo do Pedido */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.quantidade}x {item.products.nome}
                  </span>
                  <span className="font-semibold">
                    {formatPrice(Number(item.products.preco_vista) * item.quantidade)}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-semibold">{formatPrice(getTotal())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Frete</span>
                <span className="font-semibold">{frete > 0 ? formatPrice(frete) : "A calcular"}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{formatPrice(getTotal() + frete)}</span>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleFinalizarPedido}
                disabled={loading || frete === 0}
              >
                {loading ? "Processando..." : "Finalizar Pedido"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Checkout;
