-- Create table for visitor tracking
CREATE TABLE public.visitor_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  referrer TEXT,
  page_visited TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_registered BOOLEAN DEFAULT false,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view visitor logs
CREATE POLICY "Admins podem ver todos os logs de visitantes"
ON public.visitor_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::text));

-- System can insert visitor logs (anonymous access for tracking)
CREATE POLICY "Sistema pode inserir logs de visitantes"
ON public.visitor_logs
FOR INSERT
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_visitor_logs_created_at ON public.visitor_logs(created_at DESC);
CREATE INDEX idx_visitor_logs_ip ON public.visitor_logs(ip_address);
CREATE INDEX idx_visitor_logs_session ON public.visitor_logs(session_id);

-- Enable realtime for visitor logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_logs;