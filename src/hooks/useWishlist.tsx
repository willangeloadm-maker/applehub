import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Product {
  id: string;
  nome: string;
  preco_vista: number;
  imagens: string[];
  estado: string;
}

interface WishlistItem {
  id: string;
  product_id: string;
  products: Product;
}

export const useWishlist = () => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setWishlist([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('id, product_id, products(id, nome, preco_vista, imagens, estado)')
        .eq('user_id', user.id);

      if (error) throw error;
      setWishlist(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar favoritos:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (productId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Atenção",
          description: "Faça login para adicionar favoritos",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, product_id: productId });

      if (error) throw error;

      toast({
        description: "Produto adicionado aos favoritos",
      });
      
      fetchWishlist();
    } catch (error: any) {
      if (error.code === '23505') {
        toast({
          description: "Produto já está nos favoritos",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao adicionar favorito",
          variant: "destructive"
        });
      }
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;

      toast({
        description: "Produto removido dos favoritos",
      });
      
      fetchWishlist();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao remover favorito",
        variant: "destructive"
      });
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some(item => item.product_id === productId);
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  return {
    wishlist,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist
  };
};
