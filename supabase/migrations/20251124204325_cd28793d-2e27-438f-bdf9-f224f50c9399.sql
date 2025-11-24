-- Criar função para buscar email por CPF
CREATE OR REPLACE FUNCTION public.get_user_email_by_cpf(user_cpf text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email text;
  profile_user_id uuid;
BEGIN
  -- Buscar o user_id pelo CPF na tabela profiles
  SELECT id INTO profile_user_id
  FROM public.profiles
  WHERE cpf = user_cpf
  LIMIT 1;
  
  -- Se não encontrou o perfil, retornar NULL
  IF profile_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar o email na tabela auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = profile_user_id;
  
  RETURN user_email;
END;
$$;

-- Criar função para buscar email por telefone
CREATE OR REPLACE FUNCTION public.get_user_email_by_phone(user_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email text;
  profile_user_id uuid;
BEGIN
  -- Buscar o user_id pelo telefone na tabela profiles
  SELECT id INTO profile_user_id
  FROM public.profiles
  WHERE telefone = user_phone
  LIMIT 1;
  
  -- Se não encontrou o perfil, retornar NULL
  IF profile_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar o email na tabela auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = profile_user_id;
  
  RETURN user_email;
END;
$$;