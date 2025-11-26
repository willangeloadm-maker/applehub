-- Criar bucket de storage para imagens de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Políticas RLS para o bucket de imagens de produtos
-- Admins podem fazer upload
CREATE POLICY "Admins podem fazer upload de imagens de produtos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin'::text)
);

-- Admins podem atualizar imagens
CREATE POLICY "Admins podem atualizar imagens de produtos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin'::text)
);

-- Admins podem deletar imagens
CREATE POLICY "Admins podem deletar imagens de produtos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin'::text)
);

-- Todos podem ver imagens de produtos (bucket público)
CREATE POLICY "Qualquer um pode ver imagens de produtos"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');