-- ─────────────────────────────────────────────────────────────────────────────
-- Student English level (admin-only metadata on the profile).
-- Values: 'elementary' | 'intermediate' | 'advanced'
--
-- Also creates a manual_students table so Dogukan can record students who
-- haven't signed up yet (no Supabase auth account required).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. English level on auth-linked profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS english_level TEXT;

-- 2. Manual students (admin-created, no auth account needed)
CREATE TABLE IF NOT EXISTS public.manual_students (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT,
  english_level TEXT,                                              -- 'elementary'|'intermediate'|'advanced'
  notes         TEXT,
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.manual_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manual_students: admin all" ON public.manual_students;
CREATE POLICY "manual_students: admin all"
  ON public.manual_students FOR ALL
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());
