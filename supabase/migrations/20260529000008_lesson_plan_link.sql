-- ─────────────────────────────────────────────────────────────────────────────
-- Link lesson plans to individual lesson rows so students can open exercises
-- without a separate assignment step, and track their own progress.
--
-- Three policy additions:
--   lesson_plans: student read via lesson  — readable when linked to student's lesson
--   lesson_stages: student read via lesson — stages readable same way
--   assignments: student insert via lesson — student can self-track exercises in
--                                            a plan that is linked to their lesson
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add lesson_plan_id to lessons (safe to re-run)
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS lesson_plan_id UUID
    REFERENCES public.lesson_plans(id) ON DELETE SET NULL;

-- 2. Add scheduled_at to exercise_assignments (safe to re-run)
ALTER TABLE public.exercise_assignments
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- 3. Students can SELECT lesson_plans linked to one of their lessons
DROP POLICY IF EXISTS "lesson_plans: student read via lesson" ON public.lesson_plans;
CREATE POLICY "lesson_plans: student read via lesson"
  ON public.lesson_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.lesson_plan_id = lesson_plans.id
        AND l.student_id = auth.uid()
    )
  );

-- 4. Students can SELECT lesson_stages for plans linked to their lessons
DROP POLICY IF EXISTS "lesson_stages: student read via lesson" ON public.lesson_stages;
CREATE POLICY "lesson_stages: student read via lesson"
  ON public.lesson_stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.lesson_plan_id = lesson_stages.lesson_plan_id
        AND l.student_id = auth.uid()
    )
  );

-- 5. Students can INSERT their own exercise_assignment rows for plans
--    that are linked to one of their lessons (self-tracking without pre-assignment)
DROP POLICY IF EXISTS "assignments: student insert via lesson" ON public.exercise_assignments;
CREATE POLICY "assignments: student insert via lesson"
  ON public.exercise_assignments FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND lesson_plan_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.lesson_plan_id = exercise_assignments.lesson_plan_id
        AND l.student_id = auth.uid()
    )
  );
