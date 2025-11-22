-- Habilitar realtime para a tabela orders
ALTER TABLE public.orders REPLICA IDENTITY FULL;