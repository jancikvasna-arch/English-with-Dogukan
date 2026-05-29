-- ─────────────────────────────────────────────────────────────────────────────
-- Lesson notes: per-exercise (or plan-level) notes written during a live lesson.
--
-- The teacher (admin) can write notes against any exercise in a lesson plan,
-- or a general plan-level note (exercise_id IS NULL). The assigned student can
-- read all notes for their plans, and can also insert their own notes.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lesson_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The lesson plan this note belongs to (required)
  plan_id     UUID        NOT NULL
                          REFERENCES public.lesson_plans(id) ON DELETE CASCADE,

  -- The specific exercise this note relates to; NULL = plan-level note
  exercise_id UUID
                          REFERENCES public.exercises(id) ON DELETE SET NULL,

  -- Who wrote the note
  author_id   UUID        NOT NULL
                          REFERENCES auth.users(id),

  -- Note body — must not be blank
  content     TEXT        NOT NULL CHECK (char_length(content) > 0),

  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Fast lookup of all notes for a given plan
CREATE INDEX IF NOT EXISTS lesson_notes_plan_id_idx
  ON public.lesson_notes (plan_id);

-- Fast lookup of notes for a specific exercise within a plan
CREATE INDEX IF NOT EXISTS lesson_notes_plan_exercise_idx
  ON public.lesson_notes (plan_id, exercise_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

-- Admin: full access to all notes
DROP POLICY IF EXISTS "lesson_notes: admin all" ON public.lesson_notes;
CREATE POLICY "lesson_notes: admin all"
  ON public.lesson_notes FOR ALL
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Student read: can SELECT notes where the plan is assigned to them
DROP POLICY IF EXISTS "lesson_notes: student read" ON public.lesson_notes;
CREATE POLICY "lesson_notes: student read"
  ON public.lesson_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.lesson_plans lp
      WHERE lp.id = lesson_notes.plan_id
        AND lp.student_id = auth.uid()
    )
  );

-- Student insert: can INSERT notes on their own plans, attributed to themselves
DROP POLICY IF EXISTS "lesson_notes: student insert" ON public.lesson_notes;
CREATE POLICY "lesson_notes: student insert"
  ON public.lesson_notes FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.lesson_plans lp
      WHERE lp.id = lesson_notes.plan_id
        AND lp.student_id = auth.uid()
    )
  );
