import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, Upload, Camera, Loader2 } from 'lucide-react';

export default function AccountVerification() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'check' | 'form' | 'validating' | 'kyc' | 'analyzing' | 'result'>('check');
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    telefone: '',
    data_nascimento: '',
    renda_mensal: ''
  });
  const [kycData, setKycData] = useState({
    documento_frente: null as File | null,
    documento_verso: null as File | null,
    selfie: null as File | null
  });
  const [creditResult, setCreditResult] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/auth');
        return;
      }

      setUser(authUser);

      const { data: verificationData } = await supabase
        .from('account_verifications')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      setVerification(verificationData);

      if (verificationData?.status === 'verificado') {
        setStep('check');
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('validating');

    // Simular validação de 4 segundos
    setTimeout(() => {
      toast({ description: "Dados validados com sucesso!" });
      setStep('kyc');
    }, 4000);
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!kycData.documento_frente || !kycData.documento_verso || !kycData.selfie) {
      toast({
        title: "Erro",
        description: "Por favor, envie todos os documentos necessários",
        variant: "destructive"
      });
      return;
    }

    setStep('analyzing');

    // Criar verificação no banco
    try {
      const { error } = await supabase
        .from('account_verifications')
        .upsert({
          user_id: user.id,
          status: 'pendente',
          documento_frente: 'uploaded',
          documento_verso: 'uploaded',
          selfie: 'uploaded'
        });

      if (error) throw error;

      // Simular análise de crédito de 10 segundos
      setTimeout(async () => {
        const result = {
          aprovado: true,
          percentual_aprovado: 90,
          valor_total: 10000,
          opcoes_entrada: [
            { percentual: 10, valor: 1000 },
            { percentual: 15, valor: 1500 },
            { percentual: 20, valor: 2000 },
            { percentual: 25, valor: 2500 }
          ]
        };

        setCreditResult(result);

        // Atualizar verificação como verificada
        await supabase
          .from('account_verifications')
          .update({
            status: 'verificado',
            verificado_em: new Date().toISOString()
          })
          .eq('user_id', user.id);

        setStep('result');
      }, 10000);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar documentos",
        variant: "destructive"
      });
      setStep('kyc');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-2xl">
        {step === 'check' && verification?.status === 'verificado' && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-6 h-6" />
                Conta Verificada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Sua conta foi verificada em {new Date(verification.verificado_em).toLocaleDateString('pt-BR')}
              </p>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✓ Documentos verificados
                  <br />
                  ✓ Identidade confirmada
                  <br />
                  ✓ Análise de crédito aprovada
                </p>
              </div>
              <Button onClick={() => navigate('/')} className="w-full mt-4">
                Voltar para Home
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'check' && (!verification || verification.status !== 'verificado') && (
          <Card>
            <CardHeader>
              <CardTitle>Verificação de Conta</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Para utilizar o parcelamento AppleHub em até 24x, você precisa verificar sua conta.
              </p>
              <Button onClick={() => setStep('form')} className="w-full">
                Iniciar Verificação
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'form' && (
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <Label>Nome Completo</Label>
                  <Input
                    value={formData.nome_completo}
                    onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Renda Mensal</Label>
                  <Input
                    type="number"
                    value={formData.renda_mensal}
                    onChange={(e) => setFormData({ ...formData, renda_mensal: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Continuar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'validating' && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Validando dados...</p>
              <p className="text-sm text-muted-foreground">Aguarde um momento</p>
            </CardContent>
          </Card>
        )}

        {step === 'kyc' && (
          <Card>
            <CardHeader>
              <CardTitle>Verificação de Identidade (KYC)</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleKycSubmit} className="space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Para sua segurança, precisamos verificar sua identidade. Envie fotos dos documentos solicitados.
                  </p>

                  <div className="border-2 border-dashed border-border rounded-lg p-6">
                    <Label className="flex items-center gap-2 mb-2">
                      <Upload className="w-4 h-4" />
                      Documento (Frente)
                    </Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setKycData({ ...kycData, documento_frente: e.target.files?.[0] || null })}
                      required
                    />
                  </div>

                  <div className="border-2 border-dashed border-border rounded-lg p-6">
                    <Label className="flex items-center gap-2 mb-2">
                      <Upload className="w-4 h-4" />
                      Documento (Verso)
                    </Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setKycData({ ...kycData, documento_verso: e.target.files?.[0] || null })}
                      required
                    />
                  </div>

                  <div className="border-2 border-dashed border-border rounded-lg p-6">
                    <Label className="flex items-center gap-2 mb-2">
                      <Camera className="w-4 h-4" />
                      Selfie com Documento
                    </Label>
                    <Input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={(e) => setKycData({ ...kycData, selfie: e.target.files?.[0] || null })}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Tire uma selfie segurando seu documento ao lado do rosto
                    </p>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Enviar Documentos
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'analyzing' && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
              <p className="text-xl font-semibold mb-2">Analisando crédito...</p>
              <p className="text-sm text-muted-foreground text-center">
                Estamos verificando seus documentos e analisando seu crédito.
                <br />
                Isso pode levar alguns instantes.
              </p>
            </CardContent>
          </Card>
        )}

        {step === 'result' && creditResult && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-6 h-6" />
                Crédito Aprovado!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">
                  Parabéns! Seu crédito foi aprovado com {creditResult.percentual_aprovado}% do valor solicitado.
                </p>
                <div className="text-2xl font-bold text-primary mb-4">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    creditResult.valor_total * (creditResult.percentual_aprovado / 100)
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <p className="font-medium">Escolha o valor de entrada:</p>
                {creditResult.opcoes_entrada.map((opcao: any) => (
                  <Button
                    key={opcao.percentual}
                    variant="outline"
                    className="w-full h-auto py-4"
                    onClick={() => navigate('/checkout', { state: { entrada: opcao } })}
                  >
                    <div className="text-left w-full">
                      <div className="font-semibold">{opcao.percentual}% de entrada</div>
                      <div className="text-sm text-muted-foreground">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(opcao.valor)}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}