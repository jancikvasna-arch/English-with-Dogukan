-- ─────────────────────────────────────────────────────────────────────────────
-- Tasks 2, 3, 4, 5: Exercise enhancements + global labels system
--
--  context_text     → reading passage typed/pasted by Dogukan (shown to student)
--  audio_url        → link to audio/video the student listens to first
--  estimated_minutes → how long the exercise takes (admin-only)
--  labels           → global reusable labels (e.g. "Elementary", "Jason – Week 3")
--  exercise_labels  → many-to-many join between exercises and labels
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. New columns on exercises
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS context_text      TEXT,
  ADD COLUMN IF NOT EXISTS audio_url         TEXT,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;

-- 2. Labels table (global, admin-managed)
CREATE TABLE IF NOT EXISTS public.labels (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#d4a853',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (name)
);
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "labels: admin all"
  ON public.labels
  FOR ALL
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Exercise–label join table
CREATE TABLE IF NOT EXISTS public.exercise_labels (
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  label_id    UUID NOT NULL REFERENCES public.labels(id)    ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, label_id)
);
ALTER TABLE public.exercise_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercise_labels: admin all"
  ON public.exercise_labels
  FOR ALL
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());
