import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileCode, RefreshCw, Search, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ApiLog {
  id: string;
  created_at: string;
  endpoint: string;
  method: string;
  request_body: any;
  response_status: number;
  response_body: any;
  error_message: string | null;
  user_id: string | null;
  order_id: string | null;
  transaction_id: string | null;
  duration_ms: number;
  metadata: any;
}

export default function ApiLogs() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadLogs();
    
    // Subscrição em tempo real
    const channel = supabase
      .channel('api_logs_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pagarme_api_logs'
      }, () => {
        loadLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('pagarme_api_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    
    const searchLower = search.toLowerCase();
    return (
      log.endpoint.toLowerCase().includes(searchLower) ||
      log.method.toLowerCase().includes(searchLower) ||
      log.error_message?.toLowerCase().includes(searchLower) ||
      log.metadata?.type?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Sucesso</Badge>;
    } else if (status >= 400 && status < 500) {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Erro Cliente</Badge>;
    } else if (status >= 500) {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Erro Servidor</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const getTypeBadge = (metadata: any) => {
    const type = metadata?.type || 'unknown';
    const colors: { [key: string]: string } = {
      pix_generation: 'bg-blue-500',
      card_verification: 'bg-purple-500',
      card_refund: 'bg-orange-500',
      webhook_received: 'bg-green-500',
    };

    return (
      <Badge className={colors[type] || 'bg-gray-500'}>
        {type.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  const openLogDetails = (log: ApiLog) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileCode className="h-8 w-8" />
              Logs da API Pagar.me
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe todas as chamadas e webhooks da API em tempo real
            </p>
          </div>
          <Button onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Estatísticas Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total de Logs</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
              <div className="bg-green-500/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Sucessos</p>
                <p className="text-2xl font-bold text-green-600">
                  {logs.filter(l => l.response_status >= 200 && l.response_status < 300).length}
                </p>
              </div>
              <div className="bg-destructive/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Erros</p>
                <p className="text-2xl font-bold text-destructive">
                  {logs.filter(l => l.response_status >= 400).length}
                </p>
              </div>
              <div className="bg-blue-500/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
                <p className="text-2xl font-bold text-blue-600">
                  {logs.length > 0 
                    ? Math.round(logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / logs.length)
                    : 0}ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por endpoint, método, tipo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">Carregando logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum log encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/50 cursor-pointer">
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(log.created_at), { 
                              addSuffix: true,
                              locale: ptBR 
                            })}
                          </div>
                          <div className="text-muted-foreground text-[10px] mt-1">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(log.metadata)}</TableCell>
                        <TableCell className="font-mono text-sm">{log.endpoint}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.method}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.response_status)}</TableCell>
                        <TableCell className="font-mono">
                          {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openLogDetails(log)}
                          >
                            <FileCode className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Log</DialogTitle>
              <DialogDescription>
                Informações completas da requisição e resposta
              </DialogDescription>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Timestamp</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedLog.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Duração</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedLog.duration_ms}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Método</p>
                    <p className="text-sm text-muted-foreground">{selectedLog.method}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    {getStatusBadge(selectedLog.response_status)}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Endpoint</p>
                  <code className="block bg-muted p-2 rounded text-xs">
                    {selectedLog.endpoint}
                  </code>
                </div>

                {selectedLog.metadata && (
                  <div>
                    <p className="text-sm font-medium mb-2">Metadata</p>
                    <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.request_body && (
                  <div>
                    <p className="text-sm font-medium mb-2">Request Body</p>
                    <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.request_body, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.response_body && (
                  <div>
                    <p className="text-sm font-medium mb-2">Response Body</p>
                    <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.response_body, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.error_message && (
                  <div>
                    <p className="text-sm font-medium mb-2 text-destructive">Mensagem de Erro</p>
                    <div className="bg-destructive/10 p-4 rounded text-sm">
                      {selectedLog.error_message}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
