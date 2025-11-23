-- Criar tabela para logs de API Pagar.me
CREATE TABLE IF NOT EXISTS public.pagarme_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_body JSONB,
  response_status INTEGER,
  response_body JSONB,
  error_message TEXT,
  user_id UUID,
  order_id UUID REFERENCES public.orders(id),
  transaction_id UUID REFERENCES public.transactions(id),
  duration_ms INTEGER,
  metadata JSONB
);

-- Criar índices para melhor performance
CREATE INDEX idx_pagarme_logs_created_at ON public.pagarme_api_logs(created_at DESC);
CREATE INDEX idx_pagarme_logs_user_id ON public.pagarme_api_logs(user_id);
CREATE INDEX idx_pagarme_logs_order_id ON public.pagarme_api_logs(order_id);
CREATE INDEX idx_pagarme_logs_endpoint ON public.pagarme_api_logs(endpoint);
CREATE INDEX idx_pagarme_logs_response_status ON public.pagarme_api_logs(response_status);

-- RLS Policies
ALTER TABLE public.pagarme_api_logs ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os logs
CREATE POLICY "Admins podem ver todos os logs" ON public.pagarme_api_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Sistema pode inserir logs
CREATE POLICY "Sistema pode inserir logs" ON public.pagarme_api_logs
  FOR INSERT
  WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_pagarme_api_logs_updated_at
  BEFORE UPDATE ON public.pagarme_api_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();