import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

export default function AdminLogin() {
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Buscar a senha do admin no banco
      const { data, error } = await supabase
        .from("admin_settings")
        .select("senha")
        .single();

      if (error) throw error;

      if (data.senha === senha) {
        // Salvar no localStorage que está logado como admin
        localStorage.setItem("admin_authenticated", "true");
        
        toast({
          title: "Acesso concedido",
          description: "Bem-vindo ao painel administrativo",
        });
        
        navigate("/admin");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Acesso Administrativo</CardTitle>
          <CardDescription>
            Digite a senha de administrador para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Senha de administrador"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                disabled={loading}
                className="text-center text-lg tracking-wider"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Verificando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
