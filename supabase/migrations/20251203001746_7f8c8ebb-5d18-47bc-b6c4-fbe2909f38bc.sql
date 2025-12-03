-- Adicionar campo de senha para saques na tabela payment_settings
ALTER TABLE public.payment_settings 
ADD COLUMN withdraw_password text;