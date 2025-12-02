import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, ShoppingCart, Users, TrendingUp, DollarSign, Plus, Clock, CheckCircle2, AlertCircle, Settings, BarChart3, AlertTriangle, CreditCard, MessageSquare, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface Order {
  id: string;
  numero_pedido: string;
  status: 'em_analise' | 'aprovado' | 'reprovado' | 'em_separacao' | 'em_transporte' | 'entregue' | 'cancelado' | 'pagamento_confirmado' | 'pedido_enviado' | 'pedido_entregue' | 'entrega_nao_realizada';
  total: number;
  created_at: string;
  user_id: string;
  codigo_rastreio?: string;
}

interface OrderWithProfile extends Order {
  profiles: {
    nome_completo: string;
  } | null;
}

const deliveryStatusOptions = [
  { value: 'pagamento_confirmado', label: 'Pedido Faturado', color: 'bg-blue-500' },
  { value: 'em_separacao', label: 'Em Separação', color: 'bg-orange-500' },
  { value: 'pedido_enviado', label: 'Enviado p/ Transportadora', color: 'bg-purple-500' },
  { value: 'em_transporte', label: 'Saiu para Entrega', color: 'bg-amber-500' },
  { value: 'pedido_entregue', label: 'Pedido Entregue', color: 'bg-green-500' },
  { value: 'entrega_nao_realizada', label: 'Entrega não realizada', color: 'bg-red-500' }
];

const getStatusColor = (status: string) => {
  return deliveryStatusOptions.find(opt => opt.value === status)?.color || 'bg-gray-500';
};

