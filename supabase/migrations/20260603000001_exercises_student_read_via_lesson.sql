-- ─────────────────────────────────────────────────────────────────────────────
-- Allow students to read exercises (and their questions) that are linked to
-- lesson stages inside a lesson plan that has a lesson assigned to them.
--
-- Problem: exercises: student read policy only grants access via exercise_assignments.
-- assignLessonPlan only creates exercise_assignments for controlled_exercise and
-- free_exercise stage types. Lead-in (and other) stage types with exercises attached
-- were invisible to students — fetchExerciseWithQuestions returned null → blank stage.
--
-- Fix: add a parallel RLS path that checks lesson_stages → lessons → student_id.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Exercises: students can read exercises in lesson stages of their lesson plans
DROP POLICY IF EXISTS "exercises: student read via lesson plan" ON public.exercises;
CREATE POLICY "exercises: student read via lesson plan"
  ON public.exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.lesson_stages ls
      JOIN   public.lessons       l  ON l.lesson_plan_id = ls.lesson_plan_id
      WHERE  ls.exercise_id = exercises.id
        AND  l.student_id   = auth.uid()
    )
  );

-- 2. Questions: same — students can read questions for those exercises
DROP POLICY IF EXISTS "questions: student read via lesson plan" ON public.questions;
CREATE POLICY "questions: student read via lesson plan"
  ON public.questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.lesson_stages ls
      JOIN   public.lessons       l  ON l.lesson_plan_id = ls.lesson_plan_id
      WHERE  ls.exercise_id = questions.exercise_id
        AND  l.student_id   = auth.uid()
    )
  );
