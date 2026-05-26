-- ─────────────────────────────────────────────────────────────────────────────
-- Exercise system: exercises → questions → assignments → student_answers
-- ─────────────────────────────────────────────────────────────────────────────

-- ── exercises ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exercises (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT,
  course      TEXT,                          -- 'beginner' | 'elementary' | 'intermediate' | 'business'
  lesson_no   INT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── questions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.questions (
  id             UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id    UUID  NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index    INT   NOT NULL DEFAULT 0,
  type           TEXT  NOT NULL CHECK (type IN ('multiple_choice', 'fill_blank', 'free_text')),
  prompt         TEXT  NOT NULL,
  options        JSONB,        -- MC: ["Option A", "Option B", ...]
  correct_answer TEXT,         -- MC / fill_blank; NULL for free_text
  hint           TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ── exercise_assignments (Dogukan assigns an exercise to a specific student) ──
CREATE TABLE IF NOT EXISTS public.exercise_assignments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id  UUID        NOT NULL REFERENCES public.exercises(id)  ON DELETE CASCADE,
  student_id   UUID        NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  assigned_by  UUID        REFERENCES auth.users(id),
  mode         TEXT        DEFAULT 'homework' CHECK (mode IN ('homework', 'in_class')),
  status       TEXT        DEFAULT 'assigned' CHECK (status IN ('assigned', 'submitted')),
  note         TEXT,                         -- optional message from Dogukan to the student
  due_date     TIMESTAMPTZ,
  assigned_at  TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

-- ── student_answers ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_answers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   UUID        NOT NULL REFERENCES public.exercise_assignments(id) ON DELETE CASCADE,
  question_id     UUID        NOT NULL REFERENCES public.questions(id)           ON DELETE CASCADE,
  student_id      UUID        NOT NULL REFERENCES auth.users(id)                 ON DELETE CASCADE,
  answer          TEXT,
  is_correct      BOOLEAN,    -- set by admin during review; NULL until reviewed
  teacher_comment TEXT,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (assignment_id, question_id)
);

-- ── Row Level Security ─────────────────────────────────────────────────────────

ALTER TABLE public.exercises            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers      ENABLE ROW LEVEL SECURITY;

-- exercises: admin full access; students can read exercises they are assigned to
CREATE POLICY "exercises: admin all"   ON public.exercises FOR ALL     USING (public.is_admin());
CREATE POLICY "exercises: student read" ON public.exercises FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.exercise_assignments ea
    WHERE ea.exercise_id = exercises.id AND ea.student_id = auth.uid()
  )
);

-- questions: admin full access; students can read questions for their assigned exercises
CREATE POLICY "questions: admin all"    ON public.questions FOR ALL     USING (public.is_admin());
CREATE POLICY "questions: student read" ON public.questions FOR SELECT  USING (
  EXISTS (
    SELECT 1 FROM public.exercise_assignments ea
    WHERE ea.exercise_id = questions.exercise_id AND ea.student_id = auth.uid()
  )
);

-- assignments: admin full access; students can read their own
CREATE POLICY "assignments: admin all"     ON public.exercise_assignments FOR ALL    USING (public.is_admin());
CREATE POLICY "assignments: student select" ON public.exercise_assignments FOR SELECT USING (student_id = auth.uid());

-- student_answers: admin full access; students can manage their own
CREATE POLICY "answers: admin all"      ON public.student_answers FOR ALL    USING (public.is_admin());
CREATE POLICY "answers: student select" ON public.student_answers FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "answers: student insert" ON public.student_answers FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "answers: student update" ON public.student_answers FOR UPDATE USING (student_id = auth.uid());
