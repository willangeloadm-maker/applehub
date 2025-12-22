import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { CheckCircle2, XCircle, Mail, Apple, Eye, EyeOff, Shield, AlertCircle, Lock, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const loginSchema = z.object({
  cpf: z.string().min(11, "CPF inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const signupSchema = z.object({
  nome_completo: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido (use formato: 000.000.000-00)"),
  telefone: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Telefone inválido (use formato: (00) 00000-0000)"),
  data_nascimento: z.string(),
  cep: z.string().regex(/^\d{5}-\d{3}$/, "CEP inválido (use formato: 00000-000)"),
  rua: z.string().min(3, "Rua é obrigatória"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(2, "Bairro é obrigatório"),
  cidade: z.string().min(2, "Cidade é obrigatória"),
  estado: z.string().length(2, "Use a sigla do estado (ex: SP)"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [loginMethod, setLoginMethod] = useState<"cpf" | "email" | "telefone">("cpf");
  const [addressData, setAddressData] = useState({
    rua: "",
    bairro: "",
    cidade: "",
    estado: "",
  });
  const [loadingCep, setLoadingCep] = useState(false);
  const [cpfValid, setCpfValid] = useState<boolean | null>(null);
  const [telefoneValid, setTelefoneValid] = useState<boolean | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupPassword, setSignupPassword] = useState("");

  // Função para calcular força da senha
  const calculatePasswordStrength = useCallback((password: string) => {
    if (!password) return { score: 0, label: '', color: '', suggestions: [] };
    
    let score = 0;
    const suggestions: string[] = [];
    
    // Comprimento
    if (password.length >= 8) score += 20;
    else suggestions.push("Use no mínimo 8 caracteres");
    
    if (password.length >= 12) score += 10;
    
    // Letras minúsculas
    if (/[a-z]/.test(password)) score += 15;
    else suggestions.push("Adicione letras minúsculas");
    
    // Letras maiúsculas
    if (/[A-Z]/.test(password)) score += 15;
    else suggestions.push("Adicione letras maiúsculas");
    
    // Números
    if (/\d/.test(password)) score += 15;
    else suggestions.push("Adicione números");
    
    // Caracteres especiais
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
    else suggestions.push("Adicione caracteres especiais (!@#$%...)");
    
    // Variedade de caracteres
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.7) score += 10;
    
    // Determinar nível
    let label = '';
    let color = '';
    
    if (score < 40) {
      label = 'Muito fraca';
      color = 'bg-red-500';
    } else if (score < 60) {
      label = 'Fraca';
      color = 'bg-orange-500';
    } else if (score < 80) {
      label = 'Média';
      color = 'bg-yellow-500';
    } else {
      label = 'Forte';
      color = 'bg-green-500';
    }
    
    return { score, label, color, suggestions };
  }, []);

  const passwordStrength = useMemo(
    () => calculatePasswordStrength(signupPassword),
    [signupPassword, calculatePasswordStrength]
  );

  const validateCpf = (cpf: string): boolean => {
    const numbers = cpf.replace(/\D/g, "");
    if (numbers.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(numbers)) return false;
    
    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numbers.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(numbers.charAt(9))) return false;
    
    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numbers.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(numbers.charAt(10))) return false;
    
    return true;
  };

  const validateTelefone = (telefone: string): boolean => {
    const numbers = telefone.replace(/\D/g, "");
    return numbers.length === 11;
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    e.target.value = formatted;
    
    const cep = formatted.replace(/\D/g, "");
    
    if (cep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setAddressData({
            rua: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            estado: data.uf,
          });
        } else {
          toast({
            title: "CEP não encontrado",
            description: "Verifique o CEP digitado",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Erro ao buscar CEP",
          description: "Tente novamente mais tarde",
          variant: "destructive",
        });
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    let email = "";

    try {
      if (loginMethod === "email") {
        // Login direto com email
        email = formData.get("identifier") as string;
      } else if (loginMethod === "cpf") {
        // Buscar email pelo CPF usando função RPC
        const identifierValue = formData.get("identifier") as string;
        const cpfSemFormatacao = identifierValue.replace(/\D/g, "");
        
        console.log("🔍 [LOGIN CPF] Valor digitado:", identifierValue);
        console.log("🔍 [LOGIN CPF] CPF sem formatação:", cpfSemFormatacao);
        console.log("🔍 [LOGIN CPF] Tamanho do CPF:", cpfSemFormatacao.length);
        
        if (cpfSemFormatacao.length !== 11) {
          throw new Error("CPF deve ter 11 dígitos");
        }

        // Buscar email usando função RPC (contorna RLS)
        const { data: emailData, error: emailError } = await supabase
          .rpc('get_user_email_by_cpf', { user_cpf: cpfSemFormatacao });
        
        console.log("📧 [LOGIN CPF] Email response:", { emailData, error: emailError });
        
        if (emailError) {
          console.error("❌ [LOGIN CPF] Erro ao buscar email:", emailError);
          throw new Error("Erro ao buscar CPF: " + emailError.message);
        }
        
        if (!emailData) {
          console.error("❌ [LOGIN CPF] CPF não encontrado no banco");
          throw new Error("CPF não encontrado. Verifique se está cadastrado.");
        }
        
        console.log("✅ [LOGIN CPF] Email encontrado:", emailData);
        email = emailData as string;
      } else if (loginMethod === "telefone") {
        // Buscar email pelo telefone usando função RPC
        const identifierValue = formData.get("identifier") as string;
        const telefoneSemFormatacao = identifierValue.replace(/\D/g, "");
        
        console.log("🔍 [LOGIN TELEFONE] Valor digitado:", identifierValue);
        console.log("🔍 [LOGIN TELEFONE] Telefone sem formatação:", telefoneSemFormatacao);

        // Buscar email usando função RPC (contorna RLS)
        const { data: emailData, error: emailError } = await supabase
          .rpc('get_user_email_by_phone', { user_phone: telefoneSemFormatacao });
        
        console.log("📧 [LOGIN TELEFONE] Email response:", { emailData, error: emailError });
        
        if (emailError) {
          console.error("❌ [LOGIN TELEFONE] Erro ao buscar email:", emailError);
          throw new Error("Erro ao buscar telefone: " + emailError.message);
        }
        
        if (!emailData) {
          console.error("❌ [LOGIN TELEFONE] Telefone não encontrado");
          throw new Error("Telefone não encontrado. Verifique se está cadastrado.");
        }
        
        console.log("✅ [LOGIN TELEFONE] Email encontrado:", emailData);
        email = emailData as string;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("🔐 [LOGIN] Tentando autenticação com email:", email);

      if (error) {
        console.error("❌ [LOGIN] Erro na autenticação:", error);
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Credenciais inválidas. Verifique sua senha.");
        }
        throw error;
      }

      console.log("✅ [LOGIN] Autenticação bem-sucedida");

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta",
      });

      navigate(redirectTo);
    } catch (error: any) {
      console.error("Erro no login:", error);
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast({
        title: "Email obrigatório",
        description: "Digite seu email para recuperar a senha",
        variant: "destructive",
      });
      return;
    }

    setLoadingReset(true);
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: { 
          email: resetEmail,
          redirectTo: `${window.location.origin}/auth/reset-password`
        },
      });

      if (error) throw error;

      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha",
      });
      
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        title: "Erro ao enviar email",
        description: error.message || "Não foi possível enviar o email de recuperação",
        variant: "destructive",
      });
    } finally {
      setLoadingReset(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      nome_completo: formData.get("nome_completo") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
      cpf: formData.get("cpf") as string,
      telefone: formData.get("telefone") as string,
      data_nascimento: formData.get("data_nascimento") as string,
      cep: formData.get("cep") as string,
      rua: formData.get("rua") as string,
      numero: formData.get("numero") as string,
      complemento: formData.get("complemento") as string,
      bairro: formData.get("bairro") as string,
      cidade: formData.get("cidade") as string,
      estado: formData.get("estado") as string,
    };

    try {
      signupSchema.parse(data);

      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nome_completo: data.nome_completo,
            cpf: data.cpf.replace(/\D/g, ""),
            telefone: data.telefone.replace(/\D/g, ""),
            data_nascimento: data.data_nascimento,
            cep: data.cep.replace(/\D/g, ""),
            rua: data.rua,
            numero: data.numero,
            complemento: data.complemento,
            bairro: data.bairro,
            cidade: data.cidade,
            estado: data.estado.toUpperCase(),
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast({
        title: "Conta criada!",
        description: "Você já pode fazer login",
      });

      navigate(redirectTo);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        let errorMessage = error.message;
        
        // Mensagens de erro mais amigáveis
        if (error.message?.includes("User already registered")) {
          errorMessage = "Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.";
        } else if (error.message?.includes("duplicate key")) {
          errorMessage = "CPF ou e-mail já cadastrado. Tente fazer login.";
        }
        
        toast({
          title: "Erro ao criar conta",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#1e3a52] to-[#6b3d3d] overflow-y-auto">
      <div className="w-full max-w-md my-8">
        {/* Botão Voltar */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4 text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para início
        </Button>

        {/* Logo */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#ff6b35] to-[#ff4757] mb-3 sm:mb-4 shadow-xl">
            <Apple className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">AppleHub</h1>
          <p className="text-gray-300 text-xs sm:text-sm">Entre na sua conta</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 bg-white/10 backdrop-blur-sm p-1">
            <TabsTrigger 
              value="login" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#ff6b35] data-[state=active]:to-[#ff4757] data-[state=active]:text-white text-sm"
            >
              Entrar
            </TabsTrigger>
            <TabsTrigger 
              value="signup" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#ff6b35] data-[state=active]:to-[#ff4757] data-[state=active]:text-white text-sm"
            >
              Cadastrar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-0">
            <Card className="border-0 bg-white/10 backdrop-blur-md shadow-xl">
              <CardHeader className="space-y-1 pb-3 sm:pb-4">
                <CardTitle className="text-lg sm:text-xl text-white">Login</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-300">
                  Escolha como deseja entrar
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-3 sm:space-y-4">
                  {/* Método de Login */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Entrar com</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant={loginMethod === "cpf" ? "default" : "outline"}
                        onClick={() => setLoginMethod("cpf")}
                        className={loginMethod === "cpf" 
                          ? "bg-gradient-to-r from-[#ff6b35] to-[#ff4757] text-white border-0" 
                          : "bg-white/5 border-white/20 text-white hover:bg-white/10"
                        }
                      >
                        CPF
                      </Button>
                      <Button
                        type="button"
                        variant={loginMethod === "email" ? "default" : "outline"}
                        onClick={() => setLoginMethod("email")}
                        className={loginMethod === "email" 
                          ? "bg-gradient-to-r from-[#ff6b35] to-[#ff4757] text-white border-0" 
                          : "bg-white/5 border-white/20 text-white hover:bg-white/10"
                        }
                      >
                        Email
                      </Button>
                      <Button
                        type="button"
                        variant={loginMethod === "telefone" ? "default" : "outline"}
                        onClick={() => setLoginMethod("telefone")}
                        className={loginMethod === "telefone" 
                          ? "bg-gradient-to-r from-[#ff6b35] to-[#ff4757] text-white border-0" 
                          : "bg-white/5 border-white/20 text-white hover:bg-white/10"
                        }
                      >
                        Telefone
                      </Button>
                    </div>
                  </div>

                  {/* Campo de identificação */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="identifier" className="text-white text-sm">
                      {loginMethod === "cpf" && "CPF"}
                      {loginMethod === "email" && "E-mail"}
                      {loginMethod === "telefone" && "Telefone"}
                    </Label>
                    <div className="relative">
                      <Input
                        id="identifier"
                        name="identifier"
                        placeholder={
                          loginMethod === "cpf" ? "000.000.000-00" :
                          loginMethod === "email" ? "seu@email.com" :
                          "(00) 00000-0000"
                        }
                        required
                        maxLength={loginMethod === "cpf" ? 14 : loginMethod === "telefone" ? 15 : undefined}
                        onChange={(e) => {
                          if (loginMethod === "cpf") {
                            e.target.value = formatCpf(e.target.value);
                            const isValid = validateCpf(e.target.value);
                            setCpfValid(e.target.value.replace(/\D/g, "").length === 11 ? isValid : null);
                          } else if (loginMethod === "telefone") {
                            e.target.value = formatTelefone(e.target.value);
                            const isValid = validateTelefone(e.target.value);
                            setTelefoneValid(e.target.value.replace(/\D/g, "").length === 11 ? isValid : null);
                          }
                        }}
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11 pr-10"
                      />
                      {loginMethod === "cpf" && cpfValid !== null && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {cpfValid ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}
                      {loginMethod === "telefone" && telefoneValid !== null && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {telefoneValid ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="login-password" className="text-white text-sm">Senha</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        name="password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="Digite sua senha"
                        required
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-[#ff6b35] to-[#ff4757] hover:from-[#ff5722] hover:to-[#ff3545] text-white font-semibold shadow-lg h-11 sm:h-12 text-sm sm:text-base" 
                    disabled={loading}
                  >
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>

                  {/* Esqueci minha senha */}
                  <div className="text-center">
                    <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="text-xs sm:text-sm text-gray-300 hover:text-[#ff6b35] underline"
                        >
                          Esqueci minha senha
                        </button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#1e3a52] border-white/20">
                        <DialogHeader>
                          <DialogTitle className="text-white">Recuperar senha</DialogTitle>
                          <DialogDescription className="text-gray-300">
                            Digite seu email para receber as instruções de recuperação
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="reset-email" className="text-white">Email</Label>
                            <Input
                              id="reset-email"
                              type="email"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              placeholder="seu@email.com"
                              className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                            />
                          </div>
                          <Button
                            onClick={handleForgotPassword}
                            disabled={loadingReset}
                            className="w-full bg-gradient-to-r from-[#ff6b35] to-[#ff4757] hover:from-[#ff5722] hover:to-[#ff3545]"
                          >
                            {loadingReset ? "Enviando..." : "Enviar email"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <p className="text-center text-xs sm:text-sm text-gray-300 pt-2">
                    Não tem uma conta?{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("signup")}
                      className="text-[#ff6b35] hover:text-[#ff5722] font-semibold"
                    >
                      Cadastre-se
                    </button>
                  </p>
                </CardContent>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="signup" className="mt-0">
            <Card className="border-0 bg-white/10 backdrop-blur-md shadow-xl">
              <CardHeader className="space-y-1 pb-3 sm:pb-4">
                <CardTitle className="text-lg sm:text-xl text-white">Criar conta</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-300">
                  Preencha seus dados abaixo
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-3 sm:space-y-4 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="nome_completo" className="text-white text-sm">Nome completo *</Label>
                    <Input 
                      id="nome_completo" 
                      name="nome_completo" 
                      required 
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="signup-email" className="text-white text-sm">E-mail *</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      required
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11"
                    />
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="signup-password" className="text-white text-sm flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Senha *
                      </Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          name="password"
                          type={showSignupPassword ? "text" : "password"}
                          placeholder="••••••"
                          required
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          {showSignupPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      
                      {/* Indicador de força da senha */}
                      {signupPassword && (
                        <div className="space-y-2 animate-fade-in mt-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {passwordStrength.score < 60 ? (
                                <AlertCircle className="w-4 h-4 text-orange-400" />
                              ) : (
                                <Shield className="w-4 h-4 text-green-400" />
                              )}
                              <span className="text-xs text-white font-medium">
                                Força: {passwordStrength.label}
                              </span>
                            </div>
                            <span className="text-xs text-gray-300">
                              {passwordStrength.score}%
                            </span>
                          </div>
                          
                          {/* Barra de progresso */}
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${passwordStrength.color} transition-all duration-500 ease-out rounded-full`}
                              style={{ width: `${passwordStrength.score}%` }}
                            />
                          </div>
                          
                          {/* Sugestões */}
                          {passwordStrength.suggestions.length > 0 && (
                            <div className="space-y-1 pt-1">
                              {passwordStrength.suggestions.slice(0, 3).map((suggestion, idx) => (
                                <div 
                                  key={idx}
                                  className="flex items-start gap-1.5 animate-fade-in"
                                  style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                  <div className="w-1 h-1 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                                  <span className="text-xs text-gray-300">{suggestion}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="confirmPassword" className="text-white text-sm">Confirmar senha *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••"
                          required
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="cpf" className="text-white text-sm">CPF *</Label>
                      <div className="relative">
                        <Input
                          id="cpf"
                          name="cpf"
                          placeholder="000.000.000-00"
                          required
                          maxLength={14}
                          onChange={(e) => {
                            const formatted = formatCpf(e.target.value);
                            e.target.value = formatted;
                            const isValid = validateCpf(formatted);
                            setCpfValid(formatted.length >= 14 ? isValid : null);
                          }}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11 pr-10"
                        />
                        {cpfValid !== null && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {cpfValid ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="telefone" className="text-white text-sm">Telefone *</Label>
                      <div className="relative">
                        <Input
                          id="telefone"
                          name="telefone"
                          placeholder="(00) 00000-0000"
                          required
                          maxLength={15}
                          onChange={(e) => {
                            const formatted = formatTelefone(e.target.value);
                            e.target.value = formatted;
                            const isValid = validateTelefone(formatted);
                            setTelefoneValid(formatted.length >= 15 ? isValid : null);
                          }}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11 pr-10"
                        />
                        {telefoneValid !== null && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {telefoneValid ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="data_nascimento" className="text-white text-sm">Data de nascimento *</Label>
                    <Input
                      id="data_nascimento"
                      name="data_nascimento"
                      type="date"
                      required
                      className="bg-white/5 border-white/20 text-white h-10 sm:h-11"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="cep" className="text-white text-sm">CEP *</Label>
                    <Input 
                      id="cep" 
                      name="cep" 
                      placeholder="00000-000" 
                      required
                      maxLength={9}
                      onChange={handleCepChange}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="rua" className="text-white text-sm">Rua *</Label>
                    <Input 
                      id="rua" 
                      name="rua" 
                      value={addressData.rua}
                      onChange={(e) => setAddressData({...addressData, rua: e.target.value})}
                      required 
                      disabled={loadingCep}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11 disabled:opacity-50"
                    />
                  </div>

                  <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="numero" className="text-white text-sm">Número *</Label>
                      <Input 
                        id="numero" 
                        name="numero" 
                        required 
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="complemento" className="text-white text-sm">Complemento</Label>
                      <Input 
                        id="complemento" 
                        name="complemento" 
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="bairro" className="text-white text-sm">Bairro *</Label>
                    <Input 
                      id="bairro" 
                      name="bairro" 
                      value={addressData.bairro}
                      onChange={(e) => setAddressData({...addressData, bairro: e.target.value})}
                      required 
                      disabled={loadingCep}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11 disabled:opacity-50"
                    />
                  </div>

                  <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="cidade" className="text-white text-sm">Cidade *</Label>
                      <Input 
                        id="cidade" 
                        name="cidade" 
                        value={addressData.cidade}
                        onChange={(e) => setAddressData({...addressData, cidade: e.target.value})}
                        required 
                        disabled={loadingCep}
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="estado" className="text-white text-sm">Estado *</Label>
                      <Input
                        id="estado"
                        name="estado"
                        placeholder="SP"
                        maxLength={2}
                        value={addressData.estado}
                        onChange={(e) => setAddressData({...addressData, estado: e.target.value})}
                        required
                        disabled={loadingCep}
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-10 sm:h-11 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-[#ff6b35] to-[#ff4757] hover:from-[#ff5722] hover:to-[#ff3545] text-white font-semibold shadow-lg h-11 sm:h-12 text-sm sm:text-base mt-2" 
                    disabled={loading}
                  >
                    {loading ? "Criando..." : "Criar conta"}
                  </Button>
                </CardContent>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;