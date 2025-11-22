import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const INACTIVITY_TIME = 15 * 60 * 1000; // 15 minutos em milissegundos
const WARNING_TIME = 2 * 60 * 1000; // 2 minutos antes de deslogar

export function useAdminInactivity() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const warningShownRef = useRef(false);

  const logout = useCallback(() => {
    localStorage.removeItem("admin_authenticated");
    toast({
      title: "Sessão encerrada",
      description: "Você foi desconectado por inatividade",
      variant: "destructive",
    });
    navigate("/");
  }, [navigate, toast]);

  const showWarning = useCallback(() => {
    if (!warningShownRef.current) {
      warningShownRef.current = true;
      toast({
        title: "Atenção",
        description: "Você será desconectado em 2 minutos por inatividade",
        variant: "default",
      });
    }
  }, [toast]);

  const resetTimer = useCallback(() => {
    warningShownRef.current = false;

    // Limpar timeouts anteriores
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Definir novo timeout para warning
    warningTimeoutRef.current = setTimeout(() => {
      showWarning();
    }, INACTIVITY_TIME - WARNING_TIME);

    // Definir novo timeout para logout
    timeoutRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIME);
  }, [logout, showWarning]);

  useEffect(() => {
    // Eventos que resetam o timer
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    // Adicionar listeners
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    // Iniciar timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [resetTimer]);

  return { resetTimer };
}
