import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type CartItem = Tables<"cart_items"> & {
  products: Tables<"products">;
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
        return;
      }

      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          *,
          products (*)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      setCartItems(data as CartItem[]);
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
        return;
      }

      // Verifica se já existe no carrinho
      const existingItem = cartItems.find(item => item.product_id === productId);

      if (existingItem) {
        await updateQuantity(existingItem.id, existingItem.quantidade + quantidade);
      } else {
        const { error } = await supabase
          .from("cart_items")
          .insert({
            user_id: user.id,
            product_id: productId,
            quantidade,
          });

        if (error) throw error;

        toast({
          title: "Produto adicionado!",
          description: "O produto foi adicionado ao carrinho",
        });

        await fetchCart();
      }
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateQuantity = async (cartItemId: string, newQuantidade: number) => {
    try {
      if (newQuantidade <= 0) {
        await removeFromCart(cartItemId);
        return;
      }

      const { error } = await supabase
        .from("cart_items")
        .update({ quantidade: newQuantidade })
        .eq("id", cartItemId);

      if (error) throw error;

      await fetchCart();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);

      if (error) throw error;

      toast({
        title: "Produto removido",
        description: "O produto foi removido do carrinho",
      });

      await fetchCart();
    } catch (error: any) {
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