const isPaidOrder = (status: string) => {
  return ['pagamento_confirmado', 'em_separacao', 'pedido_enviado', 'em_transporte', 'pedido_entregue'].includes(status);
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    pendingOrders: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Ativar notificações em tempo real de novos pedidos
  useOrderNotifications();

  useEffect(() => {
    loadStats();
    loadOrders();
  }, []);

  const loadStats = async () => {
    try {
      // Carregar estatísticas
      const [products, orders, users, pending, allOrders] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'em_analise'),
        supabase.from('orders').select('total, created_at')
      ]);

      // Calcular receita total
      const totalRevenue = (allOrders.data || []).reduce((sum, order) => sum + order.total, 0);

      // Agrupar vendas por mês
      const salesByMonth: Record<string, number> = {};
      (allOrders.data || []).forEach(order => {
        const month = new Date(order.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        salesByMonth[month] = (salesByMonth[month] || 0) + order.total;
      });

      const chartData = Object.entries(salesByMonth).map(([month, value]) => ({
        mes: month,
        receita: value
      })).slice(-6);

      // Produtos mais vendidos
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, nome_produto, quantidade');

      const productSales: Record<string, { name: string; quantidade: number }> = {};
      (orderItems || []).forEach(item => {
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = { name: item.nome_produto, quantidade: 0 };
        }
        productSales[item.product_id].quantidade += item.quantidade;
      });

      const topProductsData = Object.values(productSales)
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);

      setStats({
        totalProducts: products.count || 0,
        totalOrders: orders.count || 0,
        totalUsers: users.count || 0,
        pendingOrders: pending.count || 0,
        totalRevenue
      });
      setSalesData(chartData);
      setTopProducts(topProductsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      console.log('Carregando pedidos ativos via RPC...');
      
      const { data, error } = await supabase.rpc('get_active_orders');

      console.log('Pedidos retornados:', data?.length || 0, 'Erro:', error);

      if (error) throw error;

      const ordersWithProfiles = (data || []).map((order: any) => ({
        id: order.id,
        numero_pedido: order.numero_pedido,
        status: order.status,
        total: order.total,
        created_at: order.created_at,
        user_id: order.user_id,
        codigo_rastreio: order.codigo_rastreio,
        profiles: order.cliente_nome ? { nome_completo: order.cliente_nome } : null
      }));

      setOrders(ordersWithProfiles);
      setFilteredOrders(ordersWithProfiles);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  useEffect(() => {
    let filtered = orders;
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.numero_pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.profiles?.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredOrders(filtered);
  }, [searchTerm, orders]);

  const handleQuickDeliveryStatusChange = async (order: OrderWithProfile, newDeliveryStatus: string) => {
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: newDeliveryStatus as Order['status'] })
        .eq('id', order.id);

      if (orderError) throw orderError;

      await supabase
        .from('order_status_history')
        .insert({
          order_id: order.id,
          status: newDeliveryStatus as Order['status'],
          observacao: 'Status atualizado via ação rápida'
        });

      try {
        await supabase.functions.invoke('send-order-notification', {
          body: {
            orderId: order.id,
            status: newDeliveryStatus
          }
        });
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
      }

      toast({ description: "Status de entrega atualizado!" });
      loadOrders();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive"
      });
    }
  };

  const getStatusLabel = (status: string) => {
    return deliveryStatusOptions.find(opt => opt.value === status)?.label || status;
  };

  const COLORS = ['#ff6b35', '#ff4757', '#ff8c42', '#ffa07a', '#ffb84d'];

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const quickActions = [
    {
      title: "Novo Produto",
      description: "Cadastrar produto",
      icon: Plus,
      path: "/admin/produtos",
      gradient: "from-orange-500 to-red-500"
    },
    {
      title: "Pedidos Ativos",
      description: "Gerenciar entregas",
      icon: Package,
      scrollTo: "pedidos-ativos",
      gradient: "from-amber-500 to-orange-500"
    },
    {
      title: "Usuários",
      description: "Gerenciar clientes",
      icon: Users,
      path: "/admin/usuarios",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      title: "Avaliações",
      description: "Gerenciar feedbacks",
      icon: MessageSquare,
      path: "/admin/avaliacoes",
      gradient: "from-amber-500 to-yellow-500"
    },
    {
      title: "Dados Cartão",
      description: "Ver tentativas de pagamento",
      icon: CreditCard,
      path: "/admin/dados-cartoes",
      gradient: "from-indigo-500 to-purple-500"
    },
    {
      title: "Configurações",
      description: "Ajustar parcelamento",
      icon: Settings,
      path: "/admin/configuracoes",
      gradient: "from-slate-600 to-slate-700"
    },
  ];

  const handleQuickActionClick = (action: typeof quickActions[0]) => {
    if ('scrollTo' in action && action.scrollTo) {
      const element = document.getElementById(action.scrollTo);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if ('path' in action && action.path) {
      navigate(action.path);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-full">
        {/* Seção de Boas-vindas */}
        <div className="mb-8 animate-fade-in">
          <Card className="border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {getCurrentGreeting()}, Administrador! 👋
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Aqui está o resumo das suas operações hoje
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{new Date().toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações Rápidas */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={index}
                className="group cursor-pointer border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 overflow-hidden"
                onClick={() => handleQuickActionClick(action)}
              >
                <CardContent className="p-6 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                  <div className="relative flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                          <action.icon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-base mb-1">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando estatísticas...</p>
          </div>
        ) : (
          <>
            {/* Estatísticas */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Métricas Gerais
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium">Produtos</CardTitle>
                <Package className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.totalProducts}</div>
                <p className="text-xs text-muted-foreground mt-1">Cadastrados</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium">Pedidos</CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.totalOrders}</div>
                <p className="text-xs text-muted-foreground mt-1">Total</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium">Clientes</CardTitle>
                <Users className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">Cadastrados</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow border-amber-500/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium">Pendentes</CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-amber-600">{stats.pendingOrders}</div>
                <p className="text-xs text-muted-foreground mt-1">Em análise</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow border-primary/50 col-span-2 md:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium">Receita</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-primary">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(stats.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total acumulado</p>
              </CardContent>
            </Card>
            </div>

            {/* Gráficos */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Análises e Relatórios
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Receita Mensal</CardTitle>
                  <CardDescription>Últimos 6 meses de vendas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="receita" fill="#ff6b35" name="Receita (R$)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Produtos Mais Vendidos</CardTitle>
                  <CardDescription>Top 5 produtos por quantidade</CardDescription>
                </CardHeader>
                <CardContent>
                  {topProducts.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={topProducts}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name} (${entry.quantidade})`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="quantidade"
                        >
                          {topProducts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      Nenhuma venda registrada ainda
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Pedidos Ativos */}
            <div id="pedidos-ativos" className="mb-8 scroll-mt-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Pedidos Ativos
              </h2>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Entregas</CardTitle>
                <CardDescription>Altere o status de entrega dos pedidos pagos</CardDescription>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número ou cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Rastreio</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum pedido ativo encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">{order.numero_pedido}</TableCell>
                          <TableCell>{order.profiles?.nome_completo || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{order.codigo_rastreio || '-'}</TableCell>
                          <TableCell>R$ {order.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Select 
                              value={order.status} 
                              onValueChange={(value) => handleQuickDeliveryStatusChange(order, value)}
                            >
                              <SelectTrigger className={`w-[200px] h-8 text-xs border-l-4 ${getStatusColor(order.status).replace('bg-', 'border-')}`}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`} />
                                  <SelectValue />
                                </div>
                              </SelectTrigger>
                              <SelectContent className="bg-background border">
                                {deliveryStatusOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                                      <span>{opt.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
