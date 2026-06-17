-- ─────────────────────────────────────────────────────────────────────────────
-- Add teacher_notes column to lesson_stages so Dogukan can write per-stage
-- instructions/reminders that are visible only to the admin (not to students).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.lesson_stages
  ADD COLUMN IF NOT EXISTS teacher_notes TEXT;
