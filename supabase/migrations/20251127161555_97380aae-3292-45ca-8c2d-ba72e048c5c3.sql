-- Adicionar política para admins poderem deletar order_items
CREATE POLICY "Admins podem deletar itens de pedidos"
ON public.order_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'));