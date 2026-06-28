-- Per-lesson-plan colour for the title banner shown in Teach mode and to students.
-- Nullable; null falls back to the default banner colour in the UI.
ALTER TABLE lesson_plans
  ADD COLUMN IF NOT EXISTS title_color text;
