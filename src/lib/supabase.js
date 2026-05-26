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
  const { data: row, error } = await supabase
    .from('questionnaire_submissions')
    .insert({
      student_id:         studentId,
      guest_name:         data.name,
      guest_email:        data.email,
      level:              data.level,
      goal:               data.goal,
      challenge:          data.challenge,
      background:         data.background,
      time_commitment:    data.time,
      content_preference: data.content,
      path:               'questionnaire',
    })
    .select('id')
    .single()
  if (error) console.error('[supabase] saveQuestionnaire:', error)
  return row?.id ?? null
}

/** Save placement test results (guest or logged-in). */
export async function savePlacementResult(results, submissionId = null, studentId = null) {
  if (!supabase) return null
  const { data: row, error } = await supabase
    .from('placement_results')
    .insert({
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
    .select('id')
    .single()
  if (error) console.error('[supabase] savePlacementResult:', error)
  return row?.id ?? null
}

/** After a guest signs up, link their previous submissions to their new account. */
export async function linkGuestData(email, userId) {
  if (!supabase) return
  await supabase
    .from('questionnaire_submissions')
    .update({ student_id: userId })
    .eq('guest_email', email)
    .is('student_id', null)

  await supabase
    .from('placement_results')
    .update({ student_id: userId })
    .is('student_id', null)
    .in(
      'submission_id',
      supabase
        .from('questionnaire_submissions')
        .select('id')
        .eq('guest_email', email)
    )
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

/** Admin: update teacher notes and mark writing as reviewed. */
export async function reviewWriting(resultId, notes) {
  if (!supabase) return
  const { error } = await supabase
    .from('placement_results')
    .update({ teacher_notes: notes, writing_reviewed: true })
    .eq('id', resultId)
  if (error) console.error('[supabase] reviewWriting:', error)
}
