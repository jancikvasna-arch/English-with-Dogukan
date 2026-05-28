-- Add stage_type to exercises so every lesson stage knows what category it is.
-- Existing exercises default to 'controlled_exercise'.
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS stage_type TEXT NOT NULL DEFAULT 'controlled_exercise';

DO $$ BEGIN
  ALTER TABLE public.exercises
    ADD CONSTRAINT exercises_stage_type_check
    CHECK (stage_type IN ('controlled_exercise', 'free_exercise', 'lead_in', 'feedback', 'instruction', 'clarification'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
