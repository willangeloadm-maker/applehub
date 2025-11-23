-- Criar tabela de cupons de desconto
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_purchase_value numeric DEFAULT 0,
  max_uses integer,
  used_count integer DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Criar índice para busca rápida por código
CREATE INDEX idx_coupons_code ON public.coupons(code);

-- Habilitar RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem visualizar cupons ativos
CREATE POLICY "Todos podem visualizar cupons ativos"
ON public.coupons
FOR SELECT
USING (active = true);

-- Policy: Admins podem gerenciar cupons
CREATE POLICY "Admins podem gerenciar cupons"
ON public.coupons
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de uso de cupons (histórico)
CREATE TABLE public.coupon_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  discount_applied numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS na tabela de uso
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver seu próprio histórico
CREATE POLICY "Usuários podem ver seu histórico de cupons"
ON public.coupon_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Sistema pode registrar uso
CREATE POLICY "Sistema pode registrar uso de cupons"
ON public.coupon_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins podem ver tudo
CREATE POLICY "Admins podem ver todo histórico de cupons"
ON public.coupon_usage
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Inserir o cupom OZEIAS com 99% de desconto
INSERT INTO public.coupons (code, discount_type, discount_value, min_purchase_value, active)
VALUES ('OZEIAS', 'percentage', 99, 0, true);