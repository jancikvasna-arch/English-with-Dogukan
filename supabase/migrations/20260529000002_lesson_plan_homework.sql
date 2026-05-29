-- ─────────────────────────────────────────────────────────────────────────────
-- Add section column to lesson_stages to distinguish lesson vs homework stages.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.lesson_stages
  ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT 'lesson'
    CHECK (section IN ('lesson', 'homework'));
