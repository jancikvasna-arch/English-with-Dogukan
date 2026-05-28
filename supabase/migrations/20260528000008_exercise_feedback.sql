-- ─────────────────────────────────────────────────────────────────────────────
-- Exercise feedback: Dogukan writes one feedback comment per assignment.
-- Visible to the student after the lesson. Replaces per-question grading UX.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.exercise_assignments
  ADD COLUMN IF NOT EXISTS teacher_feedback TEXT,
  ADD COLUMN IF NOT EXISTS feedback_at      TIMESTAMPTZ;
