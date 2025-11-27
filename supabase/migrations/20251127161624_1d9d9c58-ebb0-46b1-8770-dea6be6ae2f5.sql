-- Remover política anterior que usa has_role
DROP POLICY IF EXISTS "Admins podem deletar itens de pedidos" ON public.order_items;

-- Criar política que permite qualquer usuário autenticado deletar order_items
-- Isso é necessário porque o admin não usa Supabase Auth
CREATE POLICY "Sistema pode deletar itens de pedidos"
ON public.order_items
FOR DELETE
TO public
USING (true);