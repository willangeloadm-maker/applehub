import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';

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

const statusOptions = [
  { value: 'em_analise', label: 'Em Análise' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'reprovado', label: 'Reprovado' },
  { value: 'pagamento_confirmado', label: 'Pagamento Confirmado' },
  { value: 'em_separacao', label: 'Separando o Pedido' },
  { value: 'pedido_enviado', label: 'Pedido Enviado' },
  { value: 'pedido_entregue', label: 'Pedido Entregue' },
  { value: 'entrega_nao_realizada', label: 'Não foi possível entregar' },
  { value: 'cancelado', label: 'Cancelado' }
];

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithProfile | null>(null);
  const [newStatus, setNewStatus] = useState<Order['status']>('em_analise');
  const [observacao, setObservacao] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, numero_pedido, status, total, created_at, user_id, codigo_rastreio')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar perfis dos usuários
      const ordersWithProfiles = await Promise.all(
        (data || []).map(async (order) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nome_completo')
            .eq('id', order.user_id)
            .single();

          return {
            ...order,
            profiles: profile
          };
        })
      );

      setOrders(ordersWithProfiles);
      setFilteredOrders(ordersWithProfiles);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar pedidos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [searchTerm, statusFilter, orders]);

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    try {
      // Atualizar status do pedido
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', selectedOrder.id);

      if (orderError) throw orderError;

      // Adicionar ao histórico
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: selectedOrder.id,
          status: newStatus,
          observacao: observacao || null
        });

      if (historyError) throw historyError;

      // Enviar notificação por email
      try {
        await supabase.functions.invoke('send-order-notification', {
          body: {
            orderId: selectedOrder.id,
            status: newStatus,
            observacao: observacao || undefined
          }
        });
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
        // Não falha a operação se o email não for enviado
      }

      toast({ description: "Status atualizado com sucesso e email enviado" });
      setDialogOpen(false);
      setObservacao('');
      loadOrders();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive"
      });
    }
  };

  const openStatusDialog = (order: OrderWithProfile) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setDialogOpen(true);
  };

  const getStatusLabel = (status: string) => {
    return statusOptions.find(opt => opt.value === status)?.label || status;
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-full">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Gestão de Pedidos</h1>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Pedidos</CardTitle>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número ou cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum pedido encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.numero_pedido}</TableCell>
                      <TableCell>{order.profiles?.nome_completo}</TableCell>
                      <TableCell className="font-mono text-xs">{order.codigo_rastreio || '-'}</TableCell>
                      <TableCell>R$ {order.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-secondary">
                          {getStatusLabel(order.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStatusDialog(order)}
                        >
                          Alterar Status
                        </Button>
                      </TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Status do Pedido</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Pedido: {selectedOrder?.numero_pedido}</Label>
              </div>
              <div>
                <Label>Novo Status</Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observação (opcional)</Label>
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Adicione uma observação sobre a mudança de status"
                />
              </div>
              <Button onClick={handleUpdateStatus} className="w-full">
                Atualizar Status
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
