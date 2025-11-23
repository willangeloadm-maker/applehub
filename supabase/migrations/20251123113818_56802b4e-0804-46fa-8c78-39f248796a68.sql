-- Corrigir política de INSERT na tabela order_status_history
-- Primeiro, remover a política existente que está causando problemas
DROP POLICY IF EXISTS "Admins podem ver todas as tentativas de cartão" ON public.order_status_history;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias tentativas" ON public.order_status_history;

-- Recriar políticas corretas
DROP POLICY IF EXISTS "Admins can insert order history" ON public.order_status_history;
DROP POLICY IF EXISTS "Admins can view all order history" ON public.order_status_history;
DROP POLICY IF EXISTS "Users can view history from their orders" ON public.order_status_history;

-- Política para inserção: permitir que usuários insiram histórico dos seus próprios pedidos
CREATE POLICY "Users can insert history for their own orders"
  ON public.order_status_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_history.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Política para admins inserirem
CREATE POLICY "Admins can insert order history"
  ON public.order_status_history
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Política para admins visualizarem tudo
CREATE POLICY "Admins can view all order history"
  ON public.order_status_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Política para usuários visualizarem histórico dos seus pedidos
CREATE POLICY "Users can view history from their orders"
  ON public.order_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_history.order_id
      AND orders.user_id = auth.uid()
    )
  );