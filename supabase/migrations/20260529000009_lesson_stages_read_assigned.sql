-- ─────────────────────────────────────────────────────────────────────────────
-- Belt-and-suspenders: let students read lesson_stages for any plan they have
-- an exercise_assignment in.  This covers plans assigned via assignLessonPlan
-- even when the migration-8 "via lesson" join is not yet in place.
-- Also allow students to SELECT lesson_plans the same way.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Students can read lesson_stages for plans where they have assignments
DROP POLICY IF EXISTS "lesson_stages: student read via assignment" ON public.lesson_stages;
CREATE POLICY "lesson_stages: student read via assignment"
  ON public.lesson_stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exercise_assignments ea
      WHERE ea.lesson_plan_id = lesson_stages.lesson_plan_id
        AND ea.student_id = auth.uid()
    )
  );

-- 2. Students can read lesson_plans for plans where they have assignments
DROP POLICY IF EXISTS "lesson_plans: student read via assignment" ON public.lesson_plans;
CREATE POLICY "lesson_plans: student read via assignment"
  ON public.lesson_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exercise_assignments ea
      WHERE ea.lesson_plan_id = lesson_plans.id
        AND ea.student_id = auth.uid()
    )
  );
