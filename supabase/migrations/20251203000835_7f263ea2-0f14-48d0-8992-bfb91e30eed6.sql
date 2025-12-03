-- Adicionar campo para controle de saque automático na tabela payment_settings
ALTER TABLE public.payment_settings
ADD COLUMN IF NOT EXISTS auto_withdraw_enabled boolean DEFAULT false;