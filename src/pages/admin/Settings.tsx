import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdminSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    max_parcelas: 24,
    juros_mensal: 0,
    valor_minimo_parcelar: 100,
    ativo: true
  });
  const [paymentSettings, setPaymentSettings] = useState({
    recipient_id: '',
    secret_key: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'connected' | 'disconnected' | 'not_configured' | 'checking';
    recipientName?: string;
  }>({ status: 'not_configured' });

  useEffect(() => {
    loadSettings();
    loadPaymentSettings();
  }, []);

  const checkConnection = async (recipientId?: string, secretKey?: string) => {
    const rid = recipientId || paymentSettings.recipient_id;
    const skey = secretKey || paymentSettings.secret_key;
    
    if (!rid || !skey) {
      setConnectionStatus({ status: 'not_configured' });
      return;
    }

    setConnectionStatus({ status: 'checking' });

    try {
      const response = await fetch(`https://api.pagar.me/core/v5/recipients/${rid}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(skey + ':')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus({
          status: 'connected',
          recipientName: data.name || data.id
        });
      } else {
        setConnectionStatus({ status: 'disconnected' });
      }
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
      setConnectionStatus({ status: 'disconnected' });
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('installment_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          max_parcelas: data.max_parcelas,
          juros_mensal: data.juros_mensal,
          valor_minimo_parcelar: data.valor_minimo_parcelar,
          ativo: data.ativo
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-payment-settings', {
        body: { admin_password: 'Ar102030' }
      });

      if (error) {
        console.error('Erro ao buscar configurações:', error);
        return;
      }
      
      if (data?.data) {
        const recipientId = data.data.recipient_id;
        const secretKey = data.data.secret_key;
        
        setPaymentSettings({
          recipient_id: recipientId,
          secret_key: secretKey
        });
        
        // Verificar conexão com as credenciais carregadas
        setTimeout(() => {
          checkConnection(recipientId, secretKey);
        }, 500);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de pagamento:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: existing } = await supabase
        .from('installment_settings')
        .select('id')
        .single();

      const settingsData = {
        max_parcelas: settings.max_parcelas,
        juros_mensal: settings.juros_mensal,
        valor_minimo_parcelar: settings.valor_minimo_parcelar,
        ativo: settings.ativo
      };

      if (existing) {
        const { error } = await supabase
          .from('installment_settings')
          .update(settingsData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('installment_settings')
          .insert([settingsData]);

        if (error) throw error;
      }

      toast({ description: "Configurações salvas com sucesso" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive"
      });
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      toast({ 
        description: "Validando credenciais...",
      });

      const { data, error } = await supabase.functions.invoke('save-payment-settings', {
        body: {
          recipient_id: paymentSettings.recipient_id,
          secret_key: paymentSettings.secret_key,
          admin_password: 'Ar102030'
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({ 
        title: "✓ Sucesso",
        description: "Credenciais validadas e salvas com sucesso",
      });
      
      // Verificar conexão imediatamente com as credenciais salvas
      await checkConnection(paymentSettings.recipient_id, paymentSettings.secret_key);
      
      // Recarregar as configurações em background
      loadPaymentSettings();
    } catch (error) {
      console.error('Erro ao salvar configurações da API:', error);
      toast({
        title: "Erro na validação",
        description: error instanceof Error ? error.message : "Erro ao salvar configurações da API",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (confirmText !== 'LIMPAR TUDO') {
      toast({
        title: "Erro",
        description: "Digite 'LIMPAR TUDO' para confirmar",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('clear-all-data', {
        body: { admin_password: 'Ar102030' }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Sucesso",
        description: "Todos os dados foram apagados com sucesso"
      });

      setDeleteDialogOpen(false);
      setConfirmText('');
    } catch (error) {
      console.error('Erro ao apagar dados:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao apagar dados",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold mb-6">Configurações de API</h1>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Configurações Pagar.me</CardTitle>
                  {connectionStatus.status === 'connected' && (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  )}
                  {connectionStatus.status === 'disconnected' && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Desconectado
                    </Badge>
                  )}
                  {connectionStatus.status === 'checking' && (
                    <Badge variant="secondary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Verificando...
                    </Badge>
                  )}
                  {connectionStatus.status === 'not_configured' && (
                    <Badge variant="outline">
                      Não configurado
                    </Badge>
                  )}
                </div>
                {connectionStatus.status === 'connected' && connectionStatus.recipientName && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Recipient: <span className="font-medium">{connectionStatus.recipientName}</span>
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  <div>
                    <Label>ID do Recebedor (Recipient ID)</Label>
                    <Input
                      type="text"
                      value={paymentSettings.recipient_id}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, recipient_id: e.target.value })}
                      required
                      placeholder="re_..."
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      ID do recebedor obtido no dashboard da Pagar.me
                    </p>
                  </div>

                  <div>
                    <Label>Secret Key</Label>
                    <Input
                      type="text"
                      value={paymentSettings.secret_key}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, secret_key: e.target.value })}
                      required
                      placeholder="sk_..."
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Chave secreta da API Pagar.me (Secret Key)
                    </p>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                    <p className="font-medium">📌 URL do Webhook:</p>
                    <code className="block bg-background p-2 rounded text-xs break-all">
                      https://slwpupadtakrnaqzluqc.supabase.co/functions/v1/pagarme-webhook
                    </code>
                    <p className="text-muted-foreground text-xs mt-2">
                      Configure esta URL no dashboard da Pagar.me em Configurações → Webhooks
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => checkConnection()}
                      disabled={!paymentSettings.recipient_id || !paymentSettings.secret_key || connectionStatus.status === 'checking'}
                      className="flex-1"
                    >
                      {connectionStatus.status === 'checking' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testando...
                        </>
                      ) : (
                        'Testar Conexão'
                      )}
                    </Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? 'Validando credenciais...' : 'Salvar Configurações'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>


            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Zona de Perigo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Esta ação é irreversível e apagará todos os dados de usuários, pedidos, transações, análises de crédito, verificações e tentativas de pagamento. 
                  <strong> Os produtos serão mantidos.</strong>
                </p>
                
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Apagar Todos os Dados
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-4">
                        <p>
                          Esta ação irá apagar <strong>permanentemente</strong>:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Todos os usuários e perfis</li>
                          <li>Todos os pedidos e itens de pedido</li>
                          <li>Todas as transações e pagamentos</li>
                          <li>Todas as análises de crédito</li>
                          <li>Todas as verificações de conta</li>
                          <li>Todas as tentativas de pagamento com cartão</li>
                          <li>Todos os itens do carrinho</li>
                          <li>Todos os favoritos</li>
                          <li>Todo o histórico de status de pedidos</li>
                        </ul>
                        <p className="font-bold text-destructive">
                          Os produtos NÃO serão apagados.
                        </p>
                        <div className="mt-4">
                          <Label htmlFor="confirm">
                            Digite <strong>LIMPAR TUDO</strong> para confirmar:
                          </Label>
                          <Input
                            id="confirm"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="LIMPAR TUDO"
                            className="mt-2"
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setConfirmText('')}>
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAllData}
                        disabled={isDeleting || confirmText !== 'LIMPAR TUDO'}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {isDeleting ? 'Apagando...' : 'Sim, apagar tudo'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}