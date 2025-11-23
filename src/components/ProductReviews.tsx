import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    nome_completo: string;
  };
}

interface ProductReviewsProps {
  productId: string;
}

export const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userPurchases, setUserPurchases] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    loadReviews();
    checkUserPurchases();
  }, [productId]);

  const loadReviews = async () => {
    try {
      // Buscar reviews
      const { data: reviewsData, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar perfis dos usuários que fizeram reviews
      if (reviewsData && reviewsData.length > 0) {
        const userIds = reviewsData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, nome_completo")
          .in("id", userIds);

        // Combinar reviews com perfis
        const reviewsWithProfiles = reviewsData.map(review => ({
          ...review,
          profiles: profilesData?.find(p => p.id === review.user_id)
        }));

        setReviews(reviewsWithProfiles);
      } else {
        setReviews([]);
      }
      
      // Verificar se o usuário já avaliou
      const { data: { user } } = await supabase.auth.getUser();
      if (user && reviewsData) {
        setHasReviewed(reviewsData.some(r => r.user_id === user.id));
      }
    } catch (error) {
      console.error("Erro ao carregar avaliações:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkUserPurchases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("order_items")
        .select("order_id, orders!inner(status)")
        .eq("product_id", productId)
        .eq("orders.user_id", user.id)
        .in("orders.status", ["entregue", "pagamento_confirmado"]);

      if (error) throw error;
      setUserPurchases(data?.map(item => item.order_id) || []);
    } catch (error) {
      console.error("Erro ao verificar compras:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado para avaliar");
        return;
      }

      if (userPurchases.length === 0) {
        toast.error("Você precisa ter comprado este produto para avaliá-lo");
        return;
      }

      const { error } = await supabase
        .from("product_reviews")
        .insert({
          product_id: productId,
          user_id: user.id,
          order_id: userPurchases[0],
          rating,
          comment: comment.trim() || null,
        });

      if (error) throw error;

      toast.success("Avaliação enviada com sucesso!");
      setComment("");
      setRating(5);
      loadReviews();
    } catch (error: any) {
      console.error("Erro ao enviar avaliação:", error);
      toast.error(error.message || "Erro ao enviar avaliação");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (currentRating: number, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= currentRating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            } ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
            onClick={() => interactive && setRating(star)}
          />
        ))}
      </div>
    );
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  if (isLoading) {
    return <div className="text-center py-8">Carregando avaliações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Avaliações dos Clientes</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {renderStars(Math.round(parseFloat(averageRating)))}
              <span className="text-lg font-semibold">{averageRating}</span>
              <span className="text-muted-foreground">
                ({reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Formulário de avaliação */}
      {userPurchases.length > 0 && !hasReviewed && (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">Deixe sua avaliação</h3>
          <div>
            <label className="text-sm font-medium mb-2 block">Sua nota:</label>
            {renderStars(rating, true)}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              Comentário (opcional):
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Compartilhe sua experiência com este produto..."
              className="min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {comment.length}/500 caracteres
            </p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </Card>
      )}

      {/* Lista de avaliações */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Seja o primeiro a avaliar este produto!
          </p>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold">
                    {review.profiles?.nome_completo || "Cliente AppleHub"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {renderStars(review.rating)}
                    <span className="text-sm text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground mt-2">
                  {review.comment}
                </p>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
