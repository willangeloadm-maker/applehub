-- Corrigir search_path da função get_product_total_stock
CREATE OR REPLACE FUNCTION public.get_product_total_stock(product_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT SUM(estoque) FROM public.product_variants WHERE parent_product_id = product_id AND ativo = true),
    (SELECT estoque FROM public.products WHERE id = product_id)
  )::INTEGER;
$$;