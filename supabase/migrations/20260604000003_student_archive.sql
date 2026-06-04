-- Soft-delete / archive for students.
-- Archived students are hidden from the main Students list and shown in the
-- "Student Archive" panel (restorable). Safe to re-run.
ALTER TABLE public.profiles        ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
ALTER TABLE public.manual_students ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
