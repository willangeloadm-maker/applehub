import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Shield, KeyRound } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const authenticated = localStorage.getItem("admin_authenticated") === "true";
    setIsAuthenticated(authenticated);
    setIsChecking(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("senha")
        .single();

      if (error) throw error;

      if (data.senha === senha) {
        localStorage.setItem("admin_authenticated", "true");
        
        toast({
          title: "Acesso concedido",
          description: "Bem-vindo ao painel administrativo",
        });
        
        setIsAuthenticated(true);
      } else {
        toast({
          title: "Senha incorreta",
          description: "Tente novamente",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
        </div>

        <Card className="w-full max-w-md relative animate-fade-in shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-4 flex flex-col items-center pb-8 pt-10">
            <div className="relative mb-4">
              <div className="absolute inset-0 animate-ping opacity-20">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/50" />
              </div>
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg animate-scale-in">
                <Shield className="w-10 h-10 text-primary-foreground" strokeWidth={1.5} />
              </div>
            </div>
            
            <div className="space-y-2 text-center">
              <CardTitle className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                Painel Administrativo
              </CardTitle>
              <CardDescription className="text-base">
                Área restrita - Acesso controlado
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="pb-10">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <div className="relative group">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    type="password"
                    placeholder="Digite a senha administrativa"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-12 h-12 text-center text-lg tracking-widest bg-background/50 border-border/50 focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/20"
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Verificando acesso...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Acessar Painel
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border/30 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Shield className="w-3 h-3" />
                Sessão protegida e criptografada
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
