-- Criar tabela de avaliações de produtos
CREATE TABLE public.product_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Adicionar índices para melhor performance
CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_user_id ON public.product_reviews(user_id);

-- Garantir que um usuário só pode avaliar um produto uma vez por pedido
CREATE UNIQUE INDEX idx_product_reviews_unique ON public.product_reviews(product_id, user_id, order_id);

-- Habilitar RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ver avaliações
CREATE POLICY "Todos podem ver avaliações"
ON public.product_reviews
FOR SELECT
USING (true);

-- Policy: Usuários podem criar avaliações para produtos que compraram
CREATE POLICY "Usuários podem criar avaliações de produtos comprados"
ON public.product_reviews
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.id = order_id
      AND o.user_id = auth.uid()
      AND oi.product_id = product_id
      AND o.status IN ('entregue', 'pagamento_confirmado')
  )
);

-- Policy: Usuários podem editar suas próprias avaliações
CREATE POLICY "Usuários podem editar suas próprias avaliações"
ON public.product_reviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Usuários podem deletar suas próprias avaliações
CREATE POLICY "Usuários podem deletar suas próprias avaliações"
ON public.product_reviews
FOR DELETE
USING (auth.uid() = user_id);

-- Policy: Admins podem gerenciar todas as avaliações
CREATE POLICY "Admins podem gerenciar avaliações"
ON public.product_reviews
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_product_reviews_updated_at
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();