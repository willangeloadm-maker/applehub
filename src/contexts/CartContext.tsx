import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { triggerCartAnimation } from "@/hooks/useCartAnimation";

type CartItem = Tables<"cart_items"> & {
  products: Tables<"products">;
};

const CART_CACHE_KEY = "applehub_cart_cache";
const OFFLINE_QUEUE_KEY = "applehub_cart_offline_queue";

let cachedUserId: string | null = null;

type OfflineOperation = {
  id: string;
  type: 'add' | 'update' | 'remove' | 'clear';
  data: any;
  timestamp: number;
};

interface CartContextType {
  cartItems: CartItem[];
  loading: boolean;
  addToCart: (productId: string, quantidade?: number) => Promise<boolean>;
  updateQuantity: (cartItemId: string, newQuantidade: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotal: () => number;
  getItemCount: () => number;
  refetch: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Offline queue helpers
const saveOfflineOperation = (operation: OfflineOperation) => {
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    queue.push(operation);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Erro ao salvar operação offline:", error);
  }
};

const getOfflineQueue = (): OfflineOperation[] => {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch (error) {
    console.error("Erro ao ler fila offline:", error);
    return [];
  }
};

const clearOfflineQueue = () => {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (error) {
    console.error("Erro ao limpar fila offline:", error);
  }
};

// Cache helpers
const saveCartToCache = (items: CartItem[], userId: string) => {
  try {
    const cacheData = {
      items,
      userId,
      timestamp: Date.now(),
    };
    localStorage.setItem(CART_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Erro ao salvar cache do carrinho:", error);
  }
};

const loadCartFromCache = (userId: string): CartItem[] | null => {
  try {
    const cached = localStorage.getItem(CART_CACHE_KEY);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    
    const cacheAge = Date.now() - cacheData.timestamp;
    const maxAge = 24 * 60 * 60 * 1000;
    
    if (cacheAge < maxAge && cacheData.userId === userId) {
      return cacheData.items;
    }
    
    return null;
  } catch (error) {
    console.error("Erro ao carregar cache do carrinho:", error);
    return null;
  }
};

const clearCartCache = () => {
  try {
    localStorage.removeItem(CART_CACHE_KEY);
  } catch (error) {
    console.error("Erro ao limpar cache do carrinho:", error);
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const session = localStorage.getItem('sb-slwpupadtakrnaqzluqc-auth-token');
    if (!session) return [];
    
    try {
      const parsed = JSON.parse(session);
      const userId = parsed?.user?.id;
      if (userId) {
        cachedUserId = userId;
        return loadCartFromCache(userId) || [];
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  const getUserId = useCallback(async () => {
    if (cachedUserId) return cachedUserId;
    
    try {
      const { data: { user }, error } = await Promise.race([
        supabase.auth.getUser(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]) as any;
      
      if (error) throw error;
      if (user) cachedUserId = user.id;
      return cachedUserId;
    } catch (error) {
      console.error("❌ Erro ao obter userId:", error);
      return null;
    }
  }, []);

  const fetchCart = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const userId = await getUserId();
      if (!userId) {
        console.log("⚠️ fetchCart: Usuário não autenticado");
        setCartItems([]);
        clearCartCache();
        if (!silent) setLoading(false);
        return;
      }

      console.log("🛒 Buscando carrinho para userId:", userId);

      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          user_id,
          product_id,
          quantidade,
          created_at,
          updated_at,
          products (
            id,
            nome,
            preco_vista,
            imagens,
            estado,
            estoque,
            capacidade,
            cor
          )
        `)
        .eq("user_id", userId);

      if (error) {
        console.error("❌ Erro ao buscar carrinho:", error);
        throw error;
      }
      
      const freshItems = data as CartItem[];
      console.log(`✅ Carrinho carregado: ${freshItems.length} itens`);
      setCartItems(freshItems);
      saveCartToCache(freshItems, userId);
    } catch (error: any) {
      console.error("❌ Erro fatal ao carregar carrinho:", error);
      // Não limpar o carrinho em caso de erro de rede
      if (!error.message?.includes('Failed to fetch')) {
        setCartItems([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [getUserId]);

  const addToCart = useCallback(async (productId: string, quantidade: number = 1) => {
    try {
      const userId = await getUserId();
      if (!userId) {
        console.log("❌ addToCart: Usuário não autenticado");
        toast({
          title: "Faça login",
          description: "Você precisa estar logado para adicionar ao carrinho",
          variant: "destructive",
        });
        return false;
      }

      console.log(`➕ Adicionando produto ${productId} ao carrinho (qty: ${quantidade})`);

      const existingItem = cartItems.find(item => item.product_id === productId);

      toast({ title: "✓ Adicionado!", duration: 1000 });
      triggerCartAnimation();

      if (!isOnline) {
        saveOfflineOperation({
          id: `${Date.now()}-add`,
          type: 'add',
          data: { productId, quantidade },
          timestamp: Date.now(),
        });
        return true;
      }

      if (existingItem) {
        const newQty = existingItem.quantidade + quantidade;
        console.log(`📝 Atualizando item existente para qty: ${newQty}`);
        setCartItems(prev => 
          prev.map(item => 
            item.id === existingItem.id ? { ...item, quantidade: newQty } : item
          )
        );

        supabase
          .from("cart_items")
          .update({ quantidade: newQty })
          .eq("id", existingItem.id)
          .then(({ error }) => {
            if (error) {
              console.error("❌ Erro ao atualizar item existente:", error);
              fetchCart(true);
            } else {
              console.log("✅ Item atualizado no banco");
            }
          });
      } else {
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("id, nome, preco_vista, imagens, estado, estoque, capacidade, cor")
          .eq("id", productId)
          .single();

        if (productError) {
          console.error("❌ Erro ao buscar produto:", productError);
          throw productError;
        }

        if (product) {
          const tempItem: CartItem = {
            id: `temp-${Date.now()}`,
            user_id: userId,
            product_id: productId,
            quantidade,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            products: product as any,
          };
          
          console.log("📦 Adicionando item temporário ao estado local");
          setCartItems(prev => [...prev, tempItem]);

          supabase
            .from("cart_items")
            .insert({ user_id: userId, product_id: productId, quantidade })
            .select(`
              id,
              user_id,
              product_id,
              quantidade,
              created_at,
              updated_at
            `)
            .single()
            .then(({ data, error }) => {
              if (error) {
                console.error("❌ Erro ao inserir no banco:", error);
                fetchCart(true);
              } else if (data) {
                console.log("✅ Item inserido no banco com id:", data.id);
                setCartItems(prev => 
                  prev.map(item => item.id === tempItem.id ? { ...item, id: data.id } : item)
                );
              }
            });
        }
      }
      
      return true;
    } catch (error: any) {
      console.error("❌ Erro fatal ao adicionar ao carrinho:", error);
      await fetchCart(true);
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  }, [cartItems, getUserId, isOnline, toast, fetchCart]);

  const updateQuantity = useCallback(async (cartItemId: string, newQuantidade: number) => {
    if (newQuantidade <= 0) {
      await removeFromCart(cartItemId);
      return;
    }

    setCartItems(prev =>
      prev.map(item =>
        item.id === cartItemId ? { ...item, quantidade: newQuantidade } : item
      )
    );

    if (!isOnline) {
      saveOfflineOperation({
        id: `${Date.now()}-update`,
        type: 'update',
        data: { cartItemId, newQuantidade },
        timestamp: Date.now(),
      });
      return;
    }

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantidade: newQuantidade })
        .eq("id", cartItemId);

      if (error) {
        console.error("Erro ao atualizar:", error);
        fetchCart(true);
      }
    }, 500);
  }, [isOnline, fetchCart]);

  const removeFromCart = useCallback(async (cartItemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== cartItemId));
    toast({ title: "✓ Removido", duration: 1000 });

    if (!isOnline) {
      saveOfflineOperation({
        id: `${Date.now()}-remove`,
        type: 'remove',
        data: { cartItemId },
        timestamp: Date.now(),
      });
      return;
    }

    supabase
      .from("cart_items")
      .delete()
      .eq("id", cartItemId)
      .then(({ error }) => {
        if (error) {
          console.error("Erro ao remover:", error);
          fetchCart(true);
        }
      });
  }, [isOnline, toast, fetchCart]);

  const clearCart = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;

    setCartItems([]);
    clearCartCache();

    if (!isOnline) {
      saveOfflineOperation({
        id: `${Date.now()}-clear`,
        type: 'clear',
        data: { userId },
        timestamp: Date.now(),
      });
      return;
    }

    supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) console.error("Erro ao limpar:", error);
        else toast({ title: "Carrinho limpo" });
      });
  }, [getUserId, isOnline, toast]);

  const getTotal = useCallback(() => {
    return cartItems.reduce((total, item) => {
      return total + (Number(item.products.preco_vista) * item.quantidade);
    }, 0);
  }, [cartItems]);

  const getItemCount = useCallback(() => {
    return cartItems.reduce((count, item) => count + item.quantidade, 0);
  }, [cartItems]);

  const processOfflineQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    console.log(`Sincronizando ${queue.length} operações offline...`);
    
    for (const operation of queue) {
      try {
        switch (operation.type) {
          case 'add':
            await addToCart(operation.data.productId, operation.data.quantidade);
            break;
          case 'update':
            await updateQuantity(operation.data.cartItemId, operation.data.newQuantidade);
            break;
          case 'remove':
            await removeFromCart(operation.data.cartItemId);
            break;
          case 'clear':
            await clearCart();
            break;
        }
      } catch (error) {
        console.error("Erro ao processar operação offline:", error);
      }
    }

    clearOfflineQueue();
    await fetchCart(true);
    
    toast({
      title: "✓ Carrinho sincronizado",
      description: "Suas alterações offline foram salvas",
      duration: 3000,
    });
  }, [addToCart, updateQuantity, removeFromCart, clearCart, fetchCart, toast]);

  // Monitora conexão online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Modo offline",
        description: "Suas alterações serão sincronizadas quando voltar online",
        duration: 3000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processOfflineQueue, toast]);

  // Fetch inicial
  useEffect(() => {
    fetchCart();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CART_CACHE_KEY) fetchCart(true);
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchCart]);

  // Realtime subscription separada que depende do userId
  useEffect(() => {
    if (!cachedUserId) {
      console.log("⚠️ Subscription ignorada: usuário não autenticado");
      return;
    }

    console.log("🔄 Criando subscription do carrinho para userId:", cachedUserId);

    const channel = supabase
      .channel('cart_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${cachedUserId}`,
        },
        (payload) => {
          console.log("📦 Mudança no carrinho detectada:", payload.eventType);
          fetchCart(true);
        }
      )
      .subscribe((status) => {
        console.log("🔌 Status da subscription:", status);
      });

    return () => {
      console.log("🔌 Removendo subscription do carrinho");
      supabase.removeChannel(channel);
    };
  }, [fetchCart]);

  // Salva cache quando cartItems mudar
  useEffect(() => {
    if (cachedUserId && cartItems.length >= 0) {
      saveCartToCache(cartItems, cachedUserId);
    }
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getTotal,
        getItemCount,
        refetch: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart deve ser usado dentro de CartProvider");
  }
  return context;
};
