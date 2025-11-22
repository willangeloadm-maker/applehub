import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminInactivity } from "@/hooks/useAdminInactivity";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  
  // Hook de inatividade automática
  useAdminInactivity();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("admin_authenticated") === "true";
    
    if (!isAuthenticated) {
      navigate("/admin/login");
    } else {
      setIsChecking(false);
    }
  }, [navigate]);

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

  return <>{children}</>;
}
