-- ─────────────────────────────────────────────────────────────────────────────
-- Access levels + Lessons table
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add access_level to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'pending'
    CHECK (access_level IN ('pending', 'trial', 'pay_per_lesson', 'bundle_12')),
  ADD COLUMN IF NOT EXISTS access_granted_at TIMESTAMPTZ;

-- Admin profile should not be gated — give admin an unrestricted level
UPDATE public.profiles SET access_level = 'trial' WHERE role = 'admin';

-- Allow admin to update any profile (for setting access levels)
CREATE POLICY "profiles: admin update" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- 2. Update new-user trigger to explicitly set access_level
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, access_level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'pending'
  );
  RETURN NEW;
END;
$$;

-- 3. Lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_no        INT,
  title            TEXT,
  scheduled_at     TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  status           TEXT        NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  teacher_notes    TEXT,
  notes_visible    BOOLEAN     NOT NULL DEFAULT false,
  student_feedback TEXT,
  created_by       UUID        REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lessons: admin all"
  ON public.lessons FOR ALL USING (public.is_admin());

CREATE POLICY "lessons: student read"
  ON public.lessons FOR SELECT USING (student_id = auth.uid());

-- Students can update only their own feedback column
-- (We rely on the app layer to only send student_feedback in updates)
CREATE POLICY "lessons: student feedback"
  ON public.lessons FOR UPDATE USING (student_id = auth.uid());
