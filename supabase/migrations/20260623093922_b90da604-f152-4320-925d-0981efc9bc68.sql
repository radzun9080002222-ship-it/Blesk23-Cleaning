CREATE TABLE public.pricing_config (
  id text PRIMARY KEY DEFAULT 'default',
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.pricing_config TO anon;
GRANT SELECT, INSERT, UPDATE ON public.pricing_config TO authenticated;
GRANT ALL ON public.pricing_config TO service_role;

ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to read pricing_config"
  ON public.pricing_config FOR SELECT
  USING (true);

CREATE POLICY "Allow anyone to insert pricing_config"
  ON public.pricing_config FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anyone to update pricing_config"
  ON public.pricing_config FOR UPDATE
  USING (true)
  WITH CHECK (true);