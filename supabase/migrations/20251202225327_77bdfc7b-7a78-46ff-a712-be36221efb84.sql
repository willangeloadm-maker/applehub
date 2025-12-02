-- Função para buscar pedidos ativos (para uso no painel admin)
CREATE OR REPLACE FUNCTION public.get_active_orders()
RETURNS TABLE (
  id uuid,
  numero_pedido text,
  status text,
  total numeric,
  created_at timestamptz,
  user_id uuid,
  codigo_rastreio text,
  cliente_nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.numero_pedido,
    o.status::text,
    o.total,
    o.created_at,
    o.user_id,
    o.codigo_rastreio,
    p.nome_completo as cliente_nome
  FROM orders o
  LEFT JOIN profiles p ON p.id = o.user_id
  WHERE o.status IN ('pagamento_confirmado', 'em_separacao', 'pedido_enviado', 'em_transporte', 'pedido_entregue')
  ORDER BY o.created_at DESC;
END;
$$;