-- ─────────────────────────────────────────────────────────────────────────────
-- Exercise location metadata: unit, page, section, exercise_no, thumbnail
-- Required for exercise stages (controlled_exercise, free_exercise).
-- Optional for other stage types (lead_in, feedback, instruction, clarification).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS unit        INTEGER,
  ADD COLUMN IF NOT EXISTS page        INTEGER,
  ADD COLUMN IF NOT EXISTS section     TEXT,
  ADD COLUMN IF NOT EXISTS exercise_no INTEGER,
  ADD COLUMN IF NOT EXISTS thumbnail   TEXT;   -- base64 data URL, compressed small
