-- ─────────────────────────────────────────────────────────────────────────────
-- Prospects: people who book a consultation call from the landing page.
-- They are NOT students yet. Admin can convert them to students manually.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prospects (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  phone        TEXT,
  message      TEXT,
  source       TEXT        DEFAULT 'consultation_booking',
  status       TEXT        NOT NULL DEFAULT 'new'
                           CHECK (status IN ('new', 'contacted', 'converted', 'declined')),
  admin_notes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  converted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS prospects_status_idx ON public.prospects(status);
CREATE INDEX IF NOT EXISTS prospects_created_idx ON public.prospects(created_at DESC);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Only admin can read/write prospects
DROP POLICY IF EXISTS "prospects: admin all" ON public.prospects;
CREATE POLICY "prospects: admin all"
  ON public.prospects FOR ALL
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Unauthenticated/authenticated users can INSERT (submit their info from landing page)
DROP POLICY IF EXISTS "prospects: public insert" ON public.prospects;
CREATE POLICY "prospects: public insert"
  ON public.prospects FOR INSERT
  WITH CHECK (true);
