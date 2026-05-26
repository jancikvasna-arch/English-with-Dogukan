-- ─── Profiles ────────────────────────────────────────────────
-- Extends auth.users with name, role, and display info
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT,
  role        TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Students can read & update their own profile
CREATE POLICY "profiles: own read"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: own update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- Admins can read all profiles
CREATE POLICY "profiles: admin read" ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Auto-create profile row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── Questionnaire Submissions ────────────────────────────────
-- Guests submit without an account; student_id linked later on signup
CREATE TABLE public.questionnaire_submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_name          TEXT,
  guest_email         TEXT,
  level               TEXT,
  goal                TEXT,
  challenge           TEXT,
  background          TEXT,
  time_commitment     TEXT,
  content_preference  TEXT,
  path                TEXT CHECK (path IN ('questionnaire', 'consultation')),
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.questionnaire_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (including guests) can insert
CREATE POLICY "questionnaire: anyone insert" ON public.questionnaire_submissions
  FOR INSERT WITH CHECK (true);
-- Logged-in students can read their own
CREATE POLICY "questionnaire: own read" ON public.questionnaire_submissions
  FOR SELECT USING (auth.uid() = student_id);
-- Admins can read all
CREATE POLICY "questionnaire: admin read" ON public.questionnaire_submissions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
-- Allow linking guest submissions to a newly signed-up student
CREATE POLICY "questionnaire: link on signup" ON public.questionnaire_submissions
  FOR UPDATE USING (true) WITH CHECK (auth.uid() = student_id);


-- ─── Placement Results ────────────────────────────────────────
CREATE TABLE public.placement_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id       UUID REFERENCES public.questionnaire_submissions(id) ON DELETE SET NULL,
  student_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  grammar_score       INTEGER,
  vocabulary_score    INTEGER,
  reading_score       INTEGER,
  overall_score       INTEGER,
  cefr_level          TEXT,
  level_name          TEXT,
  strengths           TEXT[],
  areas_to_improve    TEXT[],
  writing_answer      TEXT,
  writing_reviewed    BOOLEAN DEFAULT FALSE,
  teacher_notes       TEXT,
  recommended_course  TEXT,
  completed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.placement_results ENABLE ROW LEVEL SECURITY;

-- Anyone (guests) can insert
CREATE POLICY "results: anyone insert" ON public.placement_results
  FOR INSERT WITH CHECK (true);
-- Logged-in students read own
CREATE POLICY "results: own read" ON public.placement_results
  FOR SELECT USING (auth.uid() = student_id);
-- Admins read all
CREATE POLICY "results: admin read" ON public.placement_results
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
-- Admins can update (for writing review and teacher notes)
CREATE POLICY "results: admin update" ON public.placement_results
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
-- Allow linking guest results on signup
CREATE POLICY "results: link on signup" ON public.placement_results
  FOR UPDATE USING (true) WITH CHECK (auth.uid() = student_id);


-- ─── Seed: make Dogukan an admin ─────────────────────────────
-- This runs after a profile row is created for dogukan.cy@gmail.com
-- We use a trigger so it works whether he signs up before or after migration
CREATE OR REPLACE FUNCTION public.promote_admin_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email = 'dogukan.cy@gmail.com' THEN
    UPDATE public.profiles SET role = 'admin' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_check_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.promote_admin_on_signup();
