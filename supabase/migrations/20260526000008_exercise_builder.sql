-- ─────────────────────────────────────────────────────────────────────────────
-- Exercise Builder additions
-- • New question types: matching, true_false
-- • Lesson plans (reusable exercise bundles)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extend questions.type to include matching + true_false
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_type_check
  CHECK (type IN ('multiple_choice', 'fill_blank', 'free_text', 'matching', 'true_false'));

-- 2. Lesson plans table (reusable named bundles of exercises)
CREATE TABLE IF NOT EXISTS public.lesson_plans (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT,
  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Junction: which exercises belong to which plan (ordered)
CREATE TABLE IF NOT EXISTS public.lesson_plan_exercises (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL REFERENCES public.lesson_plans(id) ON DELETE CASCADE,
  exercise_id    UUID NOT NULL REFERENCES public.exercises(id)    ON DELETE CASCADE,
  order_index    INT  NOT NULL DEFAULT 0,
  UNIQUE (lesson_plan_id, exercise_id)
);

-- 4. Track which lesson plan an assignment came from (optional)
ALTER TABLE public.exercise_assignments
  ADD COLUMN IF NOT EXISTS lesson_plan_id UUID REFERENCES public.lesson_plans(id);

-- 5. RLS
ALTER TABLE public.lesson_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plan_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_plans: admin all"
  ON public.lesson_plans FOR ALL USING (public.is_admin());

CREATE POLICY "lesson_plan_exercises: admin all"
  ON public.lesson_plan_exercises FOR ALL USING (public.is_admin());
