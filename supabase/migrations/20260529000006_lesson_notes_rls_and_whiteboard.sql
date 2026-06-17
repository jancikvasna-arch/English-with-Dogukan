-- Broaden lesson_notes student RLS to also cover assignments
DROP POLICY IF EXISTS "lesson_notes: student read" ON public.lesson_notes;
CREATE POLICY "lesson_notes: student read"
  ON public.lesson_notes FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.lesson_plans lp
              WHERE lp.id = lesson_notes.plan_id AND lp.student_id = auth.uid())
      OR
      EXISTS (SELECT 1 FROM public.exercise_assignments ea
              WHERE ea.lesson_plan_id = lesson_notes.plan_id AND ea.student_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "lesson_notes: student insert" ON public.lesson_notes;
CREATE POLICY "lesson_notes: student insert"
  ON public.lesson_notes FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.lesson_plans lp
              WHERE lp.id = lesson_notes.plan_id AND lp.student_id = auth.uid())
      OR
      EXISTS (SELECT 1 FROM public.exercise_assignments ea
              WHERE ea.lesson_plan_id = lesson_notes.plan_id AND ea.student_id = auth.uid())
    )
  );

-- Add whiteboard PDF support to lessons table
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS whiteboard_pdf_url  TEXT,
  ADD COLUMN IF NOT EXISTS whiteboard_pdf_name TEXT;
