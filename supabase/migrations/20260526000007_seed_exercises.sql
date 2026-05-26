-- ─────────────────────────────────────────────────────────────────────────────
-- Seed data: 2 prototype exercises
-- Run this AFTER 20260526000006_exercises_system.sql
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  ex_beginner    UUID := 'eeee0001-0000-0000-0000-000000000001';
  ex_elementary  UUID := 'eeee0002-0000-0000-0000-000000000002';
BEGIN

-- ── Exercise 1: Beginner A1 — Lesson 1: Greetings & Introductions ─────────────
INSERT INTO public.exercises (id, title, description, course, lesson_no)
VALUES (
  ex_beginner,
  'Lesson 1 — Greetings & Introductions',
  'A few exercises to warm up before our lesson. Take your time — you can change your answers until you press Submit.',
  'beginner',
  1
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.questions (exercise_id, order_index, type, prompt, options, correct_answer, hint)
VALUES
  (ex_beginner, 1, 'multiple_choice',
   'What is the correct way to greet someone in the morning?',
   '["Good evening!", "Good morning!", "Good night!", "See you later!"]',
   'Good morning!', NULL),

  (ex_beginner, 2, 'fill_blank',
   'Complete the sentence: "___ are you?" — "I''m fine, thank you!"',
   NULL, 'How', 'How / What / Where'),

  (ex_beginner, 3, 'multiple_choice',
   'Which phrase do you use when you meet someone for the first time?',
   '["See you tomorrow!", "Nice to meet you!", "Goodbye!", "Have a nice day!"]',
   'Nice to meet you!', NULL),

  (ex_beginner, 4, 'fill_blank',
   'Complete the sentence: "My name ___ Maria."',
   NULL, 'is', 'am / is / are'),

  (ex_beginner, 5, 'multiple_choice',
   'Which sentence is correct?',
   '["I are a student.", "She am a teacher.", "He is a doctor.", "They is friends."]',
   'He is a doctor.', NULL),

  (ex_beginner, 6, 'fill_blank',
   'Complete the sentence: "I ___ from Turkey."',
   NULL, 'am', 'am / is / are'),

  (ex_beginner, 7, 'free_text',
   'Write 2 sentences to introduce yourself. Include your name and where you are from.',
   NULL, NULL,
   'Example: My name is Anna. I am from Spain.')

ON CONFLICT DO NOTHING;


-- ── Exercise 2: Elementary A1→A2 — Lesson 1: Verb "To Be" ────────────────────
INSERT INTO public.exercises (id, title, description, course, lesson_no)
VALUES (
  ex_elementary,
  'Lesson 1 — The Verb "To Be" & Personal Information',
  'Practice "to be" in positive, negative, and question forms. Edit your answers freely before submitting.',
  'elementary',
  1
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.questions (exercise_id, order_index, type, prompt, options, correct_answer, hint)
VALUES
  (ex_elementary, 1, 'multiple_choice',
   'Which sentence is grammatically correct?',
   '["I is happy.", "She are tired.", "We am students.", "They are at home."]',
   'They are at home.', NULL),

  (ex_elementary, 2, 'fill_blank',
   'Complete the sentence: "___ she from France?" (question form)',
   NULL, 'Is', 'Is / Are / Am'),

  (ex_elementary, 3, 'multiple_choice',
   'What is the negative form of "She is busy"?',
   '["She not busy.", "She isn''t busy.", "She aren''t busy.", "She amn''t busy."]',
   'She isn''t busy.', NULL),

  (ex_elementary, 4, 'fill_blank',
   'Complete the sentence: "My parents ___ both doctors."',
   NULL, 'are', 'is / am / are'),

  (ex_elementary, 5, 'multiple_choice',
   'Which question is correct?',
   '["Where are you from?", "Where you are from?", "Where is you from?", "From where you?"]',
   'Where are you from?', NULL),

  (ex_elementary, 6, 'fill_blank',
   'Complete the sentence: "Tom and I ___ best friends."',
   NULL, 'are', 'is / am / are'),

  (ex_elementary, 7, 'free_text',
   'Write 3 sentences about yourself: your name, your job or what you study, and where you are from.',
   NULL, NULL,
   'Example: My name is Kenji. I am an engineer. I am from Japan.')

ON CONFLICT DO NOTHING;

END $$;
