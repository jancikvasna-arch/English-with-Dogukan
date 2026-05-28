import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('[supabase] Missing env vars — DB features disabled until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.')
}

export const supabase = (url && key)
  ? createClient(url, key)
  : null

// ─── Helpers ──────────────────────────────────────────────────

/** Save a questionnaire submission (guest or logged-in). Returns the new row id. */
export async function saveQuestionnaire(data, studentId = null) {
  if (!supabase) return null
  // Generate UUID client-side so we never need to SELECT back the row
  // (avoids RLS SELECT-after-INSERT issues for anonymous users)
  const id = crypto.randomUUID()
  const { error } = await supabase
    .from('questionnaire_submissions')
    .insert({
      id,
      student_id:         studentId,
      guest_name:         data.name,
      guest_email:        data.email,
      native_language:    data.nativeLanguage || null,
      level:              data.level,
      goal:               data.goal,
      challenge:          data.challenge,
      background:         data.background,
      time_commitment:    data.time,
      content_preference: data.content,
      path:               'questionnaire',
    })
  if (error) { console.error('[supabase] saveQuestionnaire:', error); return null }
  return id
}

/** Save placement test results (guest or logged-in). */
export async function savePlacementResult(results, submissionId = null, studentId = null) {
  if (!supabase) return null
  const id = crypto.randomUUID()
  const { error } = await supabase
    .from('placement_results')
    .insert({
      id,
      submission_id:      submissionId,
      student_id:         studentId,
      grammar_score:      results.grammar_score,
      vocabulary_score:   results.vocabulary_score,
      reading_score:      results.reading_score,
      overall_score:      results.overall_score,
      cefr_level:         results.level,
      level_name:         results.level_name,
      strengths:          results.strengths,
      areas_to_improve:   results.areas_to_improve,
      writing_answer:     results.writing_answer,
      teacher_notes:      results.teacher_notes,
      recommended_course: results.recommended_course,
    })
  if (error) { console.error('[supabase] savePlacementResult:', error); return null }
  return id
}

/** After a guest signs up, link their previous submissions to their new account. */
export async function linkGuestData(email, userId) {
  if (!supabase) return

  // Step 1: link questionnaire submissions
  await supabase
    .from('questionnaire_submissions')
    .update({ student_id: userId })
    .eq('guest_email', email)
    .is('student_id', null)

  // Step 2: fetch submission IDs now linked to this user
  // (SELECT policy: auth.uid() = student_id — should match after step 1)
  const { data: subs } = await supabase
    .from('questionnaire_submissions')
    .select('id')
    .eq('guest_email', email)
    .eq('student_id', userId)

  // Step 3: link placement results via those submission IDs
  if (subs && subs.length > 0) {
    const ids = subs.map(s => s.id)
    await supabase
      .from('placement_results')
      .update({ student_id: userId })
      .is('student_id', null)
      .in('submission_id', ids)
  }
}

/** Fetch all students with their latest submission + result (admin only). */
export async function fetchAllStudents() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('questionnaire_submissions')
    .select(`
      id, guest_name, guest_email, level, goal, challenge,
      background, time_commitment, content_preference, submitted_at,
      profiles:student_id ( name, email, created_at ),
      placement_results ( * )
    `)
    .order('submitted_at', { ascending: false })
  if (error) { console.error('[supabase] fetchAllStudents:', error); return [] }
  return data ?? []
}

/** Fetch a single student's data by submission id (admin only). */
export async function fetchStudent(submissionId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('questionnaire_submissions')
    .select(`
      *, profiles:student_id (*), placement_results (*)
    `)
    .eq('id', submissionId)
    .single()
  if (error) { console.error('[supabase] fetchStudent:', error); return null }
  return data
}

// ─── Exercise helpers (student) ───────────────────────────────

/** Fetch a student's exercise assignments with exercise title/description. */
export async function fetchMyExercises(studentId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('exercise_assignments')
    .select('*, exercises ( id, title, description, course, lesson_no, context_images ), lesson_plans ( id, title, description )')
    .eq('student_id', studentId)
    .order('assigned_at', { ascending: false })
  if (error) { console.error('[supabase] fetchMyExercises:', error); return [] }
  return data ?? []
}

/** Fetch questions for a student's exercise — excludes correct_answer. */
export async function fetchQuestionsForStudent(exerciseId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('questions')
    .select('id, exercise_id, order_index, type, prompt, options, hint')
    .eq('exercise_id', exerciseId)
    .order('order_index')
  if (error) { console.error('[supabase] fetchQuestionsForStudent:', error); return [] }
  return data ?? []
}

/** Fetch questions including correct_answer — used in the post-submission review view. */
export async function fetchQuestionsForReview(exerciseId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('questions')
    .select('id, exercise_id, order_index, type, prompt, options, hint, correct_answer')
    .eq('exercise_id', exerciseId)
    .order('order_index')
  if (error) { console.error('[supabase] fetchQuestionsForReview:', error); return [] }
  return data ?? []
}

