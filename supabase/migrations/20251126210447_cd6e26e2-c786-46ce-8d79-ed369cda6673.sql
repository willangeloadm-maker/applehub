-- Atualizar políticas de categorias
DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
DROP POLICY IF EXISTS "Admins can update categories" ON categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON categories;

CREATE POLICY "Authenticated users can insert categories"
ON categories FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
ON categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
ON categories FOR DELETE TO authenticated USING (true);

-- Atualizar políticas de variantes de produtos
DROP POLICY IF EXISTS "Admins podem inserir variantes" ON product_variants;
DROP POLICY IF EXISTS "Admins podem atualizar variantes" ON product_variants;
DROP POLICY IF EXISTS "Admins podem deletar variantes" ON product_variants;

CREATE POLICY "Authenticated users can insert product variants"
ON product_variants FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update product variants"
ON product_variants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product variants"
ON product_variants FOR DELETE TO authenticated USING (true);

-- Atualizar políticas de atributos de produtos
DROP POLICY IF EXISTS "Admins podem inserir atributos" ON product_attributes;
DROP POLICY IF EXISTS "Admins podem atualizar atributos" ON product_attributes;
DROP POLICY IF EXISTS "Admins podem deletar atributos" ON product_attributes;

CREATE POLICY "Authenticated users can insert product attributes"
ON product_attributes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update product attributes"
ON product_attributes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product attributes"
ON product_attributes FOR DELETE TO authenticated USING (true);