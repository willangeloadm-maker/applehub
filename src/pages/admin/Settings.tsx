import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function AdminSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    max_parcelas: 24,
    juros_mensal: 0,
    valor_minimo_parcelar: 100,
    ativo: true
  });

  useEffect(() => {
    checkAdminAndLoadSettings();
  }, []);

  const checkAdminAndLoadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        navigate('/');
        return;
      }

      loadSettings();
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
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

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Configurações de Parcelamento</h1>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
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
                  Salvar Configurações
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
