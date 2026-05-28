-- ─────────────────────────────────────────────────────────────────────────────
-- Students can read lesson plans and their exercises when assigned to them.
-- Without these policies the JOIN in fetchMyExercises returns null plan data,
-- so the student dashboard can't group exercises under their lesson plan.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Students can SELECT lesson plans they've been assigned
CREATE POLICY "lesson_plans: student read assigned"
  ON public.lesson_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exercise_assignments
      WHERE lesson_plan_id = lesson_plans.id
        AND student_id = auth.uid()
    )
  );

-- 2. Students can SELECT lesson_plan_exercises for plans assigned to them
CREATE POLICY "lesson_plan_exercises: student read assigned"
  ON public.lesson_plan_exercises
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exercise_assignments
      WHERE lesson_plan_id = lesson_plan_exercises.lesson_plan_id
        AND student_id = auth.uid()
    )
  );
