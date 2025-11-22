import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ShoppingCart } from 'lucide-react';

export const useOrderNotifications = () => {
  const hasShownInitialOrders = useRef(false);

  useEffect(() => {
    // Marcar como inicializado após 2 segundos para evitar notificações de pedidos antigos
    const timer = setTimeout(() => {
      hasShownInitialOrders.current = true;
    }, 2000);

    const channel = supabase
      .channel('order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          // Só mostrar notificação para novos pedidos após a inicialização
          if (hasShownInitialOrders.current) {
            const order = payload.new as any;
            
            toast({
              title: '🎉 Novo Pedido Recebido!',
              description: (
                <div className="flex items-start gap-3 mt-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Pedido #{order.numero_pedido}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Valor: {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(order.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pagamento: {order.payment_type === 'pix' ? 'PIX' : 
                                 order.payment_type === 'cartao' ? 'Cartão' : 
                                 'Parcelamento AppleHub'}
                    </p>
                  </div>
                </div>
              ),
              duration: 8000,
            });

            // Tocar um som de notificação
            if (typeof Audio !== 'undefined') {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ4NYK/q8ahcFg1Mnubxv2wgBTKJ0vPXgy4HIXfH7+CWVA0QY7Ln8KVYEwtGnuDyvW4gBT');
              audio.volume = 0.3;
              audio.play().catch(() => {
                // Ignora erro se o navegador bloquear o som
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);
};
