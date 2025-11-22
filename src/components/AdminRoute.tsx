import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
