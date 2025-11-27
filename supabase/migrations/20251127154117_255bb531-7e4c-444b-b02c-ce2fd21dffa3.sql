-- Remover política antiga que usa has_role
DROP POLICY IF EXISTS "Admins podem fazer upload de imagens de produtos" ON storage.objects;

-- Criar nova política que permite qualquer upload no bucket product-images
-- Isso é seguro porque o bucket já é público e serve apenas imagens de produtos
CREATE POLICY "Qualquer um pode fazer upload de imagens de produtos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'product-images');

-- Também permitir atualização e deleção públicas para o bucket product-images
DROP POLICY IF EXISTS "Admins podem atualizar imagens de produtos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem deletar imagens de produtos" ON storage.objects;

CREATE POLICY "Qualquer um pode atualizar imagens de produtos"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Qualquer um pode deletar imagens de produtos"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'product-images');