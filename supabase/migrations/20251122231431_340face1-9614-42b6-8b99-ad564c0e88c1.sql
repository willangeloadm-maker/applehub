-- Habilitar realtime para a tabela cart_items
ALTER TABLE public.cart_items REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação de realtime (se não estiver)
ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_items;