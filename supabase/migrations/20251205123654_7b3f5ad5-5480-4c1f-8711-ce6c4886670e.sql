-- Remove a política que permite leitura pública da senha admin
DROP POLICY IF EXISTS "Anyone can read admin settings" ON public.admin_settings;

-- Criar função SECURITY DEFINER para validar senha admin (não expõe a senha)
CREATE OR REPLACE FUNCTION public.validate_admin_password(input_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_password text;
BEGIN
  SELECT senha INTO stored_password
  FROM public.admin_settings
  LIMIT 1;
  
  RETURN stored_password = input_password;
END;
$$;

-- Política: Apenas admins autenticados podem ver as configurações
CREATE POLICY "Only admins can read admin settings"
ON public.admin_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'));
