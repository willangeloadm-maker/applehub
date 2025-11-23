-- Função para buscar email do usuário pelo ID
-- Necessária para permitir login por CPF ou telefone
CREATE OR REPLACE FUNCTION public.get_user_email_by_id(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_email;
END;
$$;