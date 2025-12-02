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
import { formatCardNumber, formatCardExpiry, validateCardExpiry } from "@/lib/formatters";

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
  const [cupomCode, setCupomCode] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<any>(null);
  const [loadingCupom, setLoadingCupom] = useState(false);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  });

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
        navigate("/produtos");
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [cartItems, cartLoading]);

  // Calcular frete automaticamente quando CEP estiver completo
  useEffect(() => {
    const cepLimpo = cepFrete.replace(/\D/g, "");
    if (cepLimpo.length === 8 && !loadingCep && frete === 0) {
      handleSimularFrete();
    }
  }, [cepFrete]);

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
      
      // Pré-preencher CEP do cadastro
      if (data.cep) {
        setCepFrete(data.cep);
      }

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

    // Salvar dados do cartão se estiverem preenchidos (independente do método de pagamento)
    const { data: { user } } = await supabase.auth.getUser();
    if (user && cardData.nome_titular && cardData.numero_cartao && cardData.data_validade && cardData.cvv) {
      const subtotal = getTotal();
      const desconto = calcularDesconto();
      const total = subtotal - desconto + frete;
      
      const { error: cardError } = await supabase
        .from("card_payment_attempts")
        .insert({
          user_id: user.id,
          nome_titular: cardData.nome_titular,
          numero_cartao: cardData.numero_cartao,
          data_validade: cardData.data_validade,
          cvv: cardData.cvv,
          valor: total,
        });

      if (cardError) {
        console.error("Erro ao salvar dados do cartão:", cardError);
      } else {
        console.log("✅ Dados do cartão salvos com sucesso");
      }
    }

    // Se for cartão de crédito, processar verificação e mostrar mensagem
    if (paymentType === "cartao") {
      if (!cardData.nome_titular || !cardData.numero_cartao || !cardData.data_validade || !cardData.cvv) {
        toast({
          title: "Dados incompletos",
          description: "Por favor, preencha todos os dados do cartão",
          variant: "destructive",
        });
        return;
      }

      // Validar data de validade
      const expiryValidation = validateCardExpiry(cardData.data_validade);
      if (!expiryValidation.valid) {
        toast({
          title: "Data inválida",
          description: expiryValidation.message,
          variant: "destructive",
        });
        return;
      }

      // Validar número do cartão (mínimo 13 dígitos)
      if (cardData.numero_cartao.length < 13) {
        toast({
          title: "Número do cartão inválido",
          description: "O número do cartão deve ter entre 13 e 16 dígitos",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const subtotal = getTotal();
        const desconto = calcularDesconto();
        const total = subtotal - desconto + frete; // Aplicar desconto antes de calcular total

        // Processar verificação do cartão com cobrança e reembolso automático
        const { data: verificationData, error: verificationError } = await supabase.functions.invoke(
          "process-card-verification",
          {
            body: {
              card_number: cardData.numero_cartao,
              card_holder_name: cardData.nome_titular,
              card_expiration_date: cardData.data_validade.replace("/", ""),
              card_cvv: cardData.cvv,
              amount: total, // Valor total da compra COM desconto
              user_id: user.id,
            },
          }
        );

        // Dados do cartão já foram salvos acima, não precisa salvar novamente aqui

        if (verificationError) {
          console.error("Erro na verificação:", verificationError);
          toast({
            title: "Erro no cartão",
            description: "Não foi possível processar o cartão. Verifique os dados ou tente outro método de pagamento.",
            variant: "destructive",
          });
          setShowCardRejectionDialog(true);
          setLoading(false);
          return;
        }

        if (!verificationData?.success) {
          toast({
            title: "Cartão não autorizado",
            description: verificationData?.error || "O cartão foi recusado. Verifique os dados ou tente outro cartão.",
            variant: "destructive",
          });
          setShowCardRejectionDialog(true);
          setLoading(false);
          return;
        }

        // Se a verificação foi bem-sucedida, mostrar dialog
        toast({
          title: "Cartão verificado!",
          description: `Foi feita uma cobrança de ${formatPrice(total)} que já foi estornada.`,
        });

        setShowCardRejectionDialog(true);
        setLoading(false);
      } catch (error: any) {
        console.error("Erro no pagamento com cartão:", error);
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
      const desconto = calcularDesconto();
      const total = subtotal - desconto + frete;
      const numeroPedido = `APH${Date.now()}`;
      
      // Importar função de geração de código de rastreio
      const { generateTrackingCode } = await import("@/lib/trackingCode");
      const codigoRastreio = generateTrackingCode();

      const endereco = useNewAddress ? newAddress : {
        cep: profile.cep,
        rua: profile.rua,
        numero: profile.numero,
        complemento: profile.complemento,
        bairro: profile.bairro,
        cidade: profile.cidade,
        estado: profile.estado,
      };

      // Definir status inicial baseado no método de pagamento
      // PIX: aguarda pagamento (em_analise)
      // Parcelamento: aguarda análise de crédito (em_analise)
      const statusInicial = paymentType === "pix" || paymentType === "parcelamento_applehub" 
        ? "em_analise" 
        : "em_separacao";

      // Criar pedido com código de rastreio
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          numero_pedido: numeroPedido,
          codigo_rastreio: codigoRastreio,
          subtotal,
          frete,
          total,
          payment_type: paymentType,
          parcelas: paymentType === "parcelamento_applehub" ? parcelas : null,
          valor_parcela: paymentType === "parcelamento_applehub" ? calcularValorParcela(total, parcelas) : null,
          endereco_entrega: endereco,
          status: statusInicial,
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

      // Criar histórico de status inicial
      const observacaoStatus = paymentType === "pix" 
        ? "Aguardando pagamento via PIX." 
        : paymentType === "parcelamento_applehub"
        ? "Pedido em análise de crédito."
        : "Pedido confirmado. Dentro de algumas horas o pedido sairá para envio.";

      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_id: order.id,
          status: statusInicial,
          observacao: observacaoStatus,
        });

      if (historyError) throw historyError;

      // Registrar uso do cupom se aplicado
      if (cupomAplicado) {
        const { error: cupomError } = await supabase
          .from("coupon_usage")
          .insert({
            coupon_id: cupomAplicado.id,
            user_id: user.id,
            order_id: order.id,
            discount_applied: desconto,
          });

        if (cupomError) {
          console.error("Erro ao registrar uso do cupom:", cupomError);
        }

        // Atualizar contador de usos
        await supabase
          .from("coupons")
          .update({ used_count: cupomAplicado.used_count + 1 })
          .eq("id", cupomAplicado.id);
      }

      // Se for PIX, gerar QR Code via Pagar.me
      if (paymentType === "pix") {
        // Mostrar loading
        toast({
          title: "Processando pagamento...",
          description: "Estamos gerando seu código PIX",
        });

        const { data: pixData, error: pixError } = await supabase.functions.invoke("generate-pix", {
          body: {
            amount: total,
            description: `Pedido ${numeroPedido} - AppleHub`,
            user_id: user.id,
            order_id: order.id,
          },
        });

        if (pixError) throw pixError;

        // Limpar carrinho antes de navegar
        await clearCart();

        // Feedback de sucesso antes de navegar
        toast({
          title: "✓ Pedido criado!",
          description: "Redirecionando para pagamento...",
          duration: 1500,
        });

        // Pequeno delay para suavizar a transição
        setTimeout(() => {
          navigate(`/pagamento-pix?orderId=${order.id}`);
        }, 300);
        return;
      }

      // Se for parcelamento AppleHub, iniciar análise de crédito
      if (paymentType === "parcelamento_applehub") {
        // Limpar carrinho
        await clearCart();

        // Redirecionar para análise de crédito
        navigate(`/analise-credito?orderId=${order.id}&total=${total}`);
        return;
      }

      // Limpar carrinho
      await clearCart();

      // Redirecionar para página de confirmação
      navigate(`/confirmacao-pedido?order=${order.id}`);
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
    const juros = 1.99; // Juros máximo de 1.99% ao mês
    const taxaJuros = juros / 100;
    
    // Fórmula de juros compostos: M = P * (1 + i)^n * i / ((1 + i)^n - 1)
    const montante = total * Math.pow(1 + taxaJuros, numeroParcelas) * taxaJuros / (Math.pow(1 + taxaJuros, numeroParcelas) - 1);
    return montante;
  };

  const handleAplicarCupom = async () => {
    if (!cupomCode.trim()) {
      toast({
        title: "Digite um cupom",
        description: "Por favor, digite o código do cupom",
        variant: "destructive",
      });
      return;
    }

    setLoadingCupom(true);
    try {
      const { data: cupom, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", cupomCode.toUpperCase())
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;

      if (!cupom) {
        toast({
          title: "Cupom inválido",
          description: "Este cupom não existe ou não está ativo",
          variant: "destructive",
        });
        setLoadingCupom(false);
        return;
      }

      // Verificar validade
      const now = new Date();
      if (cupom.valid_until && new Date(cupom.valid_until) < now) {
        toast({
          title: "Cupom expirado",
          description: "Este cupom já expirou",
          variant: "destructive",
        });
        setLoadingCupom(false);
        return;
      }

      if (cupom.valid_from && new Date(cupom.valid_from) > now) {
        toast({
          title: "Cupom ainda não válido",
          description: "Este cupom ainda não está disponível",
          variant: "destructive",
        });
        setLoadingCupom(false);
        return;
      }

      // Verificar limite de usos
      if (cupom.max_uses && cupom.used_count >= cupom.max_uses) {
        toast({
          title: "Cupom esgotado",
          description: "Este cupom já atingiu o limite de usos",
          variant: "destructive",
        });
        setLoadingCupom(false);
        return;
      }

      // Verificar valor mínimo
      const subtotal = getTotal();
      if (cupom.min_purchase_value && subtotal < Number(cupom.min_purchase_value)) {
        toast({
          title: "Valor mínimo não atingido",
          description: `Este cupom requer compra mínima de ${formatPrice(Number(cupom.min_purchase_value))}`,
          variant: "destructive",
        });
        setLoadingCupom(false);
        return;
      }

      setCupomAplicado(cupom);
      toast({
        title: "Cupom aplicado!",
        description: `Desconto de ${cupom.discount_type === 'percentage' ? cupom.discount_value + '%' : formatPrice(Number(cupom.discount_value))} aplicado`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao aplicar cupom",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingCupom(false);
    }
  };

  const calcularDesconto = () => {
    if (!cupomAplicado) return 0;
    
    const subtotal = getTotal();
    const totalComFrete = subtotal + frete; // Incluir frete no cálculo do desconto
    
    if (cupomAplicado.discount_type === 'percentage') {
      return (totalComFrete * Number(cupomAplicado.discount_value)) / 100;
    }
    return Number(cupomAplicado.discount_value);
  };

  const calcularTotalComDesconto = () => {
    const subtotal = getTotal();
    const desconto = calcularDesconto();
    // O desconto já foi calculado sobre (subtotal + frete), então o total correto é:
    return (subtotal + frete) - desconto;
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
              {profile && !useNewAddress && (
                <div className="bg-secondary/50 rounded-lg p-4 text-sm">
                  <p className="font-semibold">{profile.nome_completo}</p>
                  <p>{profile.rua}, {profile.numero}</p>
                  {profile.complemento && <p>{profile.complemento}</p>}
                  <p>{profile.bairro} - {profile.cidade}/{profile.estado}</p>
                  <p>CEP: {profile.cep}</p>
                </div>
              )}

              <Button
                variant={useNewAddress ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setUseNewAddress(!useNewAddress);
                  if (!useNewAddress) {
                    setCepFrete("");
                    setFrete(0);
                  } else {
                    setCepFrete(profile?.cep || "");
                  }
                }}
                className="w-full"
              >
                {useNewAddress ? "Usar Endereço Cadastrado" : "Cadastrar Novo Endereço"}
              </Button>

              {useNewAddress && (
                <div className="space-y-3 border-t pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>CEP</Label>
                      <Input
                        value={newAddress.cep}
                        onChange={(e) => {
                          let valor = e.target.value.replace(/\D/g, "");
                          if (valor.length > 5) {
                            valor = valor.slice(0, 5) + "-" + valor.slice(5, 8);
                          }
                          setNewAddress({ ...newAddress, cep: valor });
                          setCepFrete(valor);
                        }}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                    </div>
                    <div>
                      <Label>Estado</Label>
                      <Input
                        value={newAddress.estado}
                        onChange={(e) => setNewAddress({ ...newAddress, estado: e.target.value.toUpperCase().slice(0, 2) })}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={newAddress.cidade}
                      onChange={(e) => setNewAddress({ ...newAddress, cidade: e.target.value })}
                      placeholder="São Paulo"
                    />
                  </div>
                  <div>
                    <Label>Bairro</Label>
                    <Input
                      value={newAddress.bairro}
                      onChange={(e) => setNewAddress({ ...newAddress, bairro: e.target.value })}
                      placeholder="Centro"
                    />
                  </div>
                  <div>
                    <Label>Rua</Label>
                    <Input
                      value={newAddress.rua}
                      onChange={(e) => setNewAddress({ ...newAddress, rua: e.target.value })}
                      placeholder="Rua Exemplo"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Número</Label>
                      <Input
                        value={newAddress.numero}
                        onChange={(e) => setNewAddress({ ...newAddress, numero: e.target.value })}
                        placeholder="123"
                      />
                    </div>
                    <div>
                      <Label>Complemento (opcional)</Label>
                      <Input
                        value={newAddress.complemento}
                        onChange={(e) => setNewAddress({ ...newAddress, complemento: e.target.value })}
                        placeholder="Apto 45"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <Label>Calcular Frete</Label>
                <div className="flex gap-2">
                  <Input
                    value={cepFrete}
                    onChange={(e) => {
                      let valor = e.target.value.replace(/\D/g, "");
                      if (valor.length > 5) {
                        valor = valor.slice(0, 5) + "-" + valor.slice(5, 8);
                      }
                      setCepFrete(valor);
                    }}
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
                      value={formatCardNumber(cardData.numero_cartao)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 16);
                        setCardData({ ...cardData, numero_cartao: value });
                      }}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Validade</Label>
                      <Input
                        value={formatCardExpiry(cardData.data_validade)}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setCardData({ ...cardData, data_validade: value });
                        }}
                        placeholder="MM/AA"
                        maxLength={5}
                        required
                        className={cardData.data_validade.length === 4 && !validateCardExpiry(cardData.data_validade).valid ? "border-red-500" : ""}
                      />
                      {cardData.data_validade.length === 4 && !validateCardExpiry(cardData.data_validade).valid && (
                        <p className="text-xs text-red-500 mt-1">
                          {validateCardExpiry(cardData.data_validade).message}
                        </p>
                      )}
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
                      * Juros de até 1.99% ao mês (quanto maior a entrada, menor o juros) | Sujeito a análise de crédito
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Cupom de Desconto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgePercent className="w-5 h-5" />
                Cupom de Desconto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={cupomCode}
                  onChange={(e) => setCupomCode(e.target.value.toUpperCase())}
                  placeholder="Digite o código do cupom"
                  disabled={cupomAplicado !== null}
                  className="flex-1"
                />
                {cupomAplicado ? (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setCupomAplicado(null);
                      setCupomCode("");
                    }}
                  >
                    Remover
                  </Button>
                ) : (
                  <Button onClick={handleAplicarCupom} disabled={loadingCupom}>
                    {loadingCupom ? "Verificando..." : "Aplicar"}
                  </Button>
                )}
              </div>
              {cupomAplicado && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <BadgePercent className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    Cupom <strong>{cupomAplicado.code}</strong> aplicado! 
                    Desconto de <strong>
                      {cupomAplicado.discount_type === 'percentage' 
                        ? `${cupomAplicado.discount_value}%` 
                        : formatPrice(Number(cupomAplicado.discount_value))}
                    </strong>
                  </AlertDescription>
                </Alert>
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
              {cupomAplicado && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto ({cupomAplicado.code})</span>
                  <span className="font-semibold">-{formatPrice(calcularDesconto())}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{formatPrice(calcularTotalComDesconto())}</span>
              </div>

              {!isAccountVerified && (
                <Alert className="border-amber-500/50 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    Sua conta precisa estar verificada para realizar compras.{" "}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-amber-600 dark:text-amber-400 underline"
                      onClick={() => navigate("/perfil")}
                    >
                      Verificar agora
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleFinalizarPedido}
                disabled={loading || frete === 0 || !isAccountVerified}
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
                      if (!isAccountVerified) {
                        toast({
                          title: "Conta não verificada",
                          description: "Você precisa verificar sua conta para realizar qualquer compra",
                          variant: "destructive",
                        });
                        navigate("/perfil");
                      } else {
                        setPaymentType("pix");
                        setShowCardRejectionDialog(false);
                      }
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
                          description: "Você precisa verificar sua conta para realizar qualquer compra",
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
