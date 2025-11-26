import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-6 mt-12">
      {/* Cabeçalho com estatísticas */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold mb-2">Avaliações dos Clientes</h2>
              {reviews.length > 0 && (
                <div className="flex items-center gap-3">
                  {renderStars(Math.round(parseFloat(averageRating)))}
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">{averageRating}</span>
                    <span className="text-muted-foreground text-sm">
                      de 5
                    </span>
                  </div>
                </div>
              )}
            </div>
            {reviews.length > 0 && (
              <div className="text-center md:text-right">
                <div className="text-4xl font-bold text-primary">{reviews.length}</div>
                <div className="text-sm text-muted-foreground">
                  {reviews.length === 1 ? "avaliação" : "avaliações"}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Formulário de avaliação */}
      {userPurchases.length > 0 && !hasReviewed && (
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full" />
              <h3 className="text-lg font-bold">Deixe sua avaliação</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Sua nota:</label>
              <div className="bg-secondary/50 rounded-lg p-4 w-fit">
                {renderStars(rating, true)}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">
                Comentário (opcional):
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Compartilhe sua experiência com este produto..."
                className="min-h-[120px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {comment.length}/500 caracteres
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              {isSubmitting ? "Enviando..." : "Publicar Avaliação"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de avaliações */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12">
              <div className="text-center space-y-2">
                <Star className="w-12 h-12 mx-auto text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhuma avaliação ainda
                </p>
                <p className="text-sm text-muted-foreground">
                  Seja o primeiro a compartilhar sua opinião!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm font-medium text-muted-foreground">
                {reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            {reviews.map((review, index) => (
              <Card 
                key={review.id} 
                className="hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar placeholder */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">
                        {(review.profiles?.nome_completo || "C")[0].toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <div>
                          <p className="font-semibold text-base">
                            {review.profiles?.nome_completo || "Cliente AppleHub"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(review.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                      
                      {review.comment && (
                        <p className="text-sm leading-relaxed text-foreground/80 mt-3 bg-secondary/30 rounded-lg p-3">
                          "{review.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
