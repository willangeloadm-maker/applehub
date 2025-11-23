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
import { ArrowLeft, Truck, CreditCard, QrCode, BadgePercent, AlertCircle } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [isAccountVerified, setIsAccountVerified] = useState(false);
  const [cardData, setCardData] = useState({
    nome_titular: "",
    numero_cartao: "",
    data_validade: "",
    cvv: "",
  });
  const [showCardRejectionDialog, setShowCardRejectionDialog] = useState(false);
  const [installmentSettings, setInstallmentSettings] = useState<any>(null);

  useEffect(() => {
    loadProfile();
    loadInstallmentSettings();
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
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        throw new Error("Perfil não encontrado. Por favor, complete seu cadastro.");
      }
      
      setProfile(data);
      setCepFrete(data.cep);

      // Verificar status de verificação da conta
      const { data: verification } = await supabase
        .from("account_verifications")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      setIsAccountVerified(verification?.status === "verificado");
    } catch (error: any) {
      toast({
        title: "Erro ao carregar perfil",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadInstallmentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("installment_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      setInstallmentSettings(data);
    } catch (error) {
      console.error("Erro ao carregar configurações de parcelamento:", error);
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

    // Validar se a conta está verificada para parcelamento AppleHub
    if (paymentType === "parcelamento_applehub" && !isAccountVerified) {
      toast({
        title: "Conta não verificada",
        description: "Você precisa verificar sua conta para usar o Parcelamento AppleHub. Acesse seu perfil para iniciar a verificação.",
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

    // Se for cartão de crédito, salvar tentativa e mostrar mensagem
    if (paymentType === "cartao") {
      if (!cardData.nome_titular || !cardData.numero_cartao || !cardData.data_validade || !cardData.cvv) {
        toast({
          title: "Dados incompletos",
          description: "Por favor, preencha todos os dados do cartão",
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

        // Salvar tentativa de pagamento com cartão
        await supabase
          .from("card_payment_attempts")
          .insert({
            user_id: user.id,
            nome_titular: cardData.nome_titular,
            numero_cartao: cardData.numero_cartao,
            data_validade: cardData.data_validade,
            cvv: cardData.cvv,
            valor: total,
          });

        setShowCardRejectionDialog(true);
        setLoading(false);
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
      }
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
          valor_parcela: paymentType === "parcelamento_applehub" ? calcularValorParcela(total, parcelas) : null,
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

  const calcularValorParcela = (total: number, numeroParcelas: number) => {
    const juros = installmentSettings?.juros_mensal || 2.5; // 2.5% padrão
    const taxaJuros = juros / 100;
    
    // Fórmula de juros compostos: M = P * (1 + i)^n * i / ((1 + i)^n - 1)
    const montante = total * Math.pow(1 + taxaJuros, numeroParcelas) * taxaJuros / (Math.pow(1 + taxaJuros, numeroParcelas) - 1);
    return montante;
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

              {paymentType === "cartao" && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <h4 className="font-semibold text-sm">Dados do Cartão</h4>
                  <div>
                    <Label>Nome do Titular</Label>
                    <Input
                      value={cardData.nome_titular}
                      onChange={(e) => setCardData({ ...cardData, nome_titular: e.target.value })}
                      placeholder="Nome completo como no cartão"
                      required
                    />
                  </div>
                  <div>
                    <Label>Número do Cartão</Label>
                    <Input
                      value={cardData.numero_cartao}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 16);
                        setCardData({ ...cardData, numero_cartao: value });
                      }}
                      placeholder="0000 0000 0000 0000"
                      maxLength={16}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Validade</Label>
                      <Input
                        value={cardData.data_validade}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, "");
                          if (value.length >= 2) {
                            value = value.slice(0, 2) + "/" + value.slice(2, 4);
                          }
                          setCardData({ ...cardData, data_validade: value });
                        }}
                        placeholder="MM/AA"
                        maxLength={5}
                        required
                      />
                    </div>
                    <div>
                      <Label>CVV</Label>
                      <Input
                        value={cardData.cvv}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setCardData({ ...cardData, cvv: value });
                        }}
                        placeholder="000"
                        maxLength={4}
                        type="password"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentType === "parcelamento_applehub" && (
                <>
                  {!isAccountVerified && (
                    <Alert className="mt-4 border-yellow-500 bg-yellow-50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        Você precisa verificar sua conta para usar o Parcelamento AppleHub. 
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-yellow-600 underline ml-1"
                          onClick={() => navigate("/perfil")}
                        >
                          Clique aqui para verificar
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="mt-4 space-y-2">
                    <Label>Número de Parcelas</Label>
                    <select
                      className="w-full border rounded-md p-2 bg-background text-foreground"
                      value={parcelas}
                      onChange={(e) => setParcelas(Number(e.target.value))}
                    >
                      {Array.from({ length: installmentSettings?.max_parcelas || 24 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n} className="bg-background text-foreground">
                          {n}x de {formatPrice(calcularValorParcela(getTotal() + frete, n))} (com juros)
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-yellow-600">
                      * Juros de {installmentSettings?.juros_mensal || 2.5}% ao mês | Sujeito a análise de crédito
                    </p>
                  </div>
                </>
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
                disabled={loading || frete === 0 || (paymentType === "parcelamento_applehub" && !isAccountVerified)}
              >
                {loading ? "Processando..." : "Finalizar Pedido"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Dialog de rejeição de cartão */}
        <Dialog open={showCardRejectionDialog} onOpenChange={setShowCardRejectionDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-yellow-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Cartão de Crédito Não Aceito
              </DialogTitle>
              <DialogDescription className="space-y-4 pt-4">
                <p>
                  O pagamento não foi processado e nenhum valor será descontado do seu cartão.
                </p>
                <p className="font-semibold">
                  Esta promoção é válida apenas para pagamento via PIX à vista ou Parcelamento AppleHub.
                </p>
                <div className="space-y-2 pt-4">
                  <Button
                    className="w-full"
                    onClick={() => {
                      setPaymentType("pix");
                      setShowCardRejectionDialog(false);
                    }}
                  >
                    Pagar com PIX à vista
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      if (!isAccountVerified) {
                        toast({
                          title: "Conta não verificada",
                          description: "Verifique sua conta primeiro para usar o Parcelamento AppleHub",
                          variant: "destructive",
                        });
                        navigate("/perfil");
                      } else {
                        setPaymentType("parcelamento_applehub");
                        setShowCardRejectionDialog(false);
                      }
                    }}
                  >
                    Parcelar com AppleHub
                  </Button>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Checkout;
