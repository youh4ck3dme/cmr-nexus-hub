CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  event_key text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, event_key)
);

GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook events owner read" ON public.webhook_events
  FOR SELECT TO authenticated
  USING ((auth.uid() = owner_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER webhook_events_set_updated_at
  BEFORE UPDATE ON public.webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX webhook_events_owner_created_idx ON public.webhook_events (owner_id, created_at DESC);