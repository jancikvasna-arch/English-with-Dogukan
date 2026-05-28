-- ─────────────────────────────────────────────────────────────────────────────
-- Post-lesson teacher notes
--
-- Adds two columns to the existing `lessons` table:
--   teacher_notes        → Dogukan's private notes after the lesson
--   teacher_notes_public → Notes Dogukan chooses to share with the student
--                          (shown on the student dashboard lesson history)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS teacher_notes        TEXT,
  ADD COLUMN IF NOT EXISTS teacher_notes_public TEXT;
