-- Add tracking code column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS codigo_rastreio TEXT;

-- Update order_status enum to include new delivery statuses
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'em_separacao';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pedido_enviado';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pedido_entregue';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'entrega_nao_realizada';

-- Create index on tracking code for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_codigo_rastreio ON public.orders(codigo_rastreio);