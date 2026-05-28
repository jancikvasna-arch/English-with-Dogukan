-- ─────────────────────────────────────────────────────────────────────────────
-- Lesson plan v2: student assignment, lesson metadata, numbered stages.
--
-- lesson_plans gains:
--   student_id         → which auth student this plan is for (nullable)
--   manual_student_id  → which manually-created student (nullable, if no auth)
--   lesson_aim         → Dogukan's written lesson aim
--   teaching_point     → key teaching point for the lesson
--   language_analysis  → teacher's language analysis notes
--   scheduled_at       → optional date/time of the lesson
--
-- lesson_stages gains:
--   stage_number       → numbered group this item belongs to (1-10)
--   stage_name         → optional label for the stage group (e.g. "Warm-up")
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extend lesson_plans
ALTER TABLE public.lesson_plans
  ADD COLUMN IF NOT EXISTS student_id        UUID REFERENCES public.profiles(id)        ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manual_student_id UUID REFERENCES public.manual_students(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lesson_aim        TEXT,
  ADD COLUMN IF NOT EXISTS teaching_point    TEXT,
  ADD COLUMN IF NOT EXISTS language_analysis TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at      TIMESTAMPTZ;

-- 2. Extend lesson_stages with numbered grouping
ALTER TABLE public.lesson_stages
  ADD COLUMN IF NOT EXISTS stage_number INTEGER,
  ADD COLUMN IF NOT EXISTS stage_name   TEXT;
