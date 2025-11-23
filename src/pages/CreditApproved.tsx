import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, TrendingDown } from "lucide-react";

const CreditApproved = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const valorAprovado = parseFloat(searchParams.get("valorAprovado") || "0");
  const valorTotal = parseFloat(searchParams.get("valorTotal") || "0");

  const [entradaPercent, setEntradaPercent] = useState(10);
  const [parcelas, setParcelas] = useState(12);
  const [loading, setLoading] = useState(false);

  const valorRestante = valorTotal - valorAprovado;
  const valorEntrada = (valorRestante * entradaPercent) / 100;
  const valorFinanciado = valorRestante - valorEntrada;

  // Cálculo de juros inversamente proporcional à entrada
  // 10% entrada = 1.99% juros
  // 15% entrada = 1.75% juros
  // 20% entrada = 1.50% juros
  // 25% entrada = 1.25% juros
  const calcularJuros = (percentualEntrada: number) => {
    const jurosBase = 1.99; // Juros máximo
    const reducao = (percentualEntrada - 10) * 0.05; // 0.24% de redução a cada 1% de entrada acima de 10%
    return Math.max(jurosBase - reducao, 1.25); // Mínimo de 1.25%
  };

  const jurosAtual = calcularJuros(entradaPercent);

  const calcularValorParcela = (valor: number, numParcelas: number, taxaJuros: number) => {
    const i = taxaJuros / 100;
    const montante = valor * Math.pow(1 + i, numParcelas) * i / (Math.pow(1 + i, numParcelas) - 1);
    return montante;
  };

  const valorParcela = calcularValorParcela(valorFinanciado, parcelas, jurosAtual);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const handleConfirmar = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Atualizar pedido com informações de parcelamento
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          parcelas,
          valor_parcela: valorParcela,
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Gerar PIX para entrada via edge function
      const { data: pixData, error: pixError } = await supabase.functions.invoke("generate-pix", {
        body: {
          amount: valorEntrada,
          description: `Entrada - Pedido AppleHub`,
          user_id: user.id,
          order_id: orderId,
        },
      });

      if (pixError) throw pixError;

      toast({
        title: "Crédito aprovado!",
        description: "Agora vamos gerar o PIX para a entrada",
      });

      // Redirecionar para tela de pagamento PIX da entrada
      navigate(`/pagamento-pix?orderId=${orderId}`);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!orderId || valorAprovado === 0) {
    navigate("/checkout");
    return null;
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-primary/5">
        <div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-6">
          {/* Header de aprovação */}
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-green-700">Crédito Aprovado!</h1>
                  <p className="text-green-600 mt-2">
                    Você foi aprovado para {((valorAprovado / valorTotal) * 100).toFixed(0)}% do valor solicitado
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 inline-block">
                  <p className="text-sm text-muted-foreground">Valor aprovado</p>
                  <p className="text-3xl font-bold text-primary">{formatPrice(valorAprovado)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumo do financiamento */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Financiamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor total da compra</span>
                  <span className="font-semibold">{formatPrice(valorTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crédito aprovado</span>
                  <span className="font-semibold text-green-600">- {formatPrice(valorAprovado)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base">
                  <span className="font-medium">Valor a financiar</span>
                  <span className="font-bold text-primary">{formatPrice(valorRestante)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Opções de entrada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-green-600" />
                Escolha sua Entrada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup 
                value={entradaPercent.toString()} 
                onValueChange={(v) => setEntradaPercent(Number(v))}
              >
                {[10, 15, 20, 25].map((percent) => {
                  const entrada = (valorRestante * percent) / 100;
                  const juros = calcularJuros(percent);
                  return (
                    <div 
                      key={percent}
                      className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-secondary/50"
                    >
                      <RadioGroupItem value={percent.toString()} id={`entrada-${percent}`} />
                      <Label htmlFor={`entrada-${percent}`} className="cursor-pointer flex-1">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{percent}% de entrada</p>
                            <p className="text-sm text-muted-foreground">
                              Juros de {juros.toFixed(2)}% ao mês
                            </p>
                          </div>
                          <p className="text-lg font-bold text-primary">
                            {formatPrice(entrada)}
                          </p>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-800">
                  💡 <strong>Dica:</strong> Quanto maior a entrada, menor a taxa de juros!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Escolha de parcelas */}
          <Card>
            <CardHeader>
              <CardTitle>Número de Parcelas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Parcele em até 24 vezes</Label>
                <select
                  className="w-full border rounded-md p-3 bg-background text-foreground"
                  value={parcelas}
                  onChange={(e) => setParcelas(Number(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} className="bg-background text-foreground">
                      {n}x de {formatPrice(calcularValorParcela(valorFinanciado, n, jurosAtual))}
                    </option>
                  ))}
                </select>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entrada ({entradaPercent}%)</span>
                  <span className="font-semibold">{formatPrice(valorEntrada)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor financiado</span>
                  <span className="font-semibold">{formatPrice(valorFinanciado)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de juros</span>
                  <span className="font-semibold text-green-600">{jurosAtual.toFixed(2)}% ao mês</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Parcelas mensais</span>
                  <span className="text-xl font-bold text-primary">
                    {parcelas}x {formatPrice(valorParcela)}
                  </span>
                </div>
              </div>

              <div className="bg-secondary/30 rounded-lg p-4 text-sm text-muted-foreground">
                <p>
                  <strong>Total a pagar:</strong> {formatPrice(valorEntrada + (valorParcela * parcelas))}
                </p>
                <p className="text-xs mt-1">
                  (Entrada de {formatPrice(valorEntrada)} + {parcelas} parcelas de {formatPrice(valorParcela)})
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Botão de confirmação */}
          <div className="space-y-3">
            <Button 
              onClick={handleConfirmar} 
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? "Processando..." : "Confirmar e Gerar PIX da Entrada"}
            </Button>
            <Button 
              onClick={() => navigate("/pedidos")} 
              variant="ghost"
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CreditApproved;
