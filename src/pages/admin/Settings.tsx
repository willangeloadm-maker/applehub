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
import { Trash2 } from 'lucide-react';

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

  useEffect(() => {
    loadSettings();
    loadPaymentSettings();
  }, []);

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
        setPaymentSettings({
          recipient_id: data.data.recipient_id,
          secret_key: data.data.secret_key
        });
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

    try {
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

      toast({ description: "Configurações da API salvas com sucesso" });
      
      // Recarregar as configurações após salvar
      await loadPaymentSettings();
    } catch (error) {
      console.error('Erro ao salvar configurações da API:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar configurações da API",
        variant: "destructive"
      });
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
                <CardTitle>Configurações Pagar.me</CardTitle>
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

                  <Button type="submit" className="w-full">
                    Salvar Configurações
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Parcelamento AppleHub</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label>Máximo de Parcelas</Label>
                    <Input
                      type="number"
                      min="1"
                      max="48"
                      value={settings.max_parcelas}
                      onChange={(e) => setSettings({ ...settings, max_parcelas: parseInt(e.target.value) })}
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Número máximo de parcelas permitidas
                    </p>
                  </div>

                  <div>
                    <Label>Juros Mensal (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.juros_mensal}
                      onChange={(e) => setSettings({ ...settings, juros_mensal: parseFloat(e.target.value) })}
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Taxa de juros mensal aplicada no parcelamento
                    </p>
                  </div>

                  <div>
                    <Label>Valor Mínimo para Parcelar (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.valor_minimo_parcelar}
                      onChange={(e) => setSettings({ ...settings, valor_minimo_parcelar: parseFloat(e.target.value) })}
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Valor mínimo do pedido para permitir parcelamento
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={settings.ativo}
                      onChange={(e) => setSettings({ ...settings, ativo: e.target.checked })}
                    />
                    <Label htmlFor="ativo" className="cursor-pointer">
                      Sistema de parcelamento ativo
                    </Label>
                  </div>

                  <Button type="submit" className="w-full">
                    Salvar Regras de Parcelamento
                  </Button>
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