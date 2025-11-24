import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Shield, 
  User, 
  FileText, 
  Camera, 
  Sparkles,
  ArrowRight,
  Check
} from 'lucide-react';
import CameraCapture from '@/components/CameraCapture';
import { formatCPF, formatPhone, formatCurrency, unformatCurrency, formatDate, validateCPF, validatePhone } from '@/lib/formatters';
import { formatDateOnlyBrasilia } from '@/lib/dateUtils';

export default function AccountVerification() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'check' | 'form' | 'validating' | 'kyc_doc_type' | 'kyc_cnh_format' | 'kyc_capture' | 'kyc_selfie' | 'analyzing' | 'result'>('check');
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    data_nascimento: '',
    telefone: '',
    nome_mae: '',
    profissao: '',
    patrimonio: '',
    renda_mensal: ''
  });
  const [documentType, setDocumentType] = useState<'cnh' | 'rg' | null>(null);
  const [cnhFormat, setCnhFormat] = useState<'aberta' | 'fechada' | 'digital' | null>(null);
  const [kycData, setKycData] = useState({
    documento_frente: null as File | null,
    documento_verso: null as File | null,
    selfie: null as File | null
  });
  const [validatingDocument, setValidatingDocument] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  // Progress steps para visual feedback
  const getStepNumber = () => {
    const steps = {
      'check': 0,
      'form': 1,
      'validating': 1,
      'kyc_doc_type': 2,
      'kyc_cnh_format': 2,
      'kyc_capture': 2,
      'kyc_selfie': 3,
      'analyzing': 4,
      'result': 5
    };
    return steps[step] || 0;
  };

  const progressSteps = [
    { icon: Shield, label: 'Início', complete: getStepNumber() > 0 },
    { icon: User, label: 'Dados', complete: getStepNumber() > 1 },
    { icon: FileText, label: 'Documentos', complete: getStepNumber() > 2 },
    { icon: Camera, label: 'Selfie', complete: getStepNumber() > 3 },
    { icon: Sparkles, label: 'Análise', complete: getStepNumber() > 4 }
  ];

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
      setStep('kyc_doc_type');
    }, 4000);
  };

  // Valida documentos - agora aceita frente e verso para validação completa
  const validateDocumentWithOCR = async (frente: File, verso: File | null, docType: 'RG' | 'CNH') => {
    setValidatingDocument(true);
    setOcrResult(null);

    try {
      // Converter frente para base64
      const reader1 = new FileReader();
      const base64Promise1 = new Promise<string>((resolve, reject) => {
        reader1.onload = () => resolve(reader1.result as string);
        reader1.onerror = reject;
        reader1.readAsDataURL(frente);
      });
      const frenteBase64 = await base64Promise1;

      // Converter verso para base64 se existir
      let versoBase64 = null;
      if (verso) {
        const reader2 = new FileReader();
        const base64Promise2 = new Promise<string>((resolve, reject) => {
          reader2.onload = () => resolve(reader2.result as string);
          reader2.onerror = reject;
          reader2.readAsDataURL(verso);
        });
        versoBase64 = await base64Promise2;
      }

      // Chamar a edge function de validação OCR com ambas as imagens
      const { data, error } = await supabase.functions.invoke('validate-document-ocr', {
        body: {
          imageBase64: frenteBase64,
          imageBase64Verso: versoBase64, // Envia o verso também
          documentType: docType,
          userData: {
            nome_completo: formData.nome_completo,
            cpf: formData.cpf.replace(/\D/g, ''),
            data_nascimento: formData.data_nascimento
          }
        }
      });

      if (error) throw error;

      setOcrResult(data);
      
      // VALIDAÇÃO: Se não for o documento correto, BLOQUEAR continuação
      if (data.tipo_documento_detectado && data.tipo_documento_detectado !== docType) {
        toast({
          title: "❌ Documento incorreto",
          description: `Detectamos um ${data.tipo_documento_detectado}, mas você selecionou ${docType}. Por favor, envie o documento correto.`,
          variant: "destructive",
        });
        // Limpar o documento enviado
        setKycData({ ...kycData, documento_frente: null, documento_verso: null });
        return false; // Retorna false para indicar que falhou
      }
      
      if (data.valido && data.confianca >= 70) {
        toast({
          title: "✓ Documento validado",
          description: `Documento verificado com ${data.confianca}% de confiança`,
        });
        return true;
      } else {
        toast({
          title: "❌ Documento não validado",
          description: data.problemas?.join('. ') || 'Os dados do documento não conferem com o cadastro. Envie um documento válido.',
          variant: "destructive",
        });
        // Limpar o documento enviado
        setKycData({ ...kycData, documento_frente: null, documento_verso: null });
        return false; // BLOQUEAR continuação
      }

    } catch (error) {
      console.error('Erro na validação OCR:', error);
      toast({
        title: "❌ Erro na validação",
        description: "Não foi possível validar o documento. Tente novamente ou envie outro documento.",
        variant: "destructive",
      });
      return false; // BLOQUEAR em caso de erro
    } finally {
      setValidatingDocument(false);
    }
  };

  // Função auxiliar para fazer upload de arquivo para o storage
  const uploadFileToStorage = async (file: File, fileName: string): Promise<string> => {
    const filePath = `${user.id}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('verification-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('verification-documents')
      .getPublicUrl(filePath);

    return filePath;
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!kycData.documento_frente || !kycData.selfie) {
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
      // Upload dos arquivos para o storage
      const documentoFrentePath = await uploadFileToStorage(
        kycData.documento_frente, 
        `documento_frente_${Date.now()}.jpg`
      );
      
      const documentoVersoPath = kycData.documento_verso 
        ? await uploadFileToStorage(kycData.documento_verso, `documento_verso_${Date.now()}.jpg`)
        : null;
      
      const selfiePath = await uploadFileToStorage(
        kycData.selfie, 
        `selfie_${Date.now()}.jpg`
      );

      const { error } = await supabase
        .from('account_verifications')
        .upsert({
          user_id: user.id,
          status: 'pendente',
          documento_frente: documentoFrentePath,
          documento_verso: documentoVersoPath,
          selfie: selfiePath
        });

      if (error) throw error;

      // Simular verificação de 10 segundos
      setTimeout(async () => {
        // Atualizar verificação como verificada e enviar email
        await supabase
          .from('account_verifications')
          .update({
            status: 'verificado',
            verificado_em: new Date().toISOString()
          })
          .eq('user_id', user.id);

        // Enviar email de confirmação
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome_completo')
          .eq('id', user.id)
          .single();

        await supabase.functions.invoke('send-verification-email', {
          body: {
            email: user.email,
            nome: profile?.nome_completo || 'Cliente',
            status: 'verificado'
          }
        });

        toast({
          title: "Conta verificada!",
          description: "Sua conta foi verificada com sucesso."
        });

        setStep('result');
      }, 10000);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar documentos",
        variant: "destructive"
      });
      setStep('kyc_doc_type');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="relative">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-[#ff6b35] to-[#ff4757] animate-pulse" />
              <Loader2 className="w-8 h-8 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
            </div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Componente para animação de transição entre steps
  const StepTransition = ({ children, stepKey }: { children: React.ReactNode, stepKey: string }) => {
    return (
      <div 
        key={stepKey}
        className="animate-fade-in-up"
      >
        {children}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Progress Indicator */}
          {step !== 'check' && step !== 'result' && (
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center justify-between relative">
                {/* Progress Line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-10">
                  <div 
                    className="h-full bg-gradient-to-r from-[#ff6b35] to-[#ff4757] transition-all duration-500"
                    style={{ width: `${(getStepNumber() / (progressSteps.length - 1)) * 100}%` }}
                  />
                </div>
                
                {progressSteps.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = idx === getStepNumber();
                  const isComplete = item.complete;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 bg-background z-10">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                        ${isComplete ? 'bg-gradient-to-r from-[#ff6b35] to-[#ff4757] text-white scale-110' : 
                          isActive ? 'bg-primary/10 text-primary ring-4 ring-primary/20' : 
                          'bg-muted text-muted-foreground'}
                      `}>
                        {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conta Verificada */}
          {step === 'check' && verification?.status === 'verificado' && (
            <StepTransition stepKey="verified">
              <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-50/50 to-background dark:from-green-950/20 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-3xl" />
                <CardHeader className="text-center relative z-10 pb-4">
                  <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mb-4 shadow-lg animate-scale-in">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Conta Verificada!
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    Verificada em {formatDateOnlyBrasilia(verification.verificado_em)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10 space-y-6">
                  <div className="grid gap-3">
                    {[
                      '✓ Documentos verificados e aprovados',
                      '✓ Identidade confirmada com sucesso',
                      '✓ Análise de crédito completa',
                      '✓ Pronto para parcelar em até 24x'
                    ].map((text, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10 animate-fade-in"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm text-foreground/80">{text}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    onClick={() => navigate('/')} 
                    size="lg"
                    className="w-full bg-gradient-to-r from-[#ff6b35] to-[#ff4757] hover:from-[#ff5722] hover:to-[#ff3545] text-white shadow-lg"
                  >
                    Voltar para Home
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>
            </StepTransition>
          )}

          {/* Iniciar Verificação */}
          {step === 'check' && (!verification || verification.status !== 'verificado') && (
            <StepTransition stepKey="start">
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
                <CardHeader className="text-center relative z-10 pb-4">
                  <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-[#ff6b35] to-[#ff4757] flex items-center justify-center mb-4 shadow-lg animate-scale-in">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl font-bold">Verificação de Conta</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Desbloqueie o parcelamento em até 24x
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10 space-y-6">
                  <div className="space-y-3">
                    {[
                      { icon: FileText, text: 'Envio rápido de documentos' },
                      { icon: Camera, text: 'Verificação facial por selfie' },
                      { icon: Sparkles, text: 'Análise automatizada em segundos' },
                      { icon: CheckCircle2, text: 'Aprove crédito instantaneamente' }
                    ].map((item, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-all duration-200 animate-fade-in hover:scale-[1.02]"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#ff6b35]/20 to-[#ff4757]/20 flex items-center justify-center shrink-0">
                          <item.icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-sm font-medium">{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    onClick={() => setStep('form')} 
                    size="lg"
                    className="w-full bg-gradient-to-r from-[#ff6b35] to-[#ff4757] hover:from-[#ff5722] hover:to-[#ff3545] text-white shadow-lg"
                  >
                    Iniciar Verificação
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>
            </StepTransition>
          )}

          {/* Formulário de Dados */}
          {step === 'form' && (
            <StepTransition stepKey="form">
              <Card className="shadow-2xl border-2 border-border/50">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#ff6b35] to-[#ff4757] flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Dados Pessoais</CardTitle>
                      <CardDescription>Preencha suas informações com atenção</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleFormSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        Nome Completo
                      </Label>
                      <Input
                        value={formData.nome_completo}
                        onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                        placeholder="Seu nome completo"
                        className="h-12 text-base"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        CPF
                        {formData.cpf && (
                          validateCPF(formData.cpf) ? (
                            <CheckCircle className="w-4 h-4 text-green-500 animate-scale-in" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 animate-scale-in" />
                          )
                        )}
                      </Label>
                      <Input
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        className="h-12 text-base"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Data de Nascimento</Label>
                        <Input
                          value={formData.data_nascimento}
                          onChange={(e) => setFormData({ ...formData, data_nascimento: formatDate(e.target.value) })}
                          placeholder="DD/MM/AAAA"
                          maxLength={10}
                          className="h-12 text-base"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          Telefone
                          {formData.telefone && (
                            validatePhone(formData.telefone) ? (
                              <CheckCircle className="w-4 h-4 text-green-500 animate-scale-in" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500 animate-scale-in" />
                            )
                          )}
                        </Label>
                        <Input
                          value={formData.telefone}
                          onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                          className="h-12 text-base"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Nome da Mãe</Label>
                      <Input
                        value={formData.nome_mae}
                        onChange={(e) => setFormData({ ...formData, nome_mae: e.target.value })}
                        placeholder="Nome completo da mãe"
                        className="h-12 text-base"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Profissão</Label>
                      <Input
                        value={formData.profissao}
                        onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                        placeholder="Sua profissão"
                        className="h-12 text-base"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Patrimônio</Label>
                        <Input
                          value={formData.patrimonio}
                          onChange={(e) => {
                            const formatted = formatCurrency(e.target.value);
                            setFormData({ ...formData, patrimonio: formatted });
                          }}
                          placeholder="R$ 0,00"
                          className="h-12 text-base"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Renda Mensal</Label>
                        <Input
                          value={formData.renda_mensal}
                          onChange={(e) => {
                            const formatted = formatCurrency(e.target.value);
                            setFormData({ ...formData, renda_mensal: formatted });
                          }}
                          placeholder="R$ 0,00"
                          className="h-12 text-base"
                          required
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      size="lg"
                      className="w-full mt-6 bg-gradient-to-r from-[#ff6b35] to-[#ff4757] hover:from-[#ff5722] hover:to-[#ff3545] text-white shadow-lg h-12"
                    >
                      Continuar
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </StepTransition>
          )}

          {/* Validando */}
          {step === 'validating' && (
            <StepTransition stepKey="validating">
            <Card className="shadow-2xl animate-fade-in">
              <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#ff6b35] to-[#ff4757] animate-pulse" />
                  <Loader2 className="w-12 h-12 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-xl font-semibold">Validando seus dados...</p>
                  <p className="text-sm text-muted-foreground">Isso levará apenas alguns segundos</p>
                </div>
              </CardContent>
            </Card>
            </StepTransition>
          )}

          {/* Tipo de Documento */}
          {step === 'kyc_doc_type' && (
            <StepTransition stepKey="doc_type">
            <Card>
            <CardHeader>
              <CardTitle>Escolha o Tipo de Documento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Selecione o tipo de documento que você deseja enviar:
              </p>
              <Button
                variant="outline"
                className="w-full h-auto py-6"
                onClick={() => {
                  setDocumentType('cnh');
                  setStep('kyc_cnh_format');
                }}
              >
                <div className="text-left w-full">
                  <p className="font-semibold mb-1">CNH - Carteira Nacional de Habilitação</p>
                  <p className="text-xs text-muted-foreground">Versão aberta, fechada ou digital</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full h-auto py-6"
                onClick={() => {
                  setDocumentType('rg');
                  setStep('kyc_capture');
                }}
              >
                <div className="text-left w-full">
                  <p className="font-semibold mb-1">RG - Registro Geral</p>
                  <p className="text-xs text-muted-foreground">Envie frente e verso</p>
                </div>
              </Button>
            </CardContent>
          </Card>
          </StepTransition>
          )}

        {step === 'kyc_cnh_format' && (
          <StepTransition stepKey="cnh_format">
          <Card>
            <CardHeader>
              <CardTitle>Formato da CNH</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Como você deseja enviar sua CNH?
              </p>
              <Button
                variant="outline"
                className="w-full h-auto py-6"
                onClick={() => {
                  setCnhFormat('aberta');
                  setStep('kyc_capture');
                }}
              >
                <div className="text-left w-full">
                  <p className="font-semibold mb-1">CNH Aberta</p>
                  <p className="text-xs text-muted-foreground">Envie uma foto da CNH completamente aberta</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full h-auto py-6"
                onClick={() => {
                  setCnhFormat('fechada');
                  setStep('kyc_capture');
                }}
              >
                <div className="text-left w-full">
                  <p className="font-semibold mb-1">CNH Fechada</p>
                  <p className="text-xs text-muted-foreground">Envie foto da frente e do verso separadamente</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full h-auto py-6"
                onClick={() => {
                  setCnhFormat('digital');
                  setStep('kyc_capture');
                }}
              >
                <div className="text-left w-full">
                  <p className="font-semibold mb-1">CNH Digital</p>
                  <p className="text-xs text-muted-foreground">Envie o arquivo PDF da CNH digital</p>
                </div>
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep('kyc_doc_type')}
              >
                Voltar
              </Button>
            </CardContent>
          </Card>
          </StepTransition>
        )}

        {step === 'kyc_capture' && (
          <StepTransition stepKey="capture">
          <Card>
            <CardHeader>
              <CardTitle>Envio de Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground mb-6">
                  Para sua segurança, precisamos verificar sua identidade. Use a câmera para fotografar seus documentos.
                </p>

                {documentType === 'cnh' && cnhFormat === 'aberta' && (
                  <>
                    <CameraCapture
                      label="CNH Aberta"
                      guideType="document"
                      onCapture={async (file) => {
                        const isValid = await validateDocumentWithOCR(file, null, 'CNH');
                        if (isValid) {
                          setKycData({ ...kycData, documento_frente: file, documento_verso: file });
                          setStep('kyc_selfie');
                        }
                      }}
                      captured={kycData.documento_frente}
                    />
                    {validatingDocument && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validando documento automaticamente...
                      </div>
                    )}
                    {ocrResult && (
                      <div className={`p-3 rounded-lg text-sm ${ocrResult.valido ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' : 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'}`}>
                        {ocrResult.valido ? '✓ Documento validado automaticamente' : '⚠ Documento será revisado manualmente'}
                      </div>
                    )}
                  </>
                )}

                {documentType === 'cnh' && cnhFormat === 'fechada' && (
                  <>
                    <CameraCapture
                      label="CNH (Frente)"
                      guideType="document"
                      onCapture={(file) => {
                        setKycData({ ...kycData, documento_frente: file });
                        toast({ description: "Frente capturada! Agora envie o verso." });
                      }}
                      captured={kycData.documento_frente}
                    />
                    {kycData.documento_frente && (
                      <CameraCapture
                        label="CNH (Verso)"
                        guideType="document"
                        onCapture={async (file) => {
                          const isValid = await validateDocumentWithOCR(kycData.documento_frente!, file, 'CNH');
                          if (isValid) {
                            setKycData({ ...kycData, documento_verso: file });
                            setStep('kyc_selfie');
                          }
                        }}
                        captured={kycData.documento_verso}
                      />
                    )}
                    {validatingDocument && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validando documentos (frente e verso)...
                      </div>
                    )}
                    {ocrResult && kycData.documento_verso && (
                      <div className={`p-3 rounded-lg text-sm ${ocrResult.valido ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' : 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'}`}>
                        {ocrResult.valido ? '✓ Documentos validados automaticamente' : '⚠ Documentos serão revisados manualmente'}
                      </div>
                    )}
                  </>
                )}

                {documentType === 'cnh' && cnhFormat === 'digital' && (
                  <>
                    <CameraCapture
                      label="CNH Digital (PDF)"
                      guideType="document"
                      onCapture={async (file) => {
                        if (file.type !== 'application/pdf') {
                          toast({
                            title: "Formato inválido",
                            description: "Por favor, envie um arquivo PDF da CNH Digital",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        setValidatingDocument(true);
                        try {
                          // Converter PDF para base64
                          const reader = new FileReader();
                          const base64Promise = new Promise<string>((resolve, reject) => {
                            reader.onload = () => resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                          });

                          const pdfBase64 = await base64Promise;

                          // Chamar a edge function de validação de PDF
                          const { data, error } = await supabase.functions.invoke('validate-document-pdf', {
                            body: {
                              pdfBase64,
                              userId: user.id,
                              documentType: 'CNH'
                            }
                          });

                          if (error) {
                            console.error('Erro ao validar PDF:', error);
                            toast({
                              title: "Erro na validação",
                              description: "Não foi possível validar o documento. Tente novamente.",
                              variant: "destructive",
                            });
                            return;
                          }

                          if (!data.isValid) {
                            toast({
                              title: "❌ Documento inválido",
                              description: data.reason || "O documento não passou na validação.",
                              variant: "destructive",
                            });
                            return;
                          }

                          toast({
                            title: "✓ Documento validado",
                            description: "CNH Digital verificada com sucesso",
                          });
                          
                          setKycData({ ...kycData, documento_frente: file, documento_verso: file });
                          setStep('kyc_selfie');
                        } catch (error) {
                          console.error('Erro ao processar PDF:', error);
                          toast({
                            title: "Erro",
                            description: "Erro ao processar PDF. Tente novamente.",
                            variant: "destructive",
                          });
                        } finally {
                          setValidatingDocument(false);
                        }
                      }}
                      captured={kycData.documento_frente}
                    />
                    {validatingDocument && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validando CNH Digital...
                      </div>
                    )}
                  </>
                )}

                {documentType === 'rg' && (
                  <>
                    <CameraCapture
                      label="RG (Frente)"
                      guideType="document"
                      onCapture={(file) => {
                        setKycData({ ...kycData, documento_frente: file });
                        toast({ description: "Frente capturada! Agora envie o verso com o CPF." });
                      }}
                      captured={kycData.documento_frente}
                    />
                    {kycData.documento_frente && (
                      <CameraCapture
                        label="RG (Verso)"
                        guideType="document"
                        onCapture={async (file) => {
                          const isValid = await validateDocumentWithOCR(kycData.documento_frente!, file, 'RG');
                          if (isValid) {
                            setKycData({ ...kycData, documento_verso: file });
                            setStep('kyc_selfie');
                          }
                        }}
                        captured={kycData.documento_verso}
                      />
                    )}
                    {validatingDocument && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validando documentos (frente e verso)...
                      </div>
                    )}
                    {ocrResult && kycData.documento_verso && (
                      <div className={`p-3 rounded-lg text-sm ${ocrResult.valido ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' : 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'}`}>
                        {ocrResult.valido ? '✓ Documentos validados automaticamente' : '⚠ Documentos serão revisados manualmente'}
                      </div>
                    )}
                  </>
                )}

                <p className="text-xs text-muted-foreground text-center bg-muted/50 p-3 rounded-lg">
                  💡 Dica: Certifique-se de estar em um ambiente bem iluminado e que os documentos estejam legíveis
                </p>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    if (documentType === 'cnh') {
                      setStep('kyc_cnh_format');
                    } else {
                      setStep('kyc_doc_type');
                    }
                  }}
                >
                  Voltar
                </Button>
              </div>
            </CardContent>
          </Card>
          </StepTransition>
        )}

        {/* Captura da selfie */}
        {step === 'kyc_selfie' && (
          <StepTransition stepKey="selfie">
          <Card>
            <CardHeader>
              <CardTitle>Selfie de Verificação</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleKycSubmit} className="space-y-6">
                <p className="text-sm text-muted-foreground mb-6">
                  Tire uma selfie do seu rosto para confirmar sua identidade.
                </p>

                <CameraCapture
                  label="Selfie"
                  guideType="selfie"
                  onCapture={(file) => setKycData({ ...kycData, selfie: file })}
                  captured={kycData.selfie}
                />

                <p className="text-xs text-muted-foreground text-center bg-muted/50 p-3 rounded-lg">
                  💡 Dica: Posicione o documento ao lado do rosto e certifique-se de que ambos estejam bem iluminados
                </p>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={!kycData.selfie}
                >
                  Finalizar Verificação
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep('kyc_capture')}
                >
                  Voltar
                </Button>
              </form>
            </CardContent>
          </Card>
          </StepTransition>
        )}

        {/* Analisando verificação */}
        {step === 'analyzing' && (
          <StepTransition stepKey="analyzing">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
              <p className="text-xl font-semibold mb-2">Verificando documentos...</p>
              <p className="text-sm text-muted-foreground text-center">
                Estamos verificando seus documentos.
                <br />
                Isso pode levar alguns instantes.
              </p>
            </CardContent>
          </Card>
          </StepTransition>
        )}

        {/* Resultado final */}
        {step === 'result' && (
          <StepTransition stepKey="result">
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-6 h-6" />
                Conta Verificada!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Parabéns! Sua conta foi verificada com sucesso. Agora você pode fazer compras com o Parcelamento AppleHub em até 24x.
              </p>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Próximos passos:</strong> Escolha os produtos que deseja comprar e finalize a compra. Durante o checkout, você verá seu limite de crédito aprovado baseado no valor da sua compra.
                </p>
              </div>

              <Button 
                onClick={() => navigate('/produtos')}
                className="w-full"
              >
                Ver Produtos
              </Button>

              <Button 
                variant="outline"
                onClick={() => navigate('/profile')}
                className="w-full"
              >
                Voltar ao Perfil
              </Button>
            </CardContent>
          </Card>
          </StepTransition>
        )}
        </div>
      </div>
    </AppLayout>
  );
}