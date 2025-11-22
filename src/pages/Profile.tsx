import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }
      
      setUser(user);
      await loadProfile(user.id);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, show welcome screen
  if (!user) {
    return (
      <AppLayout cartItemsCount={0}>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-gradient-to-br from-primary/10 to-accent/10">
            <CardContent className="p-8 text-center space-y-6">
              <div className="flex justify-center">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Bem-vindo à AppleHub!</h2>
                <p className="text-muted-foreground">
                  Faça login ou crie sua conta para acessar seu perfil
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => navigate("/auth")}
                >
                  Entrar
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                  onClick={() => navigate("/auth")}
                >
                  Criar conta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // User is logged in, show profile
  return (
    <AppLayout cartItemsCount={0}>
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meu Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome completo</p>
                    <p className="font-medium">{profile.nome_completo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CPF</p>
                    <p className="font-medium">{profile.cpf}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{profile.telefone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Endereço</p>
                    <p className="font-medium">
                      {profile.rua}, {profile.numero}
                      {profile.complemento && ` - ${profile.complemento}`}
                    </p>
                    <p className="font-medium">
                      {profile.bairro}, {profile.cidade} - {profile.estado}
                    </p>
                    <p className="font-medium">CEP: {profile.cep}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Carregando informações...</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
