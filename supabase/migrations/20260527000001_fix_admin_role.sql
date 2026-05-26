-- ─────────────────────────────────────────────────────────────────────────────
-- Fix admin role — profiles.role was never set to 'admin' for the admin account
-- because the handle_new_user trigger always inserted with the default 'student'.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Fix the existing admin profile
UPDATE public.profiles
SET    role         = 'admin',
       access_level = 'trial'
WHERE  email = 'dogukan.cy@gmail.com';

-- 2. Update the trigger so admin email always gets the right role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, access_level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN NEW.email = 'dogukan.cy@gmail.com' THEN 'admin'  ELSE 'student' END,
    CASE WHEN NEW.email = 'dogukan.cy@gmail.com' THEN 'trial'  ELSE 'pending' END
  );
  RETURN NEW;
END;
$$;
