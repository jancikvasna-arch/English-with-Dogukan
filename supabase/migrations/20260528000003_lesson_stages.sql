-- ─────────────────────────────────────────────────────────────────────────────
-- Task 7: Lesson stages
-- A lesson plan is now built from ordered "stages". Stage types:
--
--   controlled_exercise  links to an exercise (structured task)
--   free_exercise        links to an exercise (freer / communicative task)
--   lead_in              content only — text / audio / images
--   feedback             content only
--   instruction          content only
--   clarification        content only
--
-- Duration is admin-only (not shown to students).
-- Students see the lesson's total duration_minutes from the lessons table.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_stages (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_plan_id   UUID NOT NULL REFERENCES public.lesson_plans(id) ON DELETE CASCADE,
  order_index      INTEGER NOT NULL DEFAULT 0,
  stage_type       TEXT NOT NULL CHECK (stage_type IN (
                     'controlled_exercise', 'free_exercise',
                     'lead_in', 'feedback', 'instruction', 'clarification'
                   )),
  title            TEXT,
  duration_minutes INTEGER,
  -- Exercise stage fields
  exercise_id      UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  -- Content stage fields
  content_text     TEXT,
  content_images   TEXT[],
  audio_url        TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.lesson_stages ENABLE ROW LEVEL SECURITY;

-- Admin can do everything with stages
CREATE POLICY "lesson_stages: admin all"
  ON public.lesson_stages
  FOR ALL
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Students can read stages for plans assigned to them
CREATE POLICY "lesson_stages: student read assigned"
  ON public.lesson_stages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exercise_assignments
      WHERE lesson_plan_id = lesson_stages.lesson_plan_id
        AND student_id = auth.uid()
    )
  );
