-- Add student_annotations column to exercise_assignments.
-- Stores per-image annotation data (circles + lines) drawn by the student.
-- Format: JSON array, one entry per context image index:
--   [ { "circles": [{cx,cy,rx,ry,color},...], "lines": [{x1,y1,x2,y2,color,thickness},...] }, ... ]
ALTER TABLE public.exercise_assignments
  ADD COLUMN IF NOT EXISTS student_annotations JSONB;
