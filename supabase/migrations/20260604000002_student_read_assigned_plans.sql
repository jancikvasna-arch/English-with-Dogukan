-- ─────────────────────────────────────────────────────────────────────────────
-- Belt-and-suspenders: ensure a student can read a lesson_plan (and its stages)
-- whenever they have a lessons row linked to that plan. Without this, the
-- fetchMyLessons embed of lesson_plans returns null and the "Start Lesson"
-- button never appears. Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- Students can SELECT lesson_plans linked to one of their lessons
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

-- Students can SELECT lesson_stages for plans linked to their lessons
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
