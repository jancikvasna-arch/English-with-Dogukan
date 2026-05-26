-- ─────────────────────────────────────────────────────────────────────────────
-- Exercise v2: context images
-- Also ensures lesson_plans tables exist (migration 8 safety net)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add context_images to exercises (array of compressed base64 data-URIs)
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS context_images JSONB;

-- 2. Lesson plans safety net (migration 8 may not have run)
CREATE TABLE IF NOT EXISTS public.lesson_plans (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT,
  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_plan_exercises (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL REFERENCES public.lesson_plans(id) ON DELETE CASCADE,
  exercise_id    UUID NOT NULL REFERENCES public.exercises(id)    ON DELETE CASCADE,
  order_index    INT  NOT NULL DEFAULT 0,
  UNIQUE (lesson_plan_id, exercise_id)
);

ALTER TABLE public.exercise_assignments
  ADD COLUMN IF NOT EXISTS lesson_plan_id UUID REFERENCES public.lesson_plans(id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lesson_plans' AND policyname = 'lesson_plans: admin all'
  ) THEN
    ALTER TABLE public.lesson_plans          ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.lesson_plan_exercises ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "lesson_plans: admin all"
      ON public.lesson_plans FOR ALL USING (public.is_admin());
    CREATE POLICY "lesson_plan_exercises: admin all"
      ON public.lesson_plan_exercises FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- 3. questions type constraint safety net
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_type_check
  CHECK (type IN ('multiple_choice', 'fill_blank', 'free_text', 'matching', 'true_false'));
