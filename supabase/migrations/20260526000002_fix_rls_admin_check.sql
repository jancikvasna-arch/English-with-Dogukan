-- Fix infinite recursion in admin RLS policies.
-- Replace inline EXISTS(SELECT FROM profiles) with a SECURITY DEFINER function
-- that bypasses RLS when checking the caller's role.

-- ─── Helper: is the current user an admin? ────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- ─── Fix profiles admin read policy ──────────────────────────
DROP POLICY IF EXISTS "profiles: admin read" ON public.profiles;
CREATE POLICY "profiles: admin read" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- ─── Fix questionnaire_submissions admin read policy ─────────
DROP POLICY IF EXISTS "questionnaire: admin read" ON public.questionnaire_submissions;
CREATE POLICY "questionnaire: admin read" ON public.questionnaire_submissions
  FOR SELECT USING (public.is_admin());

-- ─── Fix placement_results admin read + update policies ──────
DROP POLICY IF EXISTS "results: admin read"   ON public.placement_results;
DROP POLICY IF EXISTS "results: admin update" ON public.placement_results;
CREATE POLICY "results: admin read" ON public.placement_results
  FOR SELECT USING (public.is_admin());
CREATE POLICY "results: admin update" ON public.placement_results
  FOR UPDATE USING (public.is_admin());
