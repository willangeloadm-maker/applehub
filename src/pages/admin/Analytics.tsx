import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  Clock, 
  TrendingUp,
  Eye,
  UserCheck,
  UserX,
  MapPin,
  Chrome,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";

interface VisitorLog {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  referrer: string | null;
  page_visited: string;
  user_id: string | null;
  is_registered: boolean | null;
  session_id: string | null;
  created_at: string;
}

interface Stats {
  totalVisits: number;
  uniqueVisitors: number;
  registeredUsers: number;
  anonymousUsers: number;
  deviceStats: { name: string; value: number }[];
  browserStats: { name: string; value: number }[];
  osStats: { name: string; value: number }[];
  pageStats: { name: string; visits: number }[];
  hourlyStats: { hour: string; visits: number }[];
  countryStats: { name: string; value: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const [visitors, setVisitors] = useState<VisitorLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('visitor_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const logs = (data || []) as VisitorLog[];
      setVisitors(logs);

      // Calculate stats
      const uniqueSessions = new Set(logs.map(v => v.session_id || v.ip_address));
      const registered = logs.filter(v => v.is_registered);
      const anonymous = logs.filter(v => !v.is_registered);

      // Device stats
      const deviceCounts: Record<string, number> = {};
      logs.forEach(v => {
        const device = v.device_type || 'Desconhecido';
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      });

      // Browser stats
      const browserCounts: Record<string, number> = {};
      logs.forEach(v => {
        const browser = v.browser || 'Desconhecido';
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      });

      // OS stats
      const osCounts: Record<string, number> = {};
      logs.forEach(v => {
        const os = v.os || 'Desconhecido';
        osCounts[os] = (osCounts[os] || 0) + 1;
      });

      // Page stats
      const pageCounts: Record<string, number> = {};
      logs.forEach(v => {
        pageCounts[v.page_visited] = (pageCounts[v.page_visited] || 0) + 1;
      });

      // Hourly stats (last 24 hours)
      const hourlyData: Record<string, number> = {};
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const key = format(hour, 'HH:00');
        hourlyData[key] = 0;
      }
      logs.forEach(v => {
        const hour = format(new Date(v.created_at), 'HH:00');
        if (hourlyData[hour] !== undefined) {
          hourlyData[hour]++;
        }
      });

      // Country stats
      const countryCounts: Record<string, number> = {};
      logs.forEach(v => {
        const country = v.country || 'Desconhecido';
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      });

      setStats({
        totalVisits: logs.length,
        uniqueVisitors: uniqueSessions.size,
        registeredUsers: new Set(registered.map(v => v.user_id)).size,
        anonymousUsers: new Set(anonymous.map(v => v.session_id || v.ip_address)).size,
        deviceStats: Object.entries(deviceCounts).map(([name, value]) => ({ name, value })),
        browserStats: Object.entries(browserCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6),
        osStats: Object.entries(osCounts).map(([name, value]) => ({ name, value })),
        pageStats: Object.entries(pageCounts).map(([name, visits]) => ({ name, visits })).sort((a, b) => b.visits - a.visits).slice(0, 10),
        hourlyStats: Object.entries(hourlyData).map(([hour, visits]) => ({ hour, visits })),
        countryStats: Object.entries(countryCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8),
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time subscription
    const channel = supabase
      .channel('visitor-logs-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'visitor_logs' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getDeviceIcon = (type: string | null) => {
    switch (type) {
      case 'Mobile': return <Smartphone className="h-4 w-4" />;
      case 'Tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics de Visitantes</h1>
          <p className="text-muted-foreground">Acompanhe os acessos ao seu site em tempo real</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Visitas</CardTitle>
            <Eye className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalVisits || 0}</div>
            <p className="text-xs text-muted-foreground">Últimas 500 visitas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitantes Únicos</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.uniqueVisitors || 0}</div>
            <p className="text-xs text-muted-foreground">Por sessão/IP</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Cadastrados</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.registeredUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Logados</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitantes Anônimos</CardTitle>
            <UserX className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.anonymousUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Não logados</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Traffic */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tráfego por Hora (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.hourlyStats || []}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="visits" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorVisits)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Device Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Dispositivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.deviceStats || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats?.deviceStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* More Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Browsers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Chrome className="h-5 w-5" />
              Navegadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.browserStats || []} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* OS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Sistemas Operacionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.osStats || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name }) => name}
                  >
                    {stats?.osStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Countries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Países
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.countryStats || []} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Páginas Mais Visitadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.pageStats || []}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Logs Detalhados
          </CardTitle>
          <CardDescription>Últimos acessos ao site em tempo real</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Página</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Navegador</TableHead>
                    <TableHead>SO</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitors.slice(0, 100).map((visitor) => (
                    <TableRow key={visitor.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(visitor.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{visitor.ip_address || '-'}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs" title={visitor.page_visited}>
                        {visitor.page_visited}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getDeviceIcon(visitor.device_type)}
                          <span className="text-xs">{visitor.device_type || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{visitor.browser || '-'}</TableCell>
                      <TableCell className="text-xs">{visitor.os || '-'}</TableCell>
                      <TableCell className="text-xs">
                        {visitor.city && visitor.country 
                          ? `${visitor.city}, ${visitor.country}` 
                          : visitor.country || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={visitor.is_registered ? "default" : "secondary"} className="text-xs">
                          {visitor.is_registered ? "Cadastrado" : "Anônimo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
