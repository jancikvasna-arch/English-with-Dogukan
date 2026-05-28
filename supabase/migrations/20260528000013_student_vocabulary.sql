-- ─────────────────────────────────────────────────────────────────────────────
-- Student vocabulary log
--
-- Students can save words/phrases they encounter during exercises.
-- Each entry optionally links back to the exercise it came from.
--
-- Future SaaS note: add org_id once multi-tenant.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.student_vocabulary (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word        TEXT        NOT NULL,               -- the word or short phrase
  definition  TEXT,                               -- student's own note / meaning
  exercise_id UUID        REFERENCES public.exercises(id) ON DELETE SET NULL,
  added_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vocab_student_idx ON public.student_vocabulary(student_id);
CREATE INDEX IF NOT EXISTS vocab_added_idx   ON public.student_vocabulary(student_id, added_at DESC);

ALTER TABLE public.student_vocabulary ENABLE ROW LEVEL SECURITY;

-- Students can fully manage their own vocabulary
DROP POLICY IF EXISTS "vocab: student own" ON public.student_vocabulary;
CREATE POLICY "vocab: student own"
  ON public.student_vocabulary FOR ALL
  USING  (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Admin can read all (for insight into student progress)
DROP POLICY IF EXISTS "vocab: admin read" ON public.student_vocabulary;
CREATE POLICY "vocab: admin read"
  ON public.student_vocabulary FOR SELECT
  USING (public.is_admin());
