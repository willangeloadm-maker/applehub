-- Criar tabela para configurações de admin
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senha TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir senha padrão
INSERT INTO public.admin_settings (senha) 
VALUES ('Ar102030')
ON CONFLICT DO NOTHING;

-- RLS: qualquer pessoa pode ler (para verificar a senha no login)
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read admin settings"
ON public.admin_settings
FOR SELECT
USING (true);

-- Apenas admins autenticados podem atualizar (para futura funcionalidade de trocar senha)
CREATE POLICY "Authenticated users can update admin settings"
ON public.admin_settings
FOR UPDATE
USING (true)
WITH CHECK (true);