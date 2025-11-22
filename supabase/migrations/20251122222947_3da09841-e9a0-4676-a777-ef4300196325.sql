-- Criar tabela de verificações de conta
CREATE TABLE public.account_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, verificado, rejeitado
  documento_frente TEXT,
  documento_verso TEXT,
  selfie TEXT,
  verificado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Criar tabela de análises de crédito
CREATE TABLE public.credit_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  valor_solicitado NUMERIC NOT NULL,
  valor_aprovado NUMERIC NOT NULL,
  percentual_aprovado NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_analise', -- em_analise, aprovado, rejeitado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de transações/pagamentos
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- entrada, parcela, pagamento_completo
  valor NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, pago, cancelado
  metodo_pagamento TEXT, -- pix, cartao, boleto
  pix_qr_code TEXT,
  pix_copia_cola TEXT,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  data_vencimento TIMESTAMP WITH TIME ZONE,
  parcela_numero INTEGER,
  total_parcelas INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.account_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para account_verifications
CREATE POLICY "Usuários podem ver sua própria verificação"
  ON public.account_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar sua própria verificação"
  ON public.account_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar sua própria verificação"
  ON public.account_verifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todas as verificações"
  ON public.account_verifications FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar verificações"
  ON public.account_verifications FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Políticas RLS para credit_analyses
CREATE POLICY "Usuários podem ver suas próprias análises"
  ON public.credit_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias análises"
  ON public.credit_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todas as análises"
  ON public.credit_analyses FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar análises"
  ON public.credit_analyses FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Políticas RLS para transactions
CREATE POLICY "Usuários podem ver suas próprias transações"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias transações"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todas as transações"
  ON public.transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar transações"
  ON public.transactions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_account_verifications_updated_at
  BEFORE UPDATE ON public.account_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_analyses_updated_at
  BEFORE UPDATE ON public.credit_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();