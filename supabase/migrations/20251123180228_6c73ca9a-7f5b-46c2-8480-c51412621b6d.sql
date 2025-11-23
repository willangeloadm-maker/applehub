-- Atualizar o bucket para ser público (necessário para visualização das fotos no admin)
UPDATE storage.buckets
SET public = true
WHERE id = 'verification-documents';