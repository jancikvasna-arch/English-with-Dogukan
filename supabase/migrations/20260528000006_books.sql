-- ─────────────────────────────────────────────────────────────────────────────
-- Books: Dogukan manages a list of textbooks. Each exercise can be tagged
-- with the book it comes from so the library is easier to navigate.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.books (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (title)
);
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "books: admin all" ON public.books;
CREATE POLICY "books: admin all"
  ON public.books
  FOR ALL
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Link each exercise to an optional book
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS book_id UUID REFERENCES public.books(id) ON DELETE SET NULL;
