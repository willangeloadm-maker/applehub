import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CreditAnalysis = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const totalValue = searchParams.get("total");

  useEffect(() => {
    if (!orderId || !totalValue) {
      navigate("/checkout");
      return;
    }

    // Simulação de análise de crédito por 10 segundos
    const timer = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        // Aprovar 90% do valor solicitado
        const valorSolicitado = parseFloat(totalValue);
        const percentualAprovado = 90;
        const valorAprovado = (valorSolicitado * percentualAprovado) / 100;

        // Criar análise de crédito
        const { error: analysisError } = await supabase
          .from("credit_analyses")
          .insert({
            user_id: user.id,
            order_id: orderId,
            valor_solicitado: valorSolicitado,
            valor_aprovado: valorAprovado,
            percentual_aprovado: percentualAprovado,
            status: "aprovado",
          });

        if (analysisError) throw analysisError;

        // Redirecionar para tela de crédito aprovado
        navigate(`/credito-aprovado?orderId=${orderId}&valorAprovado=${valorAprovado}&valorTotal=${valorSolicitado}`);
      } catch (error: any) {
        toast({
          title: "Erro na análise",
          description: error.message,
          variant: "destructive",
        });
        navigate("/pedidos");
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [orderId, totalValue, navigate, toast]);

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Analisando Crédito</h1>
                <p className="text-muted-foreground">
                  Estamos verificando seu perfil e histórico...
                </p>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>Verificando documentos</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-75" />
                  <span>Consultando histórico</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150" />
                  <span>Calculando limite disponível</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Isso pode levar alguns segundos...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CreditAnalysis;
