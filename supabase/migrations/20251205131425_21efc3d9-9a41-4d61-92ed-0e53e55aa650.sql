-- Adicionar coluna domain para suportar múltiplas configurações por domínio
ALTER TABLE public.payment_settings 
ADD COLUMN IF NOT EXISTS domain text;

-- Criar índice único para garantir uma configuração por domínio
CREATE UNIQUE INDEX IF NOT EXISTS payment_settings_domain_unique 
ON public.payment_settings(domain) 
WHERE domain IS NOT NULL;

-- Atualizar registro existente com domínio padrão (Lovable)
UPDATE public.payment_settings 
SET domain = 'applehub.online' 
WHERE domain IS NULL;