/** Fetch a student's own submitted answers for one assignment (includes review marks). */
export async function fetchMyAnswersForAssignment(assignmentId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('student_answers')
    .select('id, question_id, answer, is_correct, teacher_comment')
    .eq('assignment_id', assignmentId)
  if (error) { console.error('[supabase] fetchMyAnswersForAssignment:', error); return [] }
  return data ?? []
}

/** Submit all answers for an assignment (one-shot). */
export async function submitExerciseAnswers(assignmentId, answersMap, studentId) {
  // answersMap: { [questionId]: answerString }
  if (!supabase) return false
  const rows = Object.entries(answersMap).map(([questionId, answer]) => ({
    assignment_id: assignmentId,
    question_id:   questionId,
    student_id:    studentId,
    answer:        answer ?? '',
  }))
  const { error: ansErr } = await supabase
    .from('student_answers')
    .upsert(rows, { onConflict: 'assignment_id,question_id' })
  if (ansErr) { console.error('[supabase] submitExerciseAnswers answers:', ansErr); return false }
  const { error: asgErr } = await supabase
    .from('exercise_assignments')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', assignmentId)
  if (asgErr) { console.error('[supabase] submitExerciseAnswers status:', asgErr); return false }
  return true
}

// ─── Exercise helpers (admin) ─────────────────────────────────

/** Fetch all exercises with labels + new fields (library + assign dropdown). */
export async function fetchAllExercises() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('exercises')
    .select('id, title, course, lesson_no, context_text, audio_url, estimated_minutes, stage_type, book_id, unit, page, section, exercise_no, thumbnail, books ( id, title ), exercise_labels ( label_id, labels ( id, name, color ) )')
    .order('book_id', { nullsFirst: true })
    .order('unit',    { nullsFirst: true })
    .order('page',    { nullsFirst: true })
    .order('exercise_no', { nullsFirst: true })
  if (error) { console.error('[supabase] fetchAllExercises:', error); return [] }
  return (data ?? []).map(ex => ({
    ...ex,
    labels: (ex.exercise_labels || []).map(el => el.labels).filter(Boolean),
  }))
}

/** Fetch all student profiles for the assign dropdown (excludes admin). */
export async function fetchStudentProfiles() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email')
    .neq('role', 'admin')
    .order('name')
  if (error) { console.error('[supabase] fetchStudentProfiles:', error); return [] }
  return data ?? []
}

/** Assign an exercise to a student. */
export async function assignExercise({ exerciseId, studentId, assignedBy, mode, note, dueDate }) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('exercise_assignments')
    .insert({
      exercise_id: exerciseId,
      student_id:  studentId,
      assigned_by: assignedBy,
      mode:        mode   || 'homework',
      note:        note   || null,
      due_date:    dueDate || null,
    })
    .select()
    .single()
  if (error) { console.error('[supabase] assignExercise:', error); return null }
  return data
}

/** Fetch all assignments with exercise + student info (admin list view). */
export async function fetchAllAssignmentsAdmin() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('exercise_assignments')
    .select(`
      id, mode, status, note, assigned_at, submitted_at,
      exercises ( id, title, course, lesson_no ),
      student_id
    `)
    .order('assigned_at', { ascending: false })
  if (error) { console.error('[supabase] fetchAllAssignmentsAdmin:', error); return [] }
  return data ?? []
}

/** Fetch all assignments for one student (admin use — student profile page). */
export async function fetchStudentAssignmentsAdmin(studentId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('exercise_assignments')
    .select('id, mode, status, note, assigned_at, submitted_at, exercises ( id, title, course )')
    .eq('student_id', studentId)
    .order('assigned_at', { ascending: false })
  if (error) { console.error('[supabase] fetchStudentAssignmentsAdmin:', error); return [] }
  return data ?? []
}

/** Fetch full assignment details for review (includes correct_answer + student answers). */
export async function fetchAssignmentDetails(assignmentId) {
  if (!supabase) return null
  const [{ data: assignment, error: aErr }, { data: answers, error: anErr }] = await Promise.all([
    supabase
      .from('exercise_assignments')
      .select(`*, exercises ( *, questions ( * ) ), profiles:student_id ( name, email )`)
      .eq('id', assignmentId)
      .single(),
    supabase
      .from('student_answers')
      .select('*')
      .eq('assignment_id', assignmentId),
  ])
  if (aErr)  { console.error('[supabase] fetchAssignmentDetails assignment:', aErr);  return null }
  if (anErr) { console.error('[supabase] fetchAssignmentDetails answers:',    anErr); return null }
  return { ...assignment, studentAnswers: answers ?? [] }
}

