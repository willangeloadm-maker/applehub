-- Função para atualizar status de pedido (para uso no painel admin)
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_observacao text DEFAULT 'Status atualizado via ação rápida'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar o pedido
  UPDATE orders 
  SET status = p_new_status::order_status, 
      updated_at = now()
  WHERE id = p_order_id;

  -- Inserir no histórico
  INSERT INTO order_status_history (order_id, status, observacao)
  VALUES (p_order_id, p_new_status::order_status, p_observacao);

  RETURN true;
END;
$$;