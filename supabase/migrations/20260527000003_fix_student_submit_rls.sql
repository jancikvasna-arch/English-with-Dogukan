-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: students can update their own exercise_assignment row (mark as submitted)
-- Root cause: only SELECT was granted; UPDATE was missing so submitExerciseAnswers
-- silently failed to persist status='submitted' in the database.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "assignments: student update"
  ON public.exercise_assignments
  FOR UPDATE
  USING (student_id = auth.uid());