/** Save teacher review (is_correct + comment) for multiple answers at once. */
export async function saveAnswerReviews(reviews) {
  // reviews: [{ id, is_correct, teacher_comment }]
  if (!supabase || !reviews.length) return
  for (const r of reviews) {
    const { error } = await supabase
      .from('student_answers')
      .update({
        is_correct:      r.is_correct,
        teacher_comment: r.teacher_comment || null,
        reviewed_at:     new Date().toISOString(),
      })
      .eq('id', r.id)
    if (error) console.error('[supabase] saveAnswerReviews:', error)
  }
}

/** Admin: save overall exercise feedback (one comment per assignment). */
export async function saveExerciseFeedback(assignmentId, feedbackText) {
  if (!supabase) return false
  const { error } = await supabase
    .from('exercise_assignments')
    .update({ teacher_feedback: feedbackText || null, feedback_at: new Date().toISOString() })
    .eq('id', assignmentId)
  if (error) { console.error('[supabase] saveExerciseFeedback:', error); return false }
  return true
}

/** Admin: update teacher notes and mark writing as reviewed. */
export async function reviewWriting(resultId, notes) {
  if (!supabase) return
  const { error } = await supabase
    .from('placement_results')
    .update({ teacher_notes: notes, writing_reviewed: true })
    .eq('id', resultId)
  if (error) console.error('[supabase] reviewWriting:', error)
}

// ─── Exercise Builder ─────────────────────────────────────────

/** Create a new exercise with all its questions in one shot. */
export async function createExerciseWithQuestions({ title, description, course, lessonNo, contextImages, contextText, audioUrl, estimatedMinutes, stageType, bookId, unit, page, section, exerciseNo, thumbnail }, questions) {
  if (!supabase) return null
  const exerciseId = crypto.randomUUID()
  const { error: exErr } = await supabase.from('exercises').insert({
    id:                exerciseId,
    title,
    description:       description    || null,
    course:            course         || null,
    lesson_no:         lessonNo       || null,
    context_images:    contextImages?.length ? contextImages : null,
    context_text:      contextText    || null,
    audio_url:         audioUrl       || null,
    estimated_minutes: estimatedMinutes || null,
    stage_type:        stageType ?? 'controlled_exercise',
    book_id:           bookId         || null,
    unit:              unit           || null,
    page:              page           || null,
    section:           section        || null,
    exercise_no:       exerciseNo     || null,
    thumbnail:         thumbnail      || null,
  })
  if (exErr) { console.error('[supabase] createExercise:', exErr); return null }

  const rows = questions.map((q, i) => ({
    exercise_id:    exerciseId,
    order_index:    i + 1,
    type:           q.type,
    prompt:         q.prompt,
    options:        q.options ?? null,
    correct_answer: q.correct_answer || null,
    hint:           q.hint           || null,
  }))
  const { error: qErr } = await supabase.from('questions').insert(rows)
  if (qErr) { console.error('[supabase] createQuestions:', qErr); return null }
  return exerciseId
}

/** Admin: permanently delete an exercise and its questions. */
export async function deleteExercise(exerciseId) {
  if (!supabase) return false
  const { error } = await supabase.from('exercises').delete().eq('id', exerciseId)
  if (error) { console.error('[supabase] deleteExercise:', error); return false }
  return true
}

/** Fetch a single exercise with all its questions + labels (admin, for editing / preview). */
export async function fetchExerciseWithQuestions(exerciseId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('exercises')
    .select('*, stage_type, book_id, unit, page, section, exercise_no, thumbnail, books ( id, title ), questions(*), exercise_labels ( label_id, labels ( id, name, color ) )')
    .eq('id', exerciseId)
    .single()
  if (error) { console.error('[supabase] fetchExerciseWithQuestions:', error); return null }
  if (data?.questions) data.questions.sort((a, b) => a.order_index - b.order_index)
  if (data) data.labels = (data.exercise_labels || []).map(el => el.labels).filter(Boolean)
  return data
}

/** Update an existing exercise and replace all its questions. */
export async function updateExerciseWithQuestions(exerciseId, { title, description, contextImages, contextText, audioUrl, estimatedMinutes, stageType, bookId, unit, page, section, exerciseNo, thumbnail }, questions) {
  if (!supabase) return null
  const { error: exErr } = await supabase.from('exercises').update({
    title,
    description:       description    || null,
    context_images:    contextImages?.length ? contextImages : null,
    context_text:      contextText    || null,
    audio_url:         audioUrl       || null,
    estimated_minutes: estimatedMinutes || null,
    stage_type:        stageType ?? 'controlled_exercise',
    book_id:           bookId         || null,
    unit:              unit           || null,
    page:              page           || null,
    section:           section        || null,
    exercise_no:       exerciseNo     || null,
    thumbnail:         thumbnail      || null,
  }).eq('id', exerciseId)
  if (exErr) { console.error('[supabase] updateExercise:', exErr); return null }

  const { error: delErr } = await supabase.from('questions').delete().eq('exercise_id', exerciseId)
  if (delErr) { console.error('[supabase] deleteQuestions:', delErr); return null }

  if (questions.length > 0) {
    const rows = questions.map((q, i) => ({
      exercise_id:    exerciseId,
      order_index:    i + 1,
      type:           q.type,
      prompt:         q.prompt,
      options:        q.options ?? null,
      correct_answer: q.correct_answer || null,
      hint:           q.hint           || null,
    }))
    const { error: qErr } = await supabase.from('questions').insert(rows)
    if (qErr) { console.error('[supabase] updateQuestions:', qErr); return null }
  }
  return exerciseId
}

