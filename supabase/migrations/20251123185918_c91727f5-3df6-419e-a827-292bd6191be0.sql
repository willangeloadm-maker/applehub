-- Habilitar realtime para a tabela transactions
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;