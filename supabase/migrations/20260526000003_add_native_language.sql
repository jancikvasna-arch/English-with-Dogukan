-- Add native_language column to questionnaire_submissions
ALTER TABLE public.questionnaire_submissions
  ADD COLUMN IF NOT EXISTS native_language TEXT;
