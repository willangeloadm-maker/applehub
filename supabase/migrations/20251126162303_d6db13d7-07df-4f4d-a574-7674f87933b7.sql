-- Sistema de Variantes e Atributos Flexíveis

-- 1. Adicionar campo parent_product_id à tabela products
ALTER TABLE public.products 
ADD COLUMN parent_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;

-- 2. Criar tabela de atributos de produto (chave-valor flexível)
CREATE TABLE public.product_attributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_name TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, attribute_name)
);

-- 3. Criar tabela de variantes de produto
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT,
  estoque INTEGER NOT NULL DEFAULT 0,
  preco_ajuste NUMERIC DEFAULT 0, -- ajuste de preço em relação ao produto pai
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(parent_product_id, variant_product_id)
);

-- 4. Adicionar campos úteis para categorias
ALTER TABLE public.categories 
ADD COLUMN atributos_permitidos TEXT[] DEFAULT '{}';

-- 5. Índices para performance
CREATE INDEX idx_product_attributes_product_id ON public.product_attributes(product_id);
CREATE INDEX idx_product_variants_parent_id ON public.product_variants(parent_product_id);
CREATE INDEX idx_product_variants_variant_id ON public.product_variants(variant_product_id);
CREATE INDEX idx_products_parent_id ON public.products(parent_product_id);

-- 6. RLS para product_attributes
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver atributos de produtos ativos"
ON public.product_attributes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_attributes.product_id 
    AND (products.ativo = true OR has_role(auth.uid(), 'admin'::text))
  )
);

CREATE POLICY "Admins podem inserir atributos"
ON public.product_attributes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins podem atualizar atributos"
ON public.product_attributes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins podem deletar atributos"
ON public.product_attributes FOR DELETE
USING (has_role(auth.uid(), 'admin'::text));

-- 7. RLS para product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver variantes ativas"
ON public.product_variants FOR SELECT
USING (
  ativo = true OR has_role(auth.uid(), 'admin'::text)
);

CREATE POLICY "Admins podem inserir variantes"
ON public.product_variants FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins podem atualizar variantes"
ON public.product_variants FOR UPDATE
USING (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins podem deletar variantes"
ON public.product_variants FOR DELETE
USING (has_role(auth.uid(), 'admin'::text));

-- 8. Trigger para updated_at em product_variants
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Função para obter estoque total de um produto (soma das variantes)
CREATE OR REPLACE FUNCTION public.get_product_total_stock(product_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    (SELECT SUM(estoque) FROM public.product_variants WHERE parent_product_id = product_id AND ativo = true),
    (SELECT estoque FROM public.products WHERE id = product_id)
  )::INTEGER;
$$;