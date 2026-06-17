-- ─────────────────────────────────────────────────────────────────────────────
-- Allow students to access lesson plans that were directly assigned to them
-- via lesson_plans.student_id (currently the policy only checks exercise_assignments).
-- Also allow students to self-create exercise_assignment rows for plan exercises
-- so that opening a plan exercise from the student portal creates a tracking record.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Students can SELECT lesson_plans where they are the assigned student
DROP POLICY IF EXISTS "lesson_plans: student read direct" ON public.lesson_plans;
CREATE POLICY "lesson_plans: student read direct"
  ON public.lesson_plans FOR SELECT
  USING (student_id = auth.uid());

-- 2. Students can SELECT lesson_stages for plans directly assigned to them
DROP POLICY IF EXISTS "lesson_stages: student read direct" ON public.lesson_stages;
CREATE POLICY "lesson_stages: student read direct"
  ON public.lesson_stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lesson_plans lp
      WHERE lp.id = lesson_stages.lesson_plan_id
        AND lp.student_id = auth.uid()
    )
  );

-- 3. Students can INSERT their own exercise_assignment rows for plans they belong to
--    (either directly assigned or via existing exercise_assignments)
DROP POLICY IF EXISTS "assignments: student insert own" ON public.exercise_assignments;
CREATE POLICY "assignments: student insert own"
  ON public.exercise_assignments FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND lesson_plan_id IS NOT NULL
    AND (
      -- Plan directly assigned to this student
      EXISTS (
        SELECT 1 FROM public.lesson_plans lp
        WHERE lp.id = lesson_plan_id
          AND lp.student_id = auth.uid()
      )
      OR
      -- Student already has at least one assignment for this plan
      EXISTS (
        SELECT 1 FROM public.exercise_assignments ea
        WHERE ea.lesson_plan_id = exercise_assignments.lesson_plan_id
          AND ea.student_id = auth.uid()
      )
    )
  );
