ALTER TABLE public.lesson_plans
  ADD COLUMN IF NOT EXISTS english_level TEXT
    CHECK (english_level IN ('elementary', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS lesson_level  TEXT;
  -- lesson_level stores 'Level 1' through 'Level 12' as free text
