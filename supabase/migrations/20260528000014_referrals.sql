-- ─── Referral system ─────────────────────────────────────────────────────────

-- 1. Add referral_code column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. Backfill codes for existing users
UPDATE public.profiles
SET referral_code = UPPER(SUBSTRING(MD5(id::text), 1, 6))
WHERE referral_code IS NULL;

-- 3. Trigger function: auto-generate code on new profile insert
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.id::text), 1, 6));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

-- 4. Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email   TEXT NOT NULL,
  referred_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  discount_applied BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referrer_id, referred_email)
);

-- 5. RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Students can read their own referrals (rows they referred)
CREATE POLICY "students_read_own_referrals"
  ON public.referrals
  FOR SELECT
  USING (referrer_id = auth.uid());

-- Authenticated users can insert a referral where they are the referred user
CREATE POLICY "referred_user_can_insert"
  ON public.referrals
  FOR INSERT
  WITH CHECK (referred_id = auth.uid());

-- Admin can do everything
CREATE POLICY "admin_all_referrals"
  ON public.referrals
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
