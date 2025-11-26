import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Star, Pencil, Trash2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: {
    nome_completo: string;
  } | null;
  products?: {
    nome: string;
  } | null;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ nome: string; rating: number; comment: string }>({ nome: '', rating: 5, comment: '' });
  const { toast } = useToast();

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar nomes dos usuários e produtos separadamente
      const reviewsWithProfiles = await Promise.all(
        (data || []).map(async (review) => {
          const [profileResult, productResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('nome_completo')
              .eq('id', review.user_id)
              .maybeSingle(),
            supabase
              .from('products')
              .select('nome')
              .eq('id', review.product_id)
              .maybeSingle()
          ]);

          return {
            ...review,
            profiles: profileResult.data,
            products: productResult.data
          };
        })
      );

      setReviews(reviewsWithProfiles);
    } catch (error: any) {
      console.error('Erro ao carregar reviews:', error);
      toast({
        title: "Erro ao carregar avaliações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setEditData({
      nome: review.profiles?.nome_completo || '',
      rating: review.rating,
      comment: review.comment || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ nome: '', rating: 5, comment: '' });
  };

  const saveEdit = async (reviewId: string, userId: string) => {
    try {
      // Atualizar nome do usuário no profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nome_completo: editData.nome })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Atualizar rating e comment na review
      const { error: reviewError } = await supabase
        .from('product_reviews')
        .update({
          rating: editData.rating,
          comment: editData.comment
        })
        .eq('id', reviewId);

      if (reviewError) throw reviewError;

      toast({
        title: "Avaliação atualizada",
        description: "As alterações foram salvas com sucesso",
      });

      setEditingId(null);
      loadReviews();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) return;

    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: "Avaliação excluída",
        description: "A avaliação foi removida com sucesso",
      });

      loadReviews();
    } catch (error: any) {
      console.error('Erro ao deletar:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const renderStars = (rating: number, editable: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted'} ${editable ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            onClick={() => editable && setEditData({ ...editData, rating: star })}
          />
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <Card className="mb-6 border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Star className="w-7 h-7 text-amber-500" />
              Gerenciar Avaliações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Edite ou remova avaliações de produtos. Você pode alterar o nome do cliente, pontuação e comentário.
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando avaliações...</p>
          </div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="w-16 h-16 text-muted mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Nenhuma avaliação encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {editingId === review.id ? (
                    // Modo de Edição
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Produto</label>
                        <Input
                          value={review.products?.nome || 'Produto não encontrado'}
                          disabled
                          className="bg-muted"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Nome do Cliente</label>
                        <Input
                          value={editData.nome}
                          onChange={(e) => setEditData({ ...editData, nome: e.target.value })}
                          placeholder="Nome do cliente"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Pontuação</label>
                        {renderStars(editData.rating, true)}
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Comentário</label>
                        <Textarea
                          value={editData.comment}
                          onChange={(e) => setEditData({ ...editData, comment: e.target.value })}
                          placeholder="Comentário da avaliação"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => saveEdit(review.id, review.user_id)}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Modo de Visualização
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Produto: </span>
                            <span className="font-medium">{review.products?.nome || 'Produto não encontrado'}</span>
                          </div>
                          
                          <div>
                            <span className="text-sm text-muted-foreground">Cliente: </span>
                            <span className="font-medium">{review.profiles?.nome_completo || 'Nome não disponível'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Pontuação: </span>
                            {renderStars(review.rating)}
                          </div>

                          {review.comment && (
                            <div>
                              <span className="text-sm text-muted-foreground">Comentário: </span>
                              <p className="text-sm mt-1">{review.comment}</p>
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground">
                            Publicado em: {new Date(review.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(review)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteReview(review.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
