-- ─────────────────────────────────────────────────────────────────────────────
-- Add 'listening' and 'viewing' question types.
-- These are verbal/discussion activities — no written answers from students.
-- A single dummy question row is stored to record the activity type,
-- but the student sees no answer input and can submit immediately.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_type_check;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_type_check
  CHECK (type IN (
    'multiple_choice', 'fill_blank', 'free_text', 'matching',
    'true_false', 'word_choice', 'listening', 'viewing'
  ));
