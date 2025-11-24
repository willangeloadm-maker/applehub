import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { triggerCartAnimation } from "./useCartAnimation";

type CartItem = Tables<"cart_items"> & {
  products: Tables<"products">;
};

const CART_CACHE_KEY = "applehub_cart_cache";
const OFFLINE_QUEUE_KEY = "applehub_cart_offline_queue";

// Cache de userId para evitar múltiplas chamadas getUser()
let cachedUserId: string | null = null;

type OfflineOperation = {
  id: string;
  type: 'add' | 'update' | 'remove' | 'clear';
  data: any;
  timestamp: number;
};

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
    
    // Cache válido por 24 horas e deve ser do mesmo usuário
    const cacheAge = Date.now() - cacheData.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
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

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    // Carrega cache imediatamente no estado inicial
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

  // Pega userId do cache ou session
  const getUserId = useCallback(async () => {
    if (cachedUserId) return cachedUserId;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) cachedUserId = user.id;
    return cachedUserId;
  }, []);

  const fetchCart = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const userId = await getUserId();
      if (!userId) {
        setCartItems([]);
        clearCartCache();
        return;
      }

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

      if (error) throw error;
      
      const freshItems = data as CartItem[];
      setCartItems(freshItems);
      saveCartToCache(freshItems, userId);
    } catch (error: any) {
      console.error("Erro ao carregar carrinho:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [getUserId]);

  const addToCart = useCallback(async (productId: string, quantidade: number = 1) => {
    try {
      const userId = await getUserId();
      if (!userId) {
        toast({
          title: "Faça login",
          description: "Você precisa estar logado para adicionar ao carrinho",
          variant: "destructive",
        });
        return false;
      }

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
            if (error) fetchCart(true);
          });
      } else {
        const { data: product } = await supabase
          .from("products")
          .select("id, nome, preco_vista, imagens, estado, estoque, capacidade, cor")
          .eq("id", productId)
          .single();

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
          
          setCartItems(prev => [...prev, tempItem]);

          supabase
            .from("cart_items")
            .insert({ user_id: userId, product_id: productId, quantidade })
            .select()
            .single()
            .then(({ data, error }) => {
              if (error) {
                fetchCart(true);
              } else if (data) {
                setCartItems(prev => 
                  prev.map(item => item.id === tempItem.id ? { ...item, id: data.id } : item)
                );
              }
            });
        }
      }
      
      return true;
    } catch (error: any) {
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

    // Debounce: aguarda 500ms antes de salvar no banco
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

  const getTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (Number(item.products.preco_vista) * item.quantidade);
    }, 0);
  };

  const getItemCount = () => {
    return cartItems.reduce((count, item) => count + item.quantidade, 0);
  };

  // Processa fila de operações offline
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

  // Fetch inicial e sync entre abas
  useEffect(() => {
    fetchCart();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CART_CACHE_KEY) fetchCart(true);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchCart]);

  // Salva cache quando cartItems mudar
  useEffect(() => {
    if (cachedUserId && cartItems.length >= 0) {
      saveCartToCache(cartItems, cachedUserId);
    }
  }, [cartItems]);

  return {
    cartItems,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotal,
    getItemCount,
    refetch: fetchCart,
  };
};