// ─── Lesson Plans ─────────────────────────────────────────────

/** Fetch all lesson plans with stages + legacy exercises (admin). */
export async function fetchAllLessonPlans() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('lesson_plans')
    .select(`
      id, title, description, created_at,
      student_id, manual_student_id, lesson_aim, teaching_point, language_analysis, scheduled_at,
      profiles:student_id ( id, name, email, english_level ),
      manual_students:manual_student_id ( id, name, email, english_level ),
      lesson_stages ( id, order_index, stage_number, stage_name, stage_type, title, duration_minutes, exercise_id, content_text, audio_url, content_images, exercises ( id, title, course ) ),
      lesson_plan_exercises ( order_index, exercises ( id, title, course ) )
    `)
    .order('created_at', { ascending: false })
  if (error) { console.error('[supabase] fetchAllLessonPlans:', error); return [] }
  return data ?? []
}

/** Create a lesson plan and link exercises to it. */
export async function createLessonPlan(title, description, createdBy, exerciseIds) {
  if (!supabase) return null
  const planId = crypto.randomUUID()
  const { error: planErr } = await supabase.from('lesson_plans').insert({
    id:          planId,
    title,
    description: description || null,
    created_by:  createdBy,
  })
  if (planErr) { console.error('[supabase] createLessonPlan:', planErr); return null }

  if (exerciseIds.length > 0) {
    const rows = exerciseIds.map((exId, i) => ({
      lesson_plan_id: planId,
      exercise_id:    exId,
      order_index:    i + 1,
    }))
    const { error: lpErr } = await supabase.from('lesson_plan_exercises').insert(rows)
    if (lpErr) { console.error('[supabase] createLessonPlanExercises:', lpErr); return null }
  }
  return planId
}

// ─── Access Levels & Profiles ─────────────────────────────────

/** Fetch the logged-in student's own profile. */
export async function fetchMyProfile(userId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, access_level, access_granted_at, created_at')
    .eq('id', userId)
    .single()
  if (error) { console.error('[supabase] fetchMyProfile:', error); return null }
  return data
}

/** Update the user's display name. */
export async function updateMyName(userId, name) {
  if (!supabase) return false
  const { error } = await supabase
    .from('profiles')
    .update({ name })
    .eq('id', userId)
  if (error) { console.error('[supabase] updateMyName:', error); return false }
  return true
}

/** Admin: set a student's English level (admin-only, not visible to student). */
export async function updateStudentEnglishLevel(studentId, englishLevel) {
  if (!supabase) return false
  const { error } = await supabase
    .from('profiles')
    .update({ english_level: englishLevel || null })
    .eq('id', studentId)
  if (error) { console.error('[supabase] updateStudentEnglishLevel:', error); return false }
  return true
}

/** Admin: change a student's access level. */
export async function updateStudentAccessLevel(studentId, accessLevel) {
  if (!supabase) return false
  const { error } = await supabase
    .from('profiles')
    .update({ access_level: accessLevel, access_granted_at: new Date().toISOString() })
    .eq('id', studentId)
  if (error) { console.error('[supabase] updateStudentAccessLevel:', error); return false }
  return true
}

