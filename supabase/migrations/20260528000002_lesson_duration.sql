-- ─────────────────────────────────────────────────────────────────────────────
-- Task 6: Add duration_minutes to lessons
-- Dogukan sets it when creating/editing lessons.
-- Students can see the total duration; individual exercise timing stays hidden.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
