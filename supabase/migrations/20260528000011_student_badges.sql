-- ─────────────────────────────────────────────────────────────────────────────
-- Student badge / achievement system
--
-- badge_definitions  – the catalogue of possible badges (seeded below)
-- student_badges     – which student has earned which badge (with timestamp)
--
-- Award logic runs client-side after each relevant action and calls
-- awardBadge(studentId, badgeKey).  RLS ensures students can read their
-- own badges; only admin (or the service role) can insert them.
--
-- Future SaaS note: add org_id to badge_definitions once multi-tenant.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Badge catalogue
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  key         TEXT PRIMARY KEY,           -- e.g. 'first_exercise'
  name        TEXT NOT NULL,             -- e.g. 'First Step'
  description TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '🏅',
  sort_order  INTEGER DEFAULT 0
);

INSERT INTO public.badge_definitions (key, name, description, emoji, sort_order) VALUES
  ('first_exercise',   'First Step',       'Completed your first exercise',                        '🎯', 1),
  ('exercises_10',     'Bookworm',         'Completed 10 exercises',                               '📚', 2),
  ('exercises_25',     'Dedicated',        'Completed 25 exercises',                               '💪', 3),
  ('exercises_50',     'Expert',           'Completed 50 exercises',                               '🏆', 4),
  ('streak_3weeks',    'On a Roll',        'Completed exercises in 3 consecutive weeks',           '🔥', 5),
  ('first_writing',    'Writer',           'Submitted your first writing exercise',                '✍️', 6),
  ('first_listening',  'Good Listener',    'Completed your first listening exercise',              '🎧', 7),
  ('perfect_lesson',   'Perfectionist',    'Completed every exercise in a lesson plan',            '💯', 8),
  ('lessons_5',        'Committed',        'Attended 5 lessons',                                   '📅', 9),
  ('lessons_10',       'Regular',          'Attended 10 lessons',                                  '🌟', 10),
  ('level_up',         'Level Up',         'Your English level has been upgraded by your teacher', '⬆️', 11),
  ('first_feedback',   'Gold Star',        'Received feedback from your teacher',                  '⭐', 12)
ON CONFLICT (key) DO NOTHING;

-- 2. Per-student earned badges
CREATE TABLE IF NOT EXISTS public.student_badges (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key  TEXT        NOT NULL REFERENCES public.badge_definitions(key) ON DELETE CASCADE,
  earned_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, badge_key)   -- a badge can only be earned once
);

CREATE INDEX IF NOT EXISTS student_badges_student_idx ON public.student_badges(student_id);

ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- Students can read their own badges
DROP POLICY IF EXISTS "student_badges: student read own" ON public.student_badges;
CREATE POLICY "student_badges: student read own"
  ON public.student_badges FOR SELECT
  USING (student_id = auth.uid());

-- Admin can read all + insert (award badges)
DROP POLICY IF EXISTS "student_badges: admin all" ON public.student_badges;
CREATE POLICY "student_badges: admin all"
  ON public.student_badges FOR ALL
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- badge_definitions is public-readable (no sensitive data)
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badge_definitions: public read" ON public.badge_definitions;
CREATE POLICY "badge_definitions: public read"
  ON public.badge_definitions FOR SELECT
  USING (true);
