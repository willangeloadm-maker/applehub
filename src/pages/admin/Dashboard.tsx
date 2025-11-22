import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, ShoppingCart, Users, TrendingUp, DollarSign, Plus, Clock, CheckCircle2, AlertCircle, Settings, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';

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

  // Ativar notificações em tempo real de novos pedidos
  useOrderNotifications();

  useEffect(() => {
    loadStats();
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
      title: "Pedidos Pendentes",
      description: `${stats.pendingOrders} aguardando`,
      icon: Clock,
      path: "/admin/pedidos",
      gradient: "from-amber-500 to-orange-500",
      badge: stats.pendingOrders
    },
    {
      title: "Usuários",
      description: "Gerenciar clientes",
      icon: Users,
      path: "/admin/usuarios",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      title: "Análises de Crédito",
      description: "Ver análises",
      icon: BarChart3,
      path: "/admin/analises-credito",
      gradient: "from-purple-500 to-violet-500"
    },
    {
      title: "Transações",
      description: "Ver pagamentos",
      icon: DollarSign,
      path: "/admin/transacoes",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Configurações",
      description: "Ajustar parcelamento",
      icon: Settings,
      path: "/admin/configuracoes",
      gradient: "from-slate-600 to-slate-700"
    },
  ];

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
            {quickActions.map((action) => (
              <Card 
                key={action.path}
                className="group cursor-pointer border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 overflow-hidden"
                onClick={() => navigate(action.path)}
              >
                <CardContent className="p-6 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                  <div className="relative flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                          <action.icon className="w-5 h-5 text-white" />
                        </div>
                        {action.badge !== undefined && action.badge > 0 && (
                          <span className="px-2 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold animate-pulse">
                            {action.badge}
                          </span>
                        )}
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
          </>
        )}
      </div>
    </AppLayout>
  );
}
