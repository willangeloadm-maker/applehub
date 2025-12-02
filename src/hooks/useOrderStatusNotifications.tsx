import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  em_analise: "Em Análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  pagamento_confirmado: "Pagamento Confirmado",
  em_separacao: "Em Separação",
  em_transporte: "Em Transporte",
  entregue: "Entregue",
  cancelado: "Cancelado",
  pedido_enviado: "Pedido Enviado",
  pedido_entregue: "Pedido Entregue",
  entrega_nao_realizada: "Entrega Não Realizada",
};

export const useOrderStatusNotifications = () => {
  const { toast } = useToast();
  const hasRequestedPermission = useRef(false);

  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (hasRequestedPermission.current) return;
      hasRequestedPermission.current = true;

      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    };

    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('order-status-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newStatus = payload.new.status;
            const oldStatus = payload.old?.status;
            const orderNumber = payload.new.numero_pedido;

            if (newStatus !== oldStatus) {
              const statusLabel = statusLabels[newStatus] || newStatus;
              
              // Show toast notification
              toast({
                title: `Pedido #${orderNumber}`,
                description: `Status atualizado: ${statusLabel}`,
              });

              // Show browser push notification
              if ("Notification" in window && Notification.permission === "granted") {
                try {
                  new Notification(`AppleHub - Pedido #${orderNumber}`, {
                    body: `Status atualizado para: ${statusLabel}`,
                    icon: "/favicon.ico",
                    tag: `order-${payload.new.id}`,
                  });
                } catch (e) {
                  console.log("Push notification not supported");
                }
              }

              // Play notification sound
              try {
                const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2DgIF7dXBsdH2FiYZ/dXJ3f4aIhXtzb3B0foSGg312cXF3f4SFgnh0cXR9hIaCd3JxdH2EhYF2c3F0fYSFgnZzcnR9g4WCdnNydH2EhYJ2c3J0fYOEgnZ0cXV+hISCdnRydn6EhIJ3dHJ2foODgnZ0cXV+hISCdnRydn6EhIJ2c3J1foSEgnZ0cnZ+g4SCdnRxdX6EhIN3dHJ2foODgnZ0cXV+hISCdnRydn6EhIJ2c3J1foSEgnZ0cnZ+g4SCdnRxdX6EhIN3dHJ2foODgnZ0cXV+hIQ=");
                audio.volume = 0.3;
                audio.play().catch(() => {});
              } catch (e) {}
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [toast]);
};
