-- Per-exercise control over whether the audio/video/website link is shown to students.
--   true  → always show the link to the student
--   false → always hide it (only the teacher sees it in Teach mode)
--   null  → legacy default: shown only for listening/viewing activities
-- Nullable on purpose so existing rows keep the legacy behaviour until edited.
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS show_link_to_student boolean;
