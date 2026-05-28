-- ─────────────────────────────────────────────────────────────────────────────
-- Add 'word_choice' to the allowed question types.
-- word_choice stores a template in the `prompt` column using the syntax:
--   [opt1/opt2]  → student clicks one of two words
--   [___]        → student types a word into an inline blank
-- The student's answer is stored as JSON: {"0":"is","1":"a",...}
-- Dogukan reviews word_choice exercises manually via comments (no auto-grading).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_type_check;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_type_check
  CHECK (type IN ('multiple_choice', 'fill_blank', 'free_text', 'matching', 'true_false', 'word_choice'));
