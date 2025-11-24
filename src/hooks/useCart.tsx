import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { triggerCartAnimation } from "./useCartAnimation";

type CartItem = Tables<"cart_items"> & {
  products: Tables<"products">;
};

const CART_CACHE_KEY = "applehub_cart_cache";

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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCartItems([]);
        setLoading(false);
        clearCartCache();
        return;
      }

      // Carrega do cache primeiro para UI instantânea
      const cachedItems = loadCartFromCache(user.id);
      if (cachedItems && cachedItems.length > 0) {
        setCartItems(cachedItems);
        setLoading(false);
      }

      // Busca dados atualizados do Supabase
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
        .eq("user_id", user.id);

      if (error) throw error;
      
      const freshItems = data as CartItem[];
      setCartItems(freshItems);
      
      // Salva no cache
      saveCartToCache(freshItems, user.id);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar carrinho",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId: string, quantidade: number = 1) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Faça login",
          description: "Você precisa estar logado para adicionar ao carrinho",
          variant: "destructive",
        });
        return false;
      }

      // Verifica se já existe no carrinho
      const existingItem = cartItems.find(item => item.product_id === productId);

      // Update otimista - atualiza UI imediatamente
      toast({
        title: "✓ Adicionado!",
        duration: 1500,
      });

      // Trigger animação do carrinho
      triggerCartAnimation();

      if (existingItem) {
        // Update otimista da quantidade
        setCartItems(prev => 
          prev.map(item => 
            item.id === existingItem.id 
              ? { ...item, quantidade: item.quantidade + quantidade }
              : item
          )
        );

        // Atualiza no banco em background
        supabase
          .from("cart_items")
          .update({ quantidade: existingItem.quantidade + quantidade })
          .eq("id", existingItem.id)
          .then(({ error }) => {
            if (error) {
              console.error("Erro ao atualizar:", error);
              fetchCart(); // Reverte em caso de erro
            }
          });
      } else {
        // Buscar produto para update otimista
        const { data: product } = await supabase
          .from("products")
          .select("id, nome, preco_vista, imagens, estado, estoque, capacidade, cor")
          .eq("id", productId)
          .single();

        if (product) {
          // Update otimista - adiciona imediatamente na UI
          const tempItem: CartItem = {
            id: `temp-${Date.now()}`,
            user_id: user.id,
            product_id: productId,
            quantidade,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            products: product as any,
          };
          
          setCartItems(prev => [...prev, tempItem]);

          // Inserir no banco em background
          supabase
            .from("cart_items")
            .insert({
              user_id: user.id,
              product_id: productId,
              quantidade,
            })
            .select()
            .single()
            .then(({ data, error }) => {
              if (error) {
                console.error("Erro ao inserir:", error);
                fetchCart(); // Reverte em caso de erro
              } else if (data) {
                // Substituir item temporário pelo item real
                setCartItems(prev => 
                  prev.map(item => 
                    item.id === tempItem.id ? { ...item, id: data.id } : item
                  )
                );
              }
            });
        }
      }
      
      return true;
    } catch (error: any) {
      // Recarregar em caso de erro
      await fetchCart();
      
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
      
      return false;
    }
  };

  const updateQuantity = async (cartItemId: string, newQuantidade: number) => {
    try {
      if (newQuantidade <= 0) {
        await removeFromCart(cartItemId);
        return;
      }

      // Update otimista
      setCartItems(prev =>
        prev.map(item =>
          item.id === cartItemId ? { ...item, quantidade: newQuantidade } : item
        )
      );

      // Atualiza no banco
      const { error } = await supabase
        .from("cart_items")
        .update({ quantidade: newQuantidade })
        .eq("id", cartItemId);

      if (error) throw error;
    } catch (error: any) {
      // Reverte em caso de erro
      await fetchCart();
      
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    try {
      // Update otimista
      setCartItems(prev => prev.filter(item => item.id !== cartItemId));

      toast({
        title: "✓ Removido",
        duration: 2000,
      });

      // Remove no banco
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);

      if (error) throw error;
    } catch (error: any) {
      // Reverte em caso de erro
      await fetchCart();
      
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const clearCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setCartItems([]);
      clearCartCache();
      
      toast({
        title: "Carrinho limpo",
        description: "Todos os produtos foram removidos",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao limpar carrinho",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (Number(item.products.preco_vista) * item.quantidade);
    }, 0);
  };

  const getItemCount = () => {
    return cartItems.reduce((count, item) => count + item.quantidade, 0);
  };

  useEffect(() => {
    fetchCart();
    
    // Realtime apenas para sync entre dispositivos (não para updates otimistas)
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const channel = supabase
        .channel('cart-sync')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'cart_items',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            setCartItems(prev => 
              prev.map(item => 
                item.id === payload.new.id 
                  ? { ...item, quantidade: payload.new.quantidade }
                  : item
              )
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'cart_items',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            setCartItems(prev => prev.filter(item => item.id !== payload.old.id));
          }
        )
        .subscribe();
      
      return channel;
    };
    
    let channelCleanup: any = null;
    setupRealtimeSubscription().then(channel => {
      channelCleanup = channel;
    });
    
    return () => {
      if (channelCleanup) {
        supabase.removeChannel(channelCleanup);
      }
    };
  }, []);

  // Salva no cache sempre que o carrinho mudar
  useEffect(() => {
    const saveCache = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && cartItems.length >= 0) {
        saveCartToCache(cartItems, user.id);
      }
    };
    
    saveCache();
  }, [cartItems]);

  // Sincroniza entre abas/janelas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CART_CACHE_KEY && e.newValue) {
        try {
          const cacheData = JSON.parse(e.newValue);
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && cacheData.userId === user.id) {
              setCartItems(cacheData.items);
            }
          });
        } catch (error) {
          console.error("Erro ao sincronizar carrinho entre abas:", error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
