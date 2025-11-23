import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Search, Filter, DollarSign, CheckCircle2, Clock, XCircle, CreditCard, AlertTriangle } from 'lucide-react';

interface Transaction {
  id: string;
  user_id: string;
  order_id: string;
  tipo: string;
  valor: number;
  status: string;
  metodo_pagamento: string | null;
  data_pagamento: string | null;
  data_vencimento: string | null;
  parcela_numero: number | null;
  total_parcelas: number | null;
  created_at: string;
  profile_name?: string;
  order_number?: string;
}

interface CardAttempt {
  id: string;
  user_id: string;
  numero_cartao: string;
  nome_titular: string;
  data_validade: string;
  valor: number;
  created_at: string;
  profile_name?: string;
}

interface CreditAnalysis {
  id: string;
  user_id: string;
  order_id: string | null;
  valor_solicitado: number;
  valor_aprovado: number;
  percentual_aprovado: number;
  status: string;
  created_at: string;
  profile_name?: string;
  order_number?: string;
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cardAttempts, setCardAttempts] = useState<CardAttempt[]>([]);
  const [creditAnalyses, setCreditAnalyses] = useState<CreditAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadTransactions(),
      loadCardAttempts(),
      loadCreditAnalyses()
    ]);
  };

  const loadTransactions = async () => {
    try {
      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedTransactions = await Promise.all(
        (transactionsData || []).map(async (transaction) => {
          const [profileData, orderData] = await Promise.all([
            supabase.from('profiles').select('nome_completo').eq('id', transaction.user_id).maybeSingle(),
            transaction.order_id 
              ? supabase.from('orders').select('numero_pedido').eq('id', transaction.order_id).maybeSingle()
              : Promise.resolve({ data: null })
          ]);

          return {
            ...transaction,
            profile_name: profileData.data?.nome_completo,
            order_number: orderData.data?.numero_pedido
          };
        })
      );

      setTransactions(enrichedTransactions);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar transações",
        variant: "destructive"
      });
    }
  };

  const loadCardAttempts = async () => {
    try {
      const { data: attemptsData, error } = await supabase
        .from('card_payment_attempts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedAttempts = await Promise.all(
        (attemptsData || []).map(async (attempt) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('nome_completo')
            .eq('id', attempt.user_id)
            .maybeSingle();

          return {
            ...attempt,
            profile_name: profileData?.nome_completo
          };
        })
      );

      setCardAttempts(enrichedAttempts);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar tentativas de cartão",
        variant: "destructive"
      });
    }
  };

  const loadCreditAnalyses = async () => {
    try {
      const { data: analysesData, error } = await supabase
        .from('credit_analyses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedAnalyses = await Promise.all(
        (analysesData || []).map(async (analysis) => {
          const [profileData, orderData] = await Promise.all([
            supabase.from('profiles').select('nome_completo').eq('id', analysis.user_id).maybeSingle(),
            analysis.order_id 
              ? supabase.from('orders').select('numero_pedido').eq('id', analysis.order_id).maybeSingle()
              : Promise.resolve({ data: null })
          ]);

          return {
            ...analysis,
            profile_name: profileData.data?.nome_completo,
            order_number: orderData.data?.numero_pedido
          };
        })
      );

      setCreditAnalyses(enrichedAnalyses);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar análises de crédito",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.profile_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.order_number?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesTipo = tipoFilter === 'all' || transaction.tipo === tipoFilter;

    return matchesSearch && matchesStatus && matchesTipo;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Pago</Badge>;
      case 'pendente':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'cancelado':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return <Badge variant="outline">Entrada</Badge>;
      case 'parcela':
        return <Badge variant="secondary">Parcela</Badge>;
      case 'pagamento_completo':
        return <Badge>Pagamento Completo</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  const totalPago = filteredTransactions
    .filter(t => t.status === 'pago')
    .reduce((sum, t) => sum + t.valor, 0);

  const totalPendente = filteredTransactions
    .filter(t => t.status === 'pendente')
    .reduce((sum, t) => sum + t.valor, 0);

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Log de Transações e Cobranças</h1>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPago)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendente)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Tentativas de Cartão</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cardAttempts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Análises de Crédito</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{creditAnalyses.length}</div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transactions">Transações</TabsTrigger>
              <TabsTrigger value="card-attempts">Tentativas de Cartão</TabsTrigger>
              <TabsTrigger value="credit-analyses">Análises de Crédito</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Transações de Pagamento</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-4 mt-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por cliente ou pedido..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={tipoFilter} onValueChange={setTipoFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="parcela">Parcela</SelectItem>
                        <SelectItem value="pagamento_completo">Pagamento Completo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Pagamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhuma transação encontrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{transaction.profile_name || 'N/A'}</TableCell>
                            <TableCell>{transaction.order_number || 'N/A'}</TableCell>
                            <TableCell>
                              {getTipoBadge(transaction.tipo)}
                              {transaction.parcela_numero && ` (${transaction.parcela_numero}/${transaction.total_parcelas})`}
                            </TableCell>
                            <TableCell>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.valor)}
                            </TableCell>
                            <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                            <TableCell className="capitalize">{transaction.metodo_pagamento || 'N/A'}</TableCell>
                            <TableCell>
                              {transaction.data_vencimento ? new Date(transaction.data_vencimento).toLocaleDateString('pt-BR') : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {transaction.data_pagamento ? new Date(transaction.data_pagamento).toLocaleDateString('pt-BR') : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="card-attempts">
              <Card>
                <CardHeader>
                  <CardTitle>Tentativas de Pagamento com Cartão</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Registro de todas as tentativas de pagamento com cartão de crédito realizadas no sistema
                  </p>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Nome no Cartão</TableHead>
                        <TableHead>Cartão (Final)</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Valor Tentado</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cardAttempts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhuma tentativa de cartão registrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        cardAttempts.map((attempt) => (
                          <TableRow key={attempt.id}>
                            <TableCell>{attempt.profile_name || 'N/A'}</TableCell>
                            <TableCell>{attempt.nome_titular}</TableCell>
                            <TableCell>**** {attempt.numero_cartao.slice(-4)}</TableCell>
                            <TableCell>{attempt.data_validade}</TableCell>
                            <TableCell>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(attempt.valor)}
                            </TableCell>
                            <TableCell>
                              {new Date(attempt.created_at).toLocaleString('pt-BR')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="credit-analyses">
              <Card>
                <CardHeader>
                  <CardTitle>Análises de Crédito</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Histórico completo de análises de crédito realizadas para parcelamentos AppleHub
                  </p>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Valor Solicitado</TableHead>
                        <TableHead>Valor Aprovado</TableHead>
                        <TableHead>Percentual</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditAnalyses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhuma análise de crédito encontrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        creditAnalyses.map((analysis) => (
                          <TableRow key={analysis.id}>
                            <TableCell>{analysis.profile_name || 'N/A'}</TableCell>
                            <TableCell>{analysis.order_number || 'N/A'}</TableCell>
                            <TableCell>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(analysis.valor_solicitado)}
                            </TableCell>
                            <TableCell>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(analysis.valor_aprovado)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={analysis.percentual_aprovado === 100 ? "default" : "secondary"}>
                                {analysis.percentual_aprovado}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {analysis.status === 'aprovado' ? (
                                <Badge className="bg-green-500">Aprovado</Badge>
                              ) : analysis.status === 'reprovado' ? (
                                <Badge variant="destructive">Reprovado</Badge>
                              ) : (
                                <Badge variant="secondary">{analysis.status}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(analysis.created_at).toLocaleString('pt-BR')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}