/** Admin: fetch all non-admin student profiles with latest submission + result. */
export async function fetchStudentsAdmin() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, name, email, access_level, access_granted_at, created_at, english_level,
      questionnaire_submissions ( id, level, goal, submitted_at,
        placement_results ( id, cefr_level, overall_score, writing_reviewed ) )
    `)
    .eq('role', 'student')
    .order('created_at', { ascending: false })
  if (error) { console.error('[supabase] fetchStudentsAdmin:', error); return [] }
  return data ?? []
}

/** Admin: fetch manually created students (no auth account). */
export async function fetchManualStudents() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('manual_students')
    .select('id, name, email, english_level, notes, created_at')
    .order('name')
  if (error) { console.error('[supabase] fetchManualStudents:', error); return [] }
  return data ?? []
}

/** Admin: create a student record that doesn't require a Supabase auth account. */
export async function createManualStudent({ name, email, englishLevel, notes, createdBy }) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('manual_students')
    .insert({
      name:          name.trim(),
      email:         email?.trim() || null,
      english_level: englishLevel  || null,
      notes:         notes?.trim() || null,
      created_by:    createdBy     || null,
    })
    .select()
    .single()
  if (error) { console.error('[supabase] createManualStudent:', error); return null }
  return data
}

// ─── Lessons ──────────────────────────────────────────────────

/** Admin: fetch all lessons for a given student. */
export async function fetchStudentLessons(studentId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('student_id', studentId)
    .order('lesson_no', { ascending: true })
  if (error) { console.error('[supabase] fetchStudentLessons:', error); return [] }
  return data ?? []
}

/** Admin: create a new lesson record for a student. */
export async function createLesson({ studentId, lessonNo, title, scheduledAt, createdBy, durationMinutes }) {
  if (!supabase) return null
  const id = crypto.randomUUID()
  const { error } = await supabase.from('lessons').insert({
    id,
    student_id:       studentId,
    lesson_no:        lessonNo        || null,
    title:            title           || null,
    scheduled_at:     scheduledAt     || null,
    created_by:       createdBy,
    status:           'scheduled',
    duration_minutes: durationMinutes || null,
  })
  if (error) { console.error('[supabase] createLesson:', error); return null }
  return id
}

/** Admin: update lesson fields (notes, visibility, status, completion date). */
export async function updateLesson(lessonId, updates) {
  if (!supabase) return false
  const { error } = await supabase
    .from('lessons')
    .update(updates)
    .eq('id', lessonId)
  if (error) { console.error('[supabase] updateLesson:', error); return false }
  return true
}

/** Student: fetch own lessons (all statuses; app filters visibility on notes). */
export async function fetchMyLessons(userId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('student_id', userId)
    .order('lesson_no', { ascending: true })
  if (error) { console.error('[supabase] fetchMyLessons:', error); return [] }
  return data ?? []
}

/** Student: submit feedback on a lesson. */
export async function submitLessonFeedback(lessonId, feedback) {
  if (!supabase) return false
  const { error } = await supabase
    .from('lessons')
    .update({ student_feedback: feedback })
    .eq('id', lessonId)
  if (error) { console.error('[supabase] submitLessonFeedback:', error); return false }
  return true
}

// ─── Labels ───────────────────────────────────────────────────

/** Fetch all labels (admin). */
export async function fetchAllLabels() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('labels')
    .select('id, name, color')
    .order('name')
  if (error) { console.error('[supabase] fetchAllLabels:', error); return [] }
  return data ?? []
}

/** Create a new label. Returns the created label object or null. */
export async function createLabel(name, color) {
  if (!supabase) return null
  const id = crypto.randomUUID()
  const { data, error } = await supabase
    .from('labels')
    .insert({ id, name: name.trim(), color })
    .select()
    .single()
  if (error) { console.error('[supabase] createLabel:', error); return null }
  return data
}

/** Delete a label (cascades to exercise_labels). */
export async function deleteLabel(labelId) {
  if (!supabase) return false
  const { error } = await supabase.from('labels').delete().eq('id', labelId)
  if (error) { console.error('[supabase] deleteLabel:', error); return false }
  return true
}

/** Sync labels for an exercise — replaces the full set. */
export async function setExerciseLabels(exerciseId, labelIds) {
  if (!supabase) return true
  const { error: delErr } = await supabase
    .from('exercise_labels')
    .delete()
    .eq('exercise_id', exerciseId)
  if (delErr) { console.error('[supabase] setExerciseLabels delete:', delErr); return false }
  if (labelIds.length > 0) {
    const rows = labelIds.map(lid => ({ exercise_id: exerciseId, label_id: lid }))
    const { error: insErr } = await supabase.from('exercise_labels').insert(rows)
    if (insErr) { console.error('[supabase] setExerciseLabels insert:', insErr); return false }
  }
  return true
}

// ─── Books ───────────────────────────────────────────────────

export async function fetchAllBooks() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('books')
    .select('id, title')
    .order('title')
  if (error) { console.error('[supabase] fetchAllBooks:', error); return [] }
  return data ?? []
}

export async function createBook(title, createdBy) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('books')
    .insert({ title: title.trim(), created_by: createdBy || null })
    .select()
    .single()
  if (error) { console.error('[supabase] createBook:', error); return null }
  return data
}

export async function deleteBook(bookId) {
  if (!supabase) return false
  const { error } = await supabase.from('books').delete().eq('id', bookId)
  if (error) { console.error('[supabase] deleteBook:', error); return false }
  return true
}

export async function updateBook(bookId, title) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('books')
    .update({ title: title.trim() })
    .eq('id', bookId)
    .select()
    .single()
  if (error) { console.error('[supabase] updateBook:', error); return null }
  return data
}

/** Duplicate a lesson plan (copies metadata + all stages) as a new draft. */
export async function duplicateLessonPlan(planId, createdBy) {
  if (!supabase) return null

  // 1. Fetch the source plan + its stages
  const { data: src, error: fetchErr } = await supabase
    .from('lesson_plans')
    .select('title, description, lesson_aim, teaching_point, language_analysis, lesson_stages(*)')
    .eq('id', planId)
    .single()
  if (fetchErr || !src) { console.error('[supabase] duplicateLessonPlan fetch:', fetchErr); return null }

  // 2. Insert the new plan (no student assignment — starts as a draft)
  const { data: newPlan, error: planErr } = await supabase
    .from('lesson_plans')
    .insert({
      title:             `${src.title} (copy)`,
      description:       src.description       || null,
      lesson_aim:        src.lesson_aim        || null,
      teaching_point:    src.teaching_point    || null,
      language_analysis: src.language_analysis || null,
      created_by:        createdBy             || null,
    })
    .select('id')
    .single()
  if (planErr || !newPlan) { console.error('[supabase] duplicateLessonPlan insert plan:', planErr); return null }

  // 3. Copy stages
  if (src.lesson_stages?.length) {
    const stageRows = src.lesson_stages
      .sort((a, b) => a.order_index - b.order_index)
      .map(s => ({
        lesson_plan_id:   newPlan.id,
        order_index:      s.order_index,
        stage_number:     s.stage_number,
        stage_name:       s.stage_name,
        stage_type:       s.stage_type,
        title:            s.title,
        duration_minutes: s.duration_minutes,
        exercise_id:      s.exercise_id,
        content_text:     s.content_text,
        content_images:   s.content_images,
        audio_url:        s.audio_url,
      }))
    const { error: stageErr } = await supabase.from('lesson_stages').insert(stageRows)
    if (stageErr) { console.error('[supabase] duplicateLessonPlan stages:', stageErr); return null }
  }

  return newPlan.id
}

/** Permanently delete a lesson plan (cascades to lesson_stages via FK). */
export async function deleteLessonPlan(planId) {
  if (!supabase) return false
  const { error } = await supabase.from('lesson_plans').delete().eq('id', planId)
  if (error) { console.error('[supabase] deleteLessonPlan:', error); return false }
  return true
}

// ─── Lesson Plan with Stages ──────────────────────────────────

/** Shared helper: upsert stages for a plan (delete-then-insert). */
async function _saveStages(planId, stages) {
  const { error: delErr } = await supabase
    .from('lesson_stages').delete().eq('lesson_plan_id', planId)
  if (delErr) { console.error('[supabase] _saveStages delete:', delErr); return false }
  if (!stages.length) return true
  const rows = stages.map((s, i) => {
    const dur = s.durationMinutes === 'other'
      ? (parseInt(s.customDuration) || null)
      : (s.durationMinutes || null)
    return {
      lesson_plan_id:   planId,
      order_index:      i + 1,
      stage_number:     s.stageNumber  ?? null,
      stage_name:       s.stageName    || null,
      stage_type:       s.type,
      title:            s.title        || null,
      duration_minutes: dur,
      exercise_id:      s.exerciseId   || null,
      content_text:     s.contentText  || null,
      content_images:   s.contentImages?.length ? s.contentImages : null,
      audio_url:        s.audioUrl     || null,
    }
  })
  const { error } = await supabase.from('lesson_stages').insert(rows)
  if (error) { console.error('[supabase] _saveStages insert:', error); return false }
  return true
}

/** Create a lesson plan with stage blocks (v2: includes student + lesson metadata). */
export async function createLessonPlanWithStages(title, desc, createdBy, stages, meta = {}) {
  if (!supabase) return null
  const planId = crypto.randomUUID()
  const { error: planErr } = await supabase.from('lesson_plans').insert({
    id:                planId,
    title,
    description:       desc                      || null,
    created_by:        createdBy,
    student_id:        meta.studentId            || null,
    manual_student_id: meta.manualStudentId      || null,
    lesson_aim:        meta.lessonAim            || null,
    teaching_point:    meta.teachingPoint        || null,
    language_analysis: meta.languageAnalysis     || null,
    scheduled_at:      meta.scheduledAt          || null,
  })
  if (planErr) { console.error('[supabase] createLessonPlanWithStages:', planErr); return null }
  if (stages.length > 0) {
    const ok = await _saveStages(planId, stages)
    if (!ok) return null
  }
  return planId
}

/** Update a lesson plan's metadata + replace all stages. */
export async function updateLessonPlanWithStages(planId, title, desc, stages, meta = {}) {
  if (!supabase) return null
  const { error: planErr } = await supabase
    .from('lesson_plans').update({
      title,
      description:       desc                      || null,
      student_id:        meta.studentId            || null,
      manual_student_id: meta.manualStudentId      || null,
      lesson_aim:        meta.lessonAim            || null,
      teaching_point:    meta.teachingPoint        || null,
      language_analysis: meta.languageAnalysis     || null,
      scheduled_at:      meta.scheduledAt          || null,
    }).eq('id', planId)
  if (planErr) { console.error('[supabase] updateLessonPlanWithStages:', planErr); return null }
  const ok = await _saveStages(planId, stages)
  return ok ? planId : null
}

// ─── Lesson Plan (edit — legacy exercise list) ────────────────

/** Update an existing lesson plan (title, description, exercise list). */
export async function updateLessonPlan(planId, title, desc, exerciseIds) {
  if (!supabase) return null
  const { error: planErr } = await supabase
    .from('lesson_plans')
    .update({ title, description: desc || null })
    .eq('id', planId)
  if (planErr) { console.error('[supabase] updateLessonPlan:', planErr); return null }

  const { error: delErr } = await supabase
    .from('lesson_plan_exercises')
    .delete()
    .eq('lesson_plan_id', planId)
  if (delErr) { console.error('[supabase] updateLessonPlan delete exercises:', delErr); return null }

  if (exerciseIds.length > 0) {
    const rows = exerciseIds.map((exId, i) => ({
      lesson_plan_id: planId,
      exercise_id:    exId,
      order_index:    i + 1,
    }))
    const { error: insErr } = await supabase.from('lesson_plan_exercises').insert(rows)
    if (insErr) { console.error('[supabase] updateLessonPlan insert exercises:', insErr); return null }
  }
  return planId
}

/** Assign all exercise stages in a lesson plan to a student.
 *  Uses lesson_stages (new builder) if present; falls back to lesson_plan_exercises. */
export async function assignLessonPlan({ planId, studentId, assignedBy, mode, note }) {
  if (!supabase) return false

  // Try new stage-based exercises first
  const { data: stages } = await supabase
    .from('lesson_stages')
    .select('exercise_id, order_index')
    .eq('lesson_plan_id', planId)
    .in('stage_type', ['controlled_exercise', 'free_exercise'])
    .not('exercise_id', 'is', null)
    .order('order_index')

  let exerciseList = stages?.length ? stages : null

  if (!exerciseList) {
    // Fall back to legacy lesson_plan_exercises
    const { data: planExs, error: peErr } = await supabase
      .from('lesson_plan_exercises')
      .select('exercise_id, order_index')
      .eq('lesson_plan_id', planId)
      .order('order_index')
    if (peErr || !planExs?.length) {
      console.error('[supabase] assignLessonPlan: no exercises found', peErr)
      return false
    }
    exerciseList = planExs
  }

  const rows = exerciseList.map(pe => ({
    exercise_id:    pe.exercise_id,
    student_id:     studentId,
    assigned_by:    assignedBy,
    mode:           mode || 'homework',
    note:           note || null,
    lesson_plan_id: planId,
  }))
  const { error } = await supabase.from('exercise_assignments').insert(rows)
  if (error) { console.error('[supabase] assignLessonPlan insert:', error); return false }
  return true
}

// ─── Badges ───────────────────────────────────────────────────

/** Fetch all badge definitions (the full catalogue). */
export async function fetchBadgeDefinitions() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('badge_definitions')
    .select('*')
    .order('sort_order')
  if (error) { console.error('[supabase] fetchBadgeDefinitions:', error); return [] }
  return data ?? []
}

/** Fetch all badges a specific student has earned. */
export async function fetchStudentBadges(studentId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('student_badges')
    .select('badge_key, earned_at')
    .eq('student_id', studentId)
  if (error) { console.error('[supabase] fetchStudentBadges:', error); return [] }
  return data ?? []
}

/**
 * Award a badge to a student (no-op if already earned — unique constraint).
 * Called from the frontend after the triggering action completes.
 */
export async function awardBadge(studentId, badgeKey) {
  if (!supabase || !studentId || !badgeKey) return false
  const { error } = await supabase
    .from('student_badges')
    .insert({ student_id: studentId, badge_key: badgeKey })
  // ignore unique-violation (23505) — badge already earned is not an error
  if (error && error.code !== '23505') {
    console.error('[supabase] awardBadge:', error)
    return false
  }
  return true
}

// ─── Teacher lesson notes ─────────────────────────────────────

/** Update post-lesson notes on a lesson record (admin only). */
export async function updateLessonNotes(lessonId, { teacherNotes, teacherNotesPublic }) {
  if (!supabase) return false
  const { error } = await supabase
    .from('lessons')
    .update({
      teacher_notes:        teacherNotes        ?? null,
      teacher_notes_public: teacherNotesPublic  ?? null,
    })
    .eq('id', lessonId)
  if (error) { console.error('[supabase] updateLessonNotes:', error); return false }
  return true
}

/** Fetch the student's next upcoming lesson (first future lesson by scheduled_at). */
export async function fetchNextLesson(studentId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title, scheduled_at, duration_minutes, teacher_notes_public')
    .eq('student_id', studentId)
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') {
    console.error('[supabase] fetchNextLesson:', error)
  }
  return data ?? null
}

/** Fetch all lessons for admin student detail view (includes new note fields). */
export async function fetchStudentLessonsAdmin(studentId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('lessons')
    .select('id, lesson_no, title, scheduled_at, status, duration_minutes, student_feedback, teacher_notes, teacher_notes_public, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[supabase] fetchStudentLessonsAdmin:', error); return [] }
  return data ?? []
}

/**
 * Check which badges a student has newly earned after an action and award them.
 * Returns array of newly-awarded badge keys (can be used to show toast/confetti).
 * Safe to call any time — already-earned badges are skipped (unique constraint).
 */
export async function checkAndAwardBadges(studentId) {
  if (!supabase || !studentId) return []

  const [earned, assignmentsRes, lessonsRes] = await Promise.all([
    fetchStudentBadges(studentId),
    supabase
      .from('exercise_assignments')
      .select('id, exercises(stage_type)')
      .eq('student_id', studentId)
      .eq('status', 'submitted'),
    supabase
      .from('lessons')
      .select('id')
      .eq('student_id', studentId)
      .in('status', ['completed', 'confirmed']),
  ])

  const earnedKeys    = new Set(earned.map(b => b.badge_key))
  const assignments   = assignmentsRes.data ?? []
  const completedCount = assignments.length
  const stageTypes    = assignments.map(a => a.exercises?.stage_type).filter(Boolean)
  const lessonCount   = lessonsRes.data?.length ?? 0

  const candidates = []

  // Exercise count milestones
  if (completedCount >= 1  && !earnedKeys.has('first_exercise'))  candidates.push('first_exercise')
  if (completedCount >= 10 && !earnedKeys.has('exercises_10'))    candidates.push('exercises_10')
  if (completedCount >= 25 && !earnedKeys.has('exercises_25'))    candidates.push('exercises_25')
  if (completedCount >= 50 && !earnedKeys.has('exercises_50'))    candidates.push('exercises_50')

  // Stage-type badges
  if (stageTypes.includes('free_exercise') && !earnedKeys.has('first_writing'))
    candidates.push('first_writing')
  if ((stageTypes.includes('listening') || stageTypes.includes('viewing')) && !earnedKeys.has('first_listening'))
    candidates.push('first_listening')

  // Lesson attendance milestones
  if (lessonCount >= 5  && !earnedKeys.has('lessons_5'))  candidates.push('lessons_5')
  if (lessonCount >= 10 && !earnedKeys.has('lessons_10')) candidates.push('lessons_10')

  if (!candidates.length) return []
  await Promise.all(candidates.map(key => awardBadge(studentId, key)))
  return candidates
}

// ─── Student vocabulary log ───────────────────────────────────

export async function fetchMyVocabulary(studentId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('student_vocabulary')
    .select('id, word, definition, exercise_id, added_at, exercises(title)')
    .eq('student_id', studentId)
    .order('added_at', { ascending: false })
  if (error) { console.error('[supabase] fetchMyVocabulary:', error); return [] }
  return data ?? []
}

export async function addVocabularyWord({ studentId, word, definition, exerciseId }) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('student_vocabulary')
    .insert({
      student_id:  studentId,
      word:        word.trim(),
      definition:  definition?.trim() || null,
      exercise_id: exerciseId || null,
    })
    .select()
    .single()
  if (error) { console.error('[supabase] addVocabularyWord:', error); return null }
  return data
}

export async function deleteVocabularyWord(wordId) {
  if (!supabase) return false
  const { error } = await supabase.from('student_vocabulary').delete().eq('id', wordId)
  if (error) { console.error('[supabase] deleteVocabularyWord:', error); return false }
  return true
}

// ─── Referrals ────────────────────────────────────────────────

/** Fetch this student's referral code. */
export async function fetchMyReferralCode(studentId) {
  if (!supabase) return null
  const { data } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', studentId)
    .single()
  return data?.referral_code ?? null
}

/** Fetch referrals made by this student. */
export async function fetchMyReferrals(studentId) {
  if (!supabase) return []
  const { data } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', studentId)
    .order('created_at', { ascending: false })
  return data ?? []
}

/** Look up a referral code — returns referrer profile or null. */
export async function lookupReferralCode(code) {
  if (!supabase) return null
  const { data } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('referral_code', code.toUpperCase().trim())
    .single()
  return data ?? null
}

/** Log a referral when a new user signs up with a code. */
export async function logReferral({ referrerId, referredEmail, referredId }) {
  if (!supabase) return false
  const { error } = await supabase
    .from('referrals')
    .insert({ referrer_id: referrerId, referred_email: referredEmail, referred_id: referredId })
  return !error
}

/** Admin: toggle discount applied on a referral. */
export async function markDiscountApplied(referralId, applied) {
  if (!supabase) return false
  const { error } = await supabase
    .from('referrals')
    .update({ discount_applied: applied })
    .eq('id', referralId)
  return !error
}

/** Admin: fetch all referrals with referrer name and email. */
export async function fetchAllReferrals() {
  if (!supabase) return []
  const { data } = await supabase
    .from('referrals')
    .select('*, referrer:profiles!referrals_referrer_id_fkey(name, email)')
    .order('created_at', { ascending: false })
  return data ?? []
}
