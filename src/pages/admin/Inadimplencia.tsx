import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface InadimplenteData {
  user_id: string;
  nome_completo: string;
  cpf: string;
  telefone: string;
  email: string;
  total_pendente: number;
  parcelas_atrasadas: number;
  dias_atraso: number;
  proxima_parcela: string;
  valor_proxima: number;
}

export default function Inadimplencia() {
  const navigate = useNavigate();
  const [inadimplentes, setInadimplentes] = useState<InadimplenteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInadimplentes: 0,
    totalPendente: 0,
    parcelasAtrasadas: 0
  });

  useEffect(() => {
    loadInadimplentes();
  }, []);

  const loadInadimplentes = async () => {
    try {
      const hoje = new Date();
      
      // Buscar transações atrasadas (parcelas com data_vencimento passada e status pendente)
      const { data: transacoesAtrasadas, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'pendente')
        .lt('data_vencimento', hoje.toISOString())
        .order('data_vencimento', { ascending: true });

      if (error) throw error;

      // Agrupar por usuário
      const inadimplentesMap = new Map<string, InadimplenteData>();
      let totalPendente = 0;
      let parcelasAtrasadas = 0;

      for (const transacao of transacoesAtrasadas || []) {
        const userId = transacao.user_id;
        
        if (!inadimplentesMap.has(userId)) {
          // Buscar dados do perfil
          const { data: profile } = await supabase
            .from('profiles')
            .select('nome_completo, cpf, telefone')
            .eq('id', userId)
            .single();

          // Buscar email do usuário
          const { data: { user } } = await supabase.auth.admin.getUserById(userId);
          
          inadimplentesMap.set(userId, {
            user_id: userId,
            nome_completo: profile?.nome_completo || 'N/A',
            cpf: profile?.cpf || 'N/A',
            telefone: profile?.telefone || 'N/A',
            email: user?.email || 'N/A',
            total_pendente: 0,
            parcelas_atrasadas: 0,
            dias_atraso: 0,
            proxima_parcela: '',
            valor_proxima: 0
          });
        }

        const inadimplente = inadimplentesMap.get(userId)!;
        inadimplente.total_pendente += transacao.valor;
        inadimplente.parcelas_atrasadas += 1;
        
        const dataVencimento = new Date(transacao.data_vencimento);
        const diasAtraso = Math.floor((hoje.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diasAtraso > inadimplente.dias_atraso) {
          inadimplente.dias_atraso = diasAtraso;
          inadimplente.proxima_parcela = dataVencimento.toLocaleDateString('pt-BR');
          inadimplente.valor_proxima = transacao.valor;
        }

        totalPendente += transacao.valor;
        parcelasAtrasadas += 1;
      }

      const inadimplentesArray = Array.from(inadimplentesMap.values()).sort(
        (a, b) => b.dias_atraso - a.dias_atraso
      );

      setInadimplentes(inadimplentesArray);
      setStats({
        totalInadimplentes: inadimplentesArray.length,
        totalPendente,
        parcelasAtrasadas
      });
    } catch (error) {
      console.error('Erro ao carregar inadimplentes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar relatório de inadimplência",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (dias: number) => {
    if (dias <= 7) return "secondary";
    if (dias <= 30) return "default";
    return "destructive";
  };

  const handleWhatsApp = (telefone: string, nome: string) => {
    const mensagem = `Olá ${nome}, identificamos parcelas em atraso em sua conta AppleHub. Entre em contato conosco para regularizar sua situação.`;
    window.open(`https://wa.me/55${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Relatório de Inadimplência</h1>
          <p className="text-muted-foreground">
            Acompanhe clientes com pagamentos em atraso
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Clientes Inadimplentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInadimplentes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Parcelas Atrasadas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.parcelasAtrasadas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Valor Total Pendente</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(stats.totalPendente)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Inadimplentes */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes Inadimplentes</CardTitle>
          </CardHeader>
          <CardContent>
            {inadimplentes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum cliente inadimplente no momento</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Parcelas Atrasadas</TableHead>
                    <TableHead>Dias de Atraso</TableHead>
                    <TableHead>Valor Pendente</TableHead>
                    <TableHead>Próxima Parcela</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inadimplentes.map((inadimplente) => (
                    <TableRow key={inadimplente.user_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{inadimplente.nome_completo}</div>
                          <div className="text-sm text-muted-foreground">{inadimplente.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{inadimplente.cpf}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{inadimplente.parcelas_atrasadas}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(inadimplente.dias_atraso)}>
                          {inadimplente.dias_atraso} dias
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-destructive">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(inadimplente.total_pendente)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{inadimplente.proxima_parcela}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(inadimplente.valor_proxima)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWhatsApp(inadimplente.telefone, inadimplente.nome_completo)}
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              window.location.href = `mailto:${inadimplente.email}?subject=Parcelas em Atraso - AppleHub`;
                            }}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}