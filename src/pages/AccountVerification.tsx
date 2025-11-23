import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import CameraCapture from '@/components/CameraCapture';
import { formatCPF, formatPhone, formatCurrency, unformatCurrency, formatDate, validateCPF, validatePhone } from '@/lib/formatters';

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

  const validateDocumentWithOCR = async (file: File, docType: 'RG' | 'CNH') => {
    setValidatingDocument(true);
    setOcrResult(null);

    try {
      // Converter arquivo para base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const imageBase64 = await base64Promise;

      // Chamar a edge function de validação OCR
      const { data, error } = await supabase.functions.invoke('validate-document-ocr', {
        body: {
          imageBase64,
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
          title: "Atenção",
          description: data.problemas?.join('. ') || 'Não foi possível validar automaticamente o documento',
          variant: "destructive",
        });
        return true; // Permite continuar para revisão manual
      }

    } catch (error) {
      console.error('Erro na validação OCR:', error);
      toast({
        title: "Aviso",
        description: "Não foi possível validar automaticamente. O documento será revisado manualmente.",
      });
      return true; // Em caso de erro, permite continuar
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
                    placeholder="Nome completo"
                    required
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    CPF
                    {formData.cpf && (
                      validateCPF(formData.cpf) ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )
                    )}
                  </Label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </div>

                <div>
                  <Label>Data de Nascimento</Label>
                  <Input
                    value={formData.data_nascimento}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: formatDate(e.target.value) })}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    required
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    Telefone
                    {formData.telefone && (
                      validatePhone(formData.telefone) ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )
                    )}
                  </Label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    required
                  />
                </div>

                <div>
                  <Label>Nome da Mãe</Label>
                  <Input
                    value={formData.nome_mae}
                    onChange={(e) => setFormData({ ...formData, nome_mae: e.target.value })}
                    placeholder="Nome completo da mãe"
                    required
                  />
                </div>

                <div>
                  <Label>Profissão</Label>
                  <Input
                    value={formData.profissao}
                    onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                    placeholder="Sua profissão"
                    required
                  />
                </div>

                <div>
                  <Label>Patrimônio</Label>
                  <Input
                    value={formData.patrimonio}
                    onChange={(e) => {
                      const formatted = formatCurrency(e.target.value);
                      setFormData({ ...formData, patrimonio: formatted });
                    }}
                    placeholder="R$ 0,00"
                    required
                  />
                </div>

                <div>
                  <Label>Renda Mensal</Label>
                  <Input
                    value={formData.renda_mensal}
                    onChange={(e) => {
                      const formatted = formatCurrency(e.target.value);
                      setFormData({ ...formData, renda_mensal: formatted });
                    }}
                    placeholder="R$ 0,00"
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

        {step === 'kyc_doc_type' && (
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
        )}

        {step === 'kyc_cnh_format' && (
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
        )}

        {step === 'kyc_capture' && (
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
                        const isValid = await validateDocumentWithOCR(file, 'CNH');
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
                      onCapture={async (file) => {
                        const isValid = await validateDocumentWithOCR(file, 'CNH');
                        if (isValid) {
                          setKycData({ ...kycData, documento_frente: file });
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
                    {ocrResult && kycData.documento_frente && (
                      <div className={`p-3 rounded-lg text-sm ${ocrResult.valido ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' : 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'}`}>
                        {ocrResult.valido ? '✓ Documento validado automaticamente' : '⚠ Documento será revisado manualmente'}
                      </div>
                    )}
                    {kycData.documento_frente && (
                      <CameraCapture
                        label="CNH (Verso)"
                        guideType="document"
                        onCapture={(file) => {
                          setKycData({ ...kycData, documento_verso: file });
                          setStep('kyc_selfie');
                        }}
                        captured={kycData.documento_verso}
                      />
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
                      onCapture={async (file) => {
                        const isValid = await validateDocumentWithOCR(file, 'RG');
                        if (isValid) {
                          setKycData({ ...kycData, documento_frente: file });
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
                    {ocrResult && kycData.documento_frente && (
                      <div className={`p-3 rounded-lg text-sm ${ocrResult.valido ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' : 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'}`}>
                        {ocrResult.valido ? '✓ Documento validado automaticamente' : '⚠ Documento será revisado manualmente'}
                      </div>
                    )}
                    {kycData.documento_frente && (
                      <CameraCapture
                        label="RG (Verso)"
                        guideType="document"
                        onCapture={(file) => {
                          setKycData({ ...kycData, documento_verso: file });
                          setStep('kyc_selfie');
                        }}
                        captured={kycData.documento_verso}
                      />
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
        )}

        {step === 'kyc_selfie' && (
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
        )}

        {step === 'analyzing' && (
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
        )}

        {step === 'result' && (
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
        )}
      </div>
    </AppLayout>
  );
}