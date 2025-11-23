-- Criar bucket para documentos de verificação
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false);

-- Política: Usuários podem fazer upload de seus próprios documentos
CREATE POLICY "Usuários podem fazer upload de seus documentos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política: Usuários podem visualizar seus próprios documentos
CREATE POLICY "Usuários podem ver seus documentos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política: Admins podem visualizar todos os documentos
CREATE POLICY "Admins podem ver todos os documentos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents' 
  AND has_role(auth.uid(), 'admin')
);

-- Política: Usuários podem atualizar seus próprios documentos
CREATE POLICY "Usuários podem atualizar seus documentos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política: Usuários podem deletar seus próprios documentos
CREATE POLICY "Usuários podem deletar seus documentos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);