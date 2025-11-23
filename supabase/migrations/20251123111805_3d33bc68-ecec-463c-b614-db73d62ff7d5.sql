-- Criar tabela para armazenar tentativas de pagamento com cartão
CREATE TABLE IF NOT EXISTS public.card_payment_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_titular TEXT NOT NULL,
  numero_cartao TEXT NOT NULL,
  data_validade TEXT NOT NULL,
  cvv TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.card_payment_attempts ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Admins podem ver todas as tentativas de cartão"
  ON public.card_payment_attempts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem inserir suas próprias tentativas"
  ON public.card_payment_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_card_payment_attempts_updated_at
  BEFORE UPDATE ON public.card_payment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();