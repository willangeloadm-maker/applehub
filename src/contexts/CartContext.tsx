import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { triggerCartAnimation } from "@/hooks/useCartAnimation";

type Product = {
  id: string;
  nome: string;
  preco_vista: number;
  imagens: string[];
  estado: string;
  estoque: number;
  capacidade: string | null;
  cor: string | null;
};

type CartItem = {
  id: string;
  user_id: string | null;
  product_id: string;
  quantidade: number;
  created_at: string;
  updated_at: string;
  products: Product;
};

const LOCAL_CART_KEY = "applehub_local_cart";
const CART_CACHE_KEY = "applehub_cart_cache";

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
  syncLocalCartToUser: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Local cart helpers
const getLocalCart = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(LOCAL_CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveLocalCart = (items: CartItem[]) => {
  try {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Erro ao salvar carrinho local:", error);
  }
};

const clearLocalCart = () => {
  try {
    localStorage.removeItem(LOCAL_CART_KEY);
  } catch (error) {
    console.error("Erro ao limpar carrinho local:", error);
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  // Check auth state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id || null;
      setUserId(newUserId);
      
      // Se usuário logou, sincronizar carrinho local
      if (event === 'SIGNED_IN' && newUserId) {
        setTimeout(() => {
          syncLocalCartToUser();
        }, 500);
      }
      
      // Se usuário deslogou, carregar carrinho local
      if (event === 'SIGNED_OUT') {
        const localItems = getLocalCart();
        setCartItems(localItems);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch cart based on auth state
  const fetchCart = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      if (userId) {
        // Usuário logado: buscar do banco
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
        setCartItems((data as CartItem[]) || []);
      } else {
        // Usuário não logado: usar localStorage
        const localItems = getLocalCart();
        setCartItems(localItems);
      }
    } catch (error) {
      console.error("Erro ao carregar carrinho:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId]);

  // Fetch when userId changes
  useEffect(() => {
    fetchCart(true);
  }, [userId, fetchCart]);

  // Sync local cart to database when user logs in
  const syncLocalCartToUser = useCallback(async () => {
    const localItems = getLocalCart();
    if (localItems.length === 0) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    console.log("🔄 Sincronizando carrinho local com o banco...");
    
    try {
      for (const item of localItems) {
        // Verificar se já existe no carrinho do banco
        const { data: existing } = await supabase
          .from("cart_items")
          .select("id, quantidade")
          .eq("user_id", user.id)
          .eq("product_id", item.product_id)
          .maybeSingle();

        if (existing) {
          // Atualizar quantidade
          await supabase
            .from("cart_items")
            .update({ quantidade: existing.quantidade + item.quantidade })
            .eq("id", existing.id);
        } else {
          // Inserir novo item
          await supabase
            .from("cart_items")
            .insert({
              user_id: user.id,
              product_id: item.product_id,
              quantidade: item.quantidade,
            });
        }
      }

      // Limpar carrinho local após sync
      clearLocalCart();
      
      // Recarregar carrinho do banco
      await fetchCart(true);
      
      toast({
        title: "✓ Carrinho sincronizado",
        description: "Seus itens foram adicionados ao carrinho",
        duration: 2000,
      });
    } catch (error) {
      console.error("Erro ao sincronizar carrinho:", error);
    }
  }, [fetchCart, toast]);

  const addToCart = useCallback(async (productId: string, quantidade: number = 1) => {
    try {
      // Buscar dados do produto primeiro
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, nome, preco_vista, imagens, estado, estoque, capacidade, cor")
        .eq("id", productId)
        .single();

      if (productError || !product) {
        toast({
          title: "Erro",
          description: "Produto não encontrado",
          variant: "destructive",
        });
        return false;
      }

      toast({ title: "✓ Adicionado!", duration: 1000 });
      triggerCartAnimation();

      if (userId) {
        // Usuário logado: salvar no banco
        const existingItem = cartItems.find(item => item.product_id === productId);

        if (existingItem) {
          const newQty = existingItem.quantidade + quantidade;
          setCartItems(prev => 
            prev.map(item => 
              item.id === existingItem.id ? { ...item, quantidade: newQty } : item
            )
          );

          await supabase
            .from("cart_items")
            .update({ quantidade: newQty })
            .eq("id", existingItem.id);
        } else {
          const tempId = `temp-${Date.now()}`;
          const tempItem: CartItem = {
            id: tempId,
            user_id: userId,
            product_id: productId,
            quantidade,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            products: product as Product,
          };
          
          setCartItems(prev => [...prev, tempItem]);

          const { data: insertedItem, error: insertError } = await supabase
            .from("cart_items")
            .insert({ user_id: userId, product_id: productId, quantidade })
            .select("id, user_id, product_id, quantidade, created_at, updated_at")
            .single();

          if (insertError) {
            console.error("Erro ao inserir item:", insertError);
            fetchCart(true);
          } else if (insertedItem) {
            setCartItems(prev => 
              prev.map(item => 
                item.id === tempId 
                  ? { ...insertedItem, products: product } as CartItem
                  : item
              )
            );
          }
        }
      } else {
        // Usuário não logado: salvar no localStorage
        const localItems = getLocalCart();
        const existingIndex = localItems.findIndex(item => item.product_id === productId);

        if (existingIndex >= 0) {
          localItems[existingIndex].quantidade += quantidade;
        } else {
          const newItem: CartItem = {
            id: `local-${Date.now()}`,
            user_id: null,
            product_id: productId,
            quantidade,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            products: product as Product,
          };
          localItems.push(newItem);
        }

        saveLocalCart(localItems);
        setCartItems(localItems);
      }
      
      return true;
    } catch (error: any) {
      console.error("Erro ao adicionar ao carrinho:", error);
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  }, [cartItems, userId, toast, fetchCart]);

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

    if (userId) {
      // Usuário logado: debounce e salvar no banco
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
    } else {
      // Usuário não logado: atualizar localStorage
      const localItems = getLocalCart();
      const updated = localItems.map(item =>
        item.id === cartItemId ? { ...item, quantidade: newQuantidade } : item
      );
      saveLocalCart(updated);
    }
  }, [userId, fetchCart]);

  const removeFromCart = useCallback(async (cartItemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== cartItemId));
    toast({ title: "✓ Removido", duration: 1000 });

    if (userId) {
      // Usuário logado: remover do banco
      await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);
    } else {
      // Usuário não logado: remover do localStorage
      const localItems = getLocalCart();
      const updated = localItems.filter(item => item.id !== cartItemId);
      saveLocalCart(updated);
    }
  }, [userId, toast]);

  const clearCart = useCallback(async () => {
    setCartItems([]);

    if (userId) {
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);
    }
    
    clearLocalCart();
    toast({ title: "Carrinho limpo" });
  }, [userId, toast]);

  const getTotal = useCallback(() => {
    return cartItems.reduce((total, item) => {
      return total + (Number(item.products.preco_vista) * item.quantidade);
    }, 0);
  }, [cartItems]);

  const getItemCount = useCallback(() => {
    return cartItems.reduce((count, item) => count + item.quantidade, 0);
  }, [cartItems]);

  // Realtime subscription for logged users
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`cart_realtime_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchCart(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchCart]);

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
        syncLocalCartToUser,
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
