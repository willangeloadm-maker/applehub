import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, Users, TrendingUp, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-full">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Dashboard Administrativo</h1>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingOrders}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R$ {stats.totalRevenue.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Receita Mensal</CardTitle>
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

              <Card>
                <CardHeader>
                  <CardTitle>Produtos Mais Vendidos</CardTitle>
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
