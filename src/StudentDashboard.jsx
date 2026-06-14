// Auto-extracted from App.jsx (Task #9 split). See lib/shared.js for shared constants/utils.
import { useState, useEffect } from 'react'
import { addVocabularyWord, checkAndAwardBadges, deleteVocabularyWord, fetchBadgeDefinitions, fetchExerciseWithQuestions, fetchLessonPlanForStudent, fetchMyAnswersForAssignment, fetchMyExercises, fetchMyLessons, fetchMyProfile, fetchMyReferralCode, fetchMyReferrals, fetchMyTestAssignments, fetchMyVocabulary, fetchNextLesson, fetchQuestionsForReview, fetchQuestionsForStudent, fetchStudentBadges, startLessonPlanExercise, supabase, updateMyName } from './lib/supabase'
import { STAGE_TYPES } from './lib/shared'
import { AnnotatedImage, EmbeddedMedia, ExerciseDemoPlayer, ExercisePlayer, InlineExerciseContent, NotesSection, StudentSubmissionReview, TestPlayer } from './ExerciseComponents.jsx'
import { PlacementTestFrame } from './PublicPages.jsx'

export const ACCESS_META = {
  pending:        { label: 'Awaiting activation',  color: '#94a3b8', desc: 'Book your free consultation to get started.' },
  test_approved:  { label: 'Placement test',       color: '#a78bfa', desc: 'Take your placement test below to get started.' },
  trial:          { label: 'Trial access',         color: '#60a5fa', desc: 'You have full access during your trial.' },
  pay_per_lesson: { label: 'Pay per lesson',       color: '#4ade80', desc: 'Active — book your next lesson anytime.' },
  bundle_12:      { label: 'Bundle — 12 lessons',  color: '#d4a853', desc: 'Track your progress across all 12 lessons below.' },
}

export function AccessBadge({ level, style = {} }) {
  const m = ACCESS_META[level] || ACCESS_META.pending
  return (
    <span className="access-badge" style={{ '--badge-color': m.color, ...style }}>{m.label}</span>
  )
}

// ─── getWeeklyProgress helper ─────────────────────────────────
export function getWeeklyProgress(assignments) {
  const now = new Date()
  const weeks = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - i * 7 - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    const count = assignments.filter(a =>
      a.status === 'submitted' && a.submitted_at &&
      new Date(a.submitted_at) >= weekStart &&
      new Date(a.submitted_at) < weekEnd
    ).length
    const label = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    weeks.push({ label, count })
  }
  return weeks
}

// ─── AnnotatedImage ──────────────────────────────────────────
// Wraps an image with an SVG overlay for drawing circles/ovals and arrow lines.
// Annotations are session-only (not persisted).

export function StudentDashboard({ user, onSignOut, onBook, onSettings }) {
  const [profile,     setProfile]     = useState(null)
  const [result,      setResult]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [assignments, setAssignments] = useState([])
  const [lessons,     setLessons]     = useState([])
  const [activeAssignment,  setActiveAssignment]  = useState(null)
  const [viewingSubmission, setViewingSubmission] = useState(null) // {assignment, questions, answerMap}
  const [nextLesson,   setNextLesson]   = useState(null)
  const [badgeDefs,    setBadgeDefs]    = useState([])
  const [earnedBadges, setEarnedBadges] = useState([]) // [{badge_key, earned_at}]
  const [newBadges,    setNewBadges]    = useState([]) // keys of just-earned badges (for toast)
  const [vocabulary,      setVocabulary]      = useState([])
  const [vocabWord,       setVocabWord]       = useState('')
  const [vocabDef,        setVocabDef]        = useState('')
  const [addingVocab,     setAddingVocab]     = useState(false)
  const [vocabSaving,     setVocabSaving]     = useState(false)
  const [showVocab,       setShowVocab]       = useState(false)
  const [referralCode,    setReferralCode]    = useState(null)
  const [myReferrals,     setMyReferrals]     = useState([])
  const [referralCopied,  setReferralCopied]  = useState(false)
  const [takingTest,    setTakingTest]    = useState(false)
  const [testDoneData,  setTestDoneData]  = useState(null) // payload from postMessage

  // Active lesson plan (nested inside a lesson record)
  const [activePlan,            setActivePlan]            = useState(null) // plan object
  const [activePlanExercise,    setActivePlanExercise]    = useState(null) // { exercise, questions }
  const [loadingPlanExId,       setLoadingPlanExId]       = useState(null)
  const [viewingPlanSubmission, setViewingPlanSubmission] = useState(null) // {assignment,questions,answerMap}
  const [loadingViewPlanExId,   setLoadingViewPlanExId]   = useState(null)
  // Inline exercise preview in the plan stage list
  const [activePlanExCache,     setActivePlanExCache]     = useState({}) // exerciseId → full exercise obj
  const [activePlanLoadingEx,   setActivePlanLoadingEx]   = useState(false)
  const [activePlanExpanded,    setActivePlanExpanded]    = useState(new Set()) // expanded stage IDs (non-exercise)
  const [activePlanDemoAns,     setActivePlanDemoAns]     = useState({}) // exerciseId → { qId → val }
  // Inline exercise player state
  const [inlineOpenIds,    setInlineOpenIds]    = useState(new Set())   // stageIds with inline player open
  const [inlinePlayerData, setInlinePlayerData] = useState({})          // stageId → { exercise, assignment }
  const [openingLessonId,  setOpeningLessonId]  = useState(null)        // lesson id being opened
  const [myTestAssignments, setMyTestAssignments] = useState([])
  const [activeTest,        setActiveTest]        = useState(null) // assignment obj

  useEffect(() => {
    if (!supabase || !user) { setLoading(false); return }
    Promise.all([
      fetchMyProfile(user.id),
      supabase.from('placement_results').select('*')
        .eq('student_id', user.id).order('completed_at', { ascending: false }).limit(1).single(),
      fetchMyExercises(user.id),
      fetchMyLessons(user.id),
      fetchNextLesson(user.id),
      fetchBadgeDefinitions(),
      fetchStudentBadges(user.id),
      fetchMyVocabulary(user.id),
      fetchMyReferralCode(user.id),
      fetchMyReferrals(user.id),
    ]).then(([prof, { data: res }, exs, lsns, nextL, defs, earned, vocab, refCode, refs]) => {
      setProfile(prof)
      setResult(res)
      setAssignments(exs)
      setLessons(lsns)
      setNextLesson(nextL)
      setBadgeDefs(defs)
      setEarnedBadges(earned)
      setVocabulary(vocab)
      setReferralCode(refCode)
      setMyReferrals(refs)
      setLoading(false)
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchMyTestAssignments(user.id).then(setMyTestAssignments)
  }, [user?.id])

  // Pre-fetch full exercise data (with questions) whenever a plan is opened
  useEffect(() => {
    if (!activePlan) return
    const ids = [...new Set(
      (activePlan.lesson_stages ?? []).map(s => s.exercises?.id || s.exercise_id).filter(Boolean)
    )]
    if (!ids.length) return
    setActivePlanLoadingEx(true)
    setActivePlanExpanded(new Set()) // collapse all when switching plans
    setInlineOpenIds(new Set())
    setInlinePlayerData({})
    setActivePlanDemoAns({})
    Promise.all(ids.map(id => fetchExerciseWithQuestions(id))).then(results => {
      const cache = {}
      results.forEach(ex => { if (ex) cache[ex.id] = ex })
      setActivePlanExCache(cache)
      setActivePlanLoadingEx(false)
    })
  }, [activePlan?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlanStage = (stageId) =>
    setActivePlanExpanded(prev => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })

  const openExercise = async (assignment) => {
    const qs = await fetchQuestionsForStudent(assignment.exercises.id)
    setActiveAssignment({ assignment, questions: qs })
  }

  const handleViewSubmission = async (assignment) => {
    const [qs, ans] = await Promise.all([
      fetchQuestionsForReview(assignment.exercises.id),
      fetchMyAnswersForAssignment(assignment.id),
    ])
    const answerMap = Object.fromEntries(ans.map(sa => [sa.question_id, sa]))
    setViewingSubmission({ assignment, questions: qs, answerMap })
  }

  const handleAddVocab = async (e) => {
    e.preventDefault()
    if (!vocabWord.trim()) return
    setVocabSaving(true)
    const entry = await addVocabularyWord({ studentId: user.id, word: vocabWord, definition: vocabDef })
    setVocabSaving(false)
    if (entry) {
      setVocabulary(prev => [entry, ...prev])
      setVocabWord(''); setVocabDef(''); setAddingVocab(false)
    }
  }

  const handleDeleteVocab = async (id) => {
    const ok = await deleteVocabularyWord(id)
    if (ok) setVocabulary(prev => prev.filter(v => v.id !== id))
  }

  const handleDownloadVocab = () => {
    if (!vocabulary.length) return
    const name = profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'vocabulary'
    const lines = [
      'Word\tDefinition',
      ...vocabulary.map(v => `${v.word}\t${v.definition || ''}`)
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/tab-separated-values;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}-vocabulary.tsv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Inline exercise: open exercise player inline within stage card
  const openInlineExercise = async (stageId, planId, exerciseId) => {
    if (inlineOpenIds.has(stageId)) {
      setInlineOpenIds(prev => { const n = new Set(prev); n.delete(stageId); return n })
      return
    }
    setLoadingPlanExId(exerciseId)
    const [full, assignment] = await Promise.all([
      fetchExerciseWithQuestions(exerciseId),
      startLessonPlanExercise(planId, exerciseId, user.id),
    ])
    setLoadingPlanExId(null)
    if (full) {
      setInlinePlayerData(prev => ({ ...prev, [stageId]: { exercise: full, assignment } }))
      setInlineOpenIds(prev => new Set([...prev, stageId]))
    }
  }

  const closeInlineExercise = (stageId) =>
    setInlineOpenIds(prev => { const n = new Set(prev); n.delete(stageId); return n })

  // Open a lesson's linked plan. Uses the embedded plan when present,
  // otherwise fetches it by lesson_plan_id (covers cases where the embed is empty).
  const openLesson = async (lesson) => {
    if (lesson.lesson_plans) { setActivePlan(lesson.lesson_plans); return }
    if (!lesson.lesson_plan_id) return
    setOpeningLessonId(lesson.id)
    const plan = await fetchLessonPlanForStudent(lesson.lesson_plan_id)
    setOpeningLessonId(null)
    if (plan) setActivePlan(plan)
    else alert("This lesson's content isn't available yet. Please check with Dogukan.")
  }

  // Legacy full-screen exercise open (kept for non-plan assignments)
  const openPlanExercise = async (planId, exerciseId) => {
    setLoadingPlanExId(exerciseId)
    const [full, assignment] = await Promise.all([
      fetchExerciseWithQuestions(exerciseId),
      startLessonPlanExercise(planId, exerciseId, user.id),
    ])
    setLoadingPlanExId(null)
    if (full) {
      setActivePlanExercise({ exercise: full, assignment })
    }
  }

  // After a student clicks Finish, immediately show them their submitted answers
  // (read-only) so they keep seeing what they wrote. Works for every exercise type.
  const showMyAnswers = async (assignment, exercise, inPlan) => {
    if (!assignment || !exercise) return
    const [qs, ans] = await Promise.all([
      fetchQuestionsForReview(exercise.id),
      fetchMyAnswersForAssignment(assignment.id),
    ])
    const answerMap = Object.fromEntries((ans || []).map(sa => [sa.question_id, sa]))
    const payload = { assignment: { ...assignment, exercises: exercise }, questions: qs, answerMap }
    if (inPlan) setViewingPlanSubmission(payload)
    else        setViewingSubmission(payload)
  }

  const openPlanSubmission = async (exerciseId) => {
    const asgn = assignments.find(a => (a.exercises?.id === exerciseId || a.exercise_id === exerciseId) && a.status === 'submitted')
    if (!asgn) return
    setLoadingViewPlanExId(exerciseId)
    const [qs, ans] = await Promise.all([
      fetchQuestionsForReview(exerciseId),
      fetchMyAnswersForAssignment(asgn.id),
    ])
    setLoadingViewPlanExId(null)
    const answerMap = Object.fromEntries(ans.map(sa => [sa.question_id, sa]))
    setViewingPlanSubmission({ assignment: asgn, questions: qs, answerMap })
  }

  if (viewingSubmission) {
    return (
      <StudentSubmissionReview
        assignment={viewingSubmission.assignment}
        questions={viewingSubmission.questions ?? []}
        answerMap={viewingSubmission.answerMap}
        onBack={() => setViewingSubmission(null)}
      />
    )
  }

  if (activeAssignment) {
    return (
      <ExercisePlayer
        assignment={activeAssignment.assignment}
        questions={activeAssignment.questions ?? []}
        studentId={user.id}
        onBack={() => setActiveAssignment(null)}
        onSubmitted={async (id) => {
          setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: 'submitted' } : a))
          await showMyAnswers(activeAssignment.assignment, activeAssignment.assignment.exercises, false)
          setActiveAssignment(null)
          // Check for newly earned badges
          const newlyEarned = await checkAndAwardBadges(user.id)
          if (newlyEarned.length > 0) {
            const updated = await fetchStudentBadges(user.id)
            setEarnedBadges(updated)
            setNewBadges(newlyEarned)
            setTimeout(() => setNewBadges([]), 5000)
          }
        }}
      />
    )
  }

  // Student: viewing a completed plan exercise submission (read-only)
  if (activePlan && viewingPlanSubmission) {
    return (
      <StudentSubmissionReview
        assignment={viewingPlanSubmission.assignment}
        questions={viewingPlanSubmission.questions ?? []}
        answerMap={viewingPlanSubmission.answerMap}
        onBack={() => setViewingPlanSubmission(null)}
        backLabel="← Back to lesson"
      />
    )
  }

  // Student: viewing an exercise inside a lesson plan (with notes)
  if (activePlan && activePlanExercise) {
    const { exercise: planEx, assignment: planAssignment } = activePlanExercise
    if (planAssignment) {
      return (
        <ExercisePlayer
          assignment={{ ...planAssignment, exercises: planEx }}
          questions={planEx?.questions ?? []}
          studentId={user.id}
          onBack={() => setActivePlanExercise(null)}
          onSubmitted={(id) => {
            // Update existing assignment if present, otherwise add it to state so isDone check works
            setAssignments(prev => {
              const exists = prev.some(a => a.id === id)
              if (exists) return prev.map(a => a.id === id ? { ...a, status: 'submitted' } : a)
              return [...prev, { ...planAssignment, exercises: planEx, status: 'submitted', submitted_at: new Date().toISOString() }]
            })
            setActivePlanExercise(null)
            showMyAnswers(planAssignment, planEx, true)
          }}
        />
      )
    }
    // Fallback: show demo if no assignment (shouldn't normally happen)
    return (
      <div className="flow-card dashboard-card">
        <ExerciseDemoPlayer
          exercise={planEx}
          questions={planEx?.questions ?? []}
          embedded={true}
          onBack={() => setActivePlanExercise(null)}
          lessonPlanId={activePlan.id}
          authorId={user.id}
          authorEmail={user.email}
        />
      </div>
    )
  }

  // Student: taking a test
  if (activeTest) {
    return (
      <div>
        <TestPlayer
          assignment={activeTest}
          studentId={user.id}
          onDone={() => {
            setActiveTest(null)
            fetchMyTestAssignments(user.id).then(setMyTestAssignments)
          }}
        />
      </div>
    )
  }

  // Student: viewing a lesson plan's stage list
  if (activePlan) {
    const allStages = (activePlan.lesson_stages ?? [])
      .slice()
      .sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0) || a.order_index - b.order_index)
    const lessonStages  = allStages.filter(s => (s.section ?? 'lesson') !== 'homework')
    const homeworkStages = allStages.filter(s => s.section === 'homework')
    const stageGroups   = lessonStages.reduce((acc, s) => {
      const num = s.stage_number ?? 1
      if (!acc[num]) acc[num] = { number: num, name: s.stage_name, items: [] }
      acc[num].items.push(s)
      return acc
    }, {})

    const planAssignments = assignments.filter(a => a.lesson_plan_id === activePlan.id)
    const exerciseStages  = allStages.filter(s => s.exercises)
    const doneCount = exerciseStages.filter(s => {
      const ex = s.exercises
      return planAssignments.some(a => (a.exercises?.id === ex.id || a.exercise_id === ex.id) && a.status === 'submitted')
    }).length
    const totalCount = exerciseStages.length

    const PLAN_STAGE_COLORS = {
      controlled_exercise: '#3b82f6',
      free_exercise:       '#059669',
      lead_in:             '#d97706',
      feedback:            '#7c3aed',
      instruction:         '#64748b',
      clarification:       '#dc2626',
    }
    const stageTypeDef = (type) => STAGE_TYPES.find(t => t.value === type) || { icon: '▸', label: type || 'Activity' }

    const renderStageItem = (stage, isHomework = false) => {
      const ex          = stage.exercises
      const exId        = ex?.id || stage.exercise_id
      const asgn        = exId ? planAssignments.find(a => a.exercises?.id === exId || a.exercise_id === exId) : null
      const isDone      = asgn?.status === 'submitted'
      const def         = stageTypeDef(stage.stage_type)
      const color       = PLAN_STAGE_COLORS[stage.stage_type] || '#94a3b8'
      const stageImages = Array.isArray(stage.content_images) ? stage.content_images : []
      const hasStageContent = !!(stage.content_text || stage.audio_url || stageImages.length)

      // Non-exercise stages: expand/collapse for content_images, text, audio
      const isContentExpanded = activePlanExpanded.has(stage.id)

      // Exercise stages: inline player
      const isInlineOpen   = inlineOpenIds.has(stage.id)
      const inlineData     = inlinePlayerData[stage.id]
      const isLoading      = loadingPlanExId === (exId || '')

      const headerClickable = !exId && hasStageContent
      return (
        <div key={stage.id} style={{
          background: isDone ? '#f0fdf4' : (isHomework ? '#fafaf8' : '#fff'),
          borderRadius: '10px',
          border: `1px solid ${isDone ? '#bbf7d0' : isInlineOpen ? '#a8c8e8' : '#e8e3d8'}`,
          borderLeft: `4px solid ${color}`,
          marginBottom: '0.45rem',
          overflow: 'hidden',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.65rem 0.85rem',
            cursor: headerClickable ? 'pointer' : 'default' }}
            onClick={() => headerClickable && togglePlanStage(stage.id)}>
            <span style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1 }}>{def.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: isDone ? '#15803d' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ex?.title || stage.title || def.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color, fontWeight: 600, background: `${color}18`, padding: '0.1rem 0.42rem', borderRadius: '20px' }}>
                  {def.label}
                </span>
                {stage.duration_minutes && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>⏱ {stage.duration_minutes} min</span>
                )}
              </div>
            </div>
            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
              {isDone && !isInlineOpen ? (
                <>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a' }}>✓ Done</span>
                  {ex && (
                    <>
                      <button className="btn-ghost" style={{ fontSize: '0.73rem', padding: '0.18rem 0.48rem' }}
                        onClick={e => { e.stopPropagation(); openPlanSubmission(ex.id) }}
                        disabled={loadingViewPlanExId === ex.id}>
                        {loadingViewPlanExId === ex.id ? '…' : '👁 My answers'}
                      </button>
                      <button className="btn-ghost" style={{ fontSize: '0.73rem', padding: '0.18rem 0.48rem' }}
                        onClick={e => { e.stopPropagation(); openInlineExercise(stage.id, activePlan.id, ex.id) }}
                        disabled={isLoading}>
                        {isLoading ? '…' : '↩ Redo'}
                      </button>
                    </>
                  )}
                </>
              ) : exId ? (
                <button className="btn-gold" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem', whiteSpace: 'nowrap',
                    background: isInlineOpen ? '#005580' : undefined }}
                  onClick={e => { e.stopPropagation(); openInlineExercise(stage.id, activePlan.id, exId) }}
                  disabled={isLoading}>
                  {isLoading ? '…' : isInlineOpen ? '▲ Collapse' : '▶ Start'}
                </button>
              ) : null}
              {/* Expand arrow only for non-exercise stages with stage-level content */}
              {!exId && hasStageContent && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.2rem' }}>
                  {isContentExpanded ? '▲' : '▼'}
                </span>
              )}
            </div>
          </div>

          {/* Inline exercise player */}
          {exId && isInlineOpen && (
            <div style={{ borderTop: `1px solid #d4e8f5`, background: '#f8fafc' }}>
              {inlineData?.assignment ? (
                <ExercisePlayer
                  assignment={{ ...inlineData.assignment, exercises: inlineData.exercise }}
                  questions={inlineData.exercise?.questions ?? []}
                  studentId={user.id}
                  embedded={true}
                  onBack={() => closeInlineExercise(stage.id)}
                  onSubmitted={(id) => {
                    setAssignments(prev => {
                      const exists = prev.some(a => a.id === id)
                      if (exists) return prev.map(a => a.id === id ? { ...a, status: 'submitted' } : a)
                      return [...prev, { ...inlineData.assignment, exercises: inlineData.exercise, status: 'submitted', submitted_at: new Date().toISOString() }]
                    })
                    closeInlineExercise(stage.id)
                    showMyAnswers(inlineData.assignment, inlineData.exercise, true)
                  }}
                />
              ) : inlineData ? (
                // No assignment created (e.g. no exercise_assignments row yet) — show read-only
                <div style={{ padding: '0.75rem 0.85rem' }}>
                  <InlineExerciseContent
                    exerciseId={exId}
                    exerciseCache={activePlanExCache}
                    loadingExercises={activePlanLoadingEx}
                    demoAnswers={activePlanDemoAns}
                    setDemoAnswers={setActivePlanDemoAns}
                  />
                </div>
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Loading exercise…
                </div>
              )}
            </div>
          )}

          {/* Non-exercise stage content: images, text, audio */}
          {!exId && isContentExpanded && hasStageContent && (
            <div style={{ borderTop: `1px solid ${isDone ? '#d1fae5' : '#f0ede6'}`, padding: '0.75rem 0.85rem' }}>
              {stage.audio_url && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <EmbeddedMedia url={stage.audio_url} label="🎧 Listen" />
                </div>
              )}
              {stage.content_text && (
                <div style={{ fontSize: '0.88rem', lineHeight: 1.65, marginBottom: stageImages.length ? '0.75rem' : 0 }}
                  dangerouslySetInnerHTML={{ __html: stage.content_text }} />
              )}
              {stageImages.map((src, i) => (
                <div key={i} style={{ marginBottom: i < stageImages.length - 1 ? '0.75rem' : 0 }}>
                  <AnnotatedImage src={src} />
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="flow-card dashboard-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* ── Header ── */}
        <div style={{ padding: '1.2rem 1.25rem 0.9rem', borderBottom: '1px solid #f0ede6' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.65rem' }}>
            <button className="back-btn" onClick={() => setActivePlan(null)}>
              ← Back to My Lessons
            </button>
            <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.7rem', marginLeft: 'auto' }} onClick={() => window.print()}>🖨 Print</button>
          </div>
          <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.25rem', lineHeight: 1.3 }}>{activePlan.title}</h2>
          {activePlan.description && (
            <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.87rem', lineHeight: 1.5 }}>{activePlan.description}</p>
          )}
          {totalCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.6rem' }}>
              <div style={{ flex: 1, height: '6px', background: '#e8e3d8', borderRadius: '9px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '9px', transition: 'width 0.4s ease',
                  background: doneCount === totalCount ? '#22c55e' : 'var(--gold)',
                  width: `${(doneCount / totalCount) * 100}%`,
                }} />
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0, fontWeight: 600 }}>
                {doneCount}/{totalCount} done
              </span>
            </div>
          )}
        </div>

        {/* ── Lesson stages ── */}
        <div style={{ padding: '0.9rem 1.25rem' }}>
          {Object.values(stageGroups).length > 0 ? (
            Object.values(stageGroups).map(group => (
              <div key={group.number} style={{ marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.55rem' }}>
                  <div style={{
                    background: 'var(--gold)', color: '#fff',
                    borderRadius: '50%', width: '22px', height: '22px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {group.number}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {group.name || `Stage ${group.number}`}
                  </span>
                </div>
                {group.items.map(s => renderStageItem(s))}
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '0.25rem 0' }}>No lesson stages yet.</p>
          )}
        </div>

        {/* ── Homework ── */}
        {homeworkStages.length > 0 && (
          <div style={{ borderTop: '1px solid #f0ede6', padding: '0.75rem 1.25rem 0.9rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
              📚 Homework
            </div>
            {homeworkStages.map(s => renderStageItem(s, true))}
          </div>
        )}

        {/* ── Notes ── */}
        <div style={{ borderTop: '1px solid #f0ede6', padding: '0.75rem 1.25rem 1.25rem' }}>
          <NotesSection
            planId={activePlan.id}
            exerciseId={null}
            authorId={user.id}
            authorEmail={user.email}
          />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flow-card text-center">
        <span className="confirmation-icon">🔒</span>
        <h2>Sign in to view your dashboard</h2>
        <p className="flow-sub">Create an account or sign in to access your lessons and results.</p>
      </div>
    )
  }

  if (takingTest) {
    return (
      <div className="flow-card dashboard-card">
        <button className="back-btn" onClick={() => setTakingTest(false)} style={{ marginBottom: '0.75rem' }}>
          ← Back to dashboard
        </button>
        <PlacementTestFrame
          userId={user.id}
          onComplete={(data) => {
            setTestDoneData(data)
            setResult({ cefr_level: data.cefr, overall_score: data.overallScore, writing_reviewed: false })
            setTakingTest(false)
          }}
        />
      </div>
    )
  }

  // Prospect gate — show only test, nothing else
  if (profile?.access_level === 'prospect') {
    const pendingTest = myTestAssignments.find(t => t.status === 'assigned')
    const completedTest = myTestAssignments.find(t => t.status === 'completed')

    if (activeTest) {
      return (
        <div>
          <TestPlayer
            assignment={activeTest}
            studentId={user.id}
            onDone={() => {
              setActiveTest(null)
              fetchMyTestAssignments(user.id).then(setMyTestAssignments)
            }}
          />
        </div>
      )
    }

    return (
      <div className="flow-wrapper">
        <div className="flow-header">
          <span className="flow-header-logo">English with Dogukan</span>
          <button className="back-link" onClick={onSignOut}>Sign out</button>
        </div>
        <div className="flow-content">
          <div className="flow-card" style={{ maxWidth: '520px', textAlign: 'center' }}>
            {completedTest ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <h2 style={{ marginBottom: '0.5rem' }}>Your results are being reviewed</h2>
                <p className="flow-sub">
                  Dogukan has received your diagnostic test results and will be in touch with you shortly.
                </p>
              </>
            ) : pendingTest ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <h2 style={{ marginBottom: '0.5rem' }}>Your diagnostic test is ready</h2>
                <p className="flow-sub" style={{ marginBottom: '1.75rem' }}>
                  This test takes around 25 minutes. It helps Dogukan understand your current level and plan your lessons around you.
                </p>
                <button className="btn-gold btn-full" style={{ fontSize: '1rem', padding: '0.85rem' }}
                  onClick={() => setActiveTest(pendingTest)}>
                  Start test →
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👋</div>
                <h2 style={{ marginBottom: '0.5rem' }}>Welcome!</h2>
                <p className="flow-sub">Your teacher will assign your diagnostic test shortly. Check back soon.</p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  const name = profile?.name || user.user_metadata?.name || user.email?.split('@')[0]
  const levelColors = { A1: '#94a3b8', A2: '#60a5fa', B1: '#3b82f6', B2: '#6366f1', C1: '#d4a853', C2: '#f59e0b' }
  const color = result ? (levelColors[result.cefr_level] || '#d4a853') : '#d4a853'
  const accessLevel = profile?.access_level || 'pending'
  const completedCount = lessons.filter(l => l.status === 'completed').length
  const isPending      = accessLevel === 'pending'
  const isTestApproved = accessLevel === 'test_approved'
  const hasTestResult  = !!result

  return (
    <div className="flow-card dashboard-card">
      {/* ── New badge toast ── */}
      {newBadges.length > 0 && (
        <div className="badge-toast">
          🎉 New badge{newBadges.length > 1 ? 's' : ''} earned!{' '}
          {newBadges.map(k => {
            const def = badgeDefs.find(d => d.key === k)
            return def ? ` ${def.emoji} ${def.name}` : ''
          }).join(' · ')}
        </div>
      )}
      <div className="dashboard-header">
        <div>
          <h2>Welcome back, {name}!</h2>
          <p className="flow-sub" style={{ marginBottom: 0 }}>Your English learning journey</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button className="btn-ghost" style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }} onClick={onSettings}>⚙️ Settings</button>
          <button className="btn-ghost" onClick={onSignOut}>Sign out</button>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-loading">Loading your data…</div>
      ) : (
        <>
          {/* ── Access level card ── */}
          <div className="access-card" style={{ '--badge-color': ACCESS_META[accessLevel]?.color || '#94a3b8' }}>
            <div className="access-card-left">
              <AccessBadge level={accessLevel} />
              <p className="access-card-desc">{ACCESS_META[accessLevel]?.desc}</p>
            </div>
            {!isPending && (
              <div className="access-bundle-progress">
                <span className="access-bundle-count">
                  {completedCount}{accessLevel === 'bundle_12' ? <span>/12</span> : null}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  lesson{completedCount !== 1 ? 's' : ''} done
                </span>
                {accessLevel === 'bundle_12' && (
                  <div style={{ width: '100%', background: '#e8e3d8', borderRadius: '4px', height: '4px', marginTop: '0.3rem' }}>
                    <div style={{ background: 'var(--gold)', height: '4px', borderRadius: '4px', width: `${Math.min((completedCount / 12) * 100, 100)}%`, transition: 'width 0.3s ease' }} />
                  </div>
                )}
              </div>
            )}
          </div>

          {isPending ? (
            <div className="dashboard-pending-msg">
              <p style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.6rem' }}>👋 You're almost in!</p>
              <p style={{ marginBottom: '0.75rem', lineHeight: 1.65 }}>
                Your portal will be activated after your first catch-up with Dogukan — he'll switch it on once you've had your intro consultation together.
              </p>
              <p style={{ marginBottom: '0.85rem', lineHeight: 1.65 }}>
                To get started, make sure you've booked your free consultation using the button below. Once that's done and you've spoken with Dogukan, you'll get full access to everything here. 🎉
              </p>
              <a href="https://calendly.com/dogukan-cy/free-english-course-consultation-50-mins" target="_blank" rel="noreferrer"
                className="btn-gold" style={{ display: 'inline-block', textDecoration: 'none', fontSize: '0.95rem', padding: '0.6rem 1.2rem' }}>
                📅 Book your free consultation →
              </a>
            </div>
          ) : (
            <>
              {/* Pending test notification */}
              {myTestAssignments.filter(t => t.status === 'assigned').map(t => (
                <div key={t.id} style={{ background: '#E6F1FB', border: '1.5px solid #a8c8e8', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>📋 Diagnostic test assigned</div>
                    <div style={{ fontSize: '0.85rem', color: '#2b72b5' }}>Your teacher has assigned you a diagnostic test (~25 min). Complete it when you're ready.</div>
                  </div>
                  <button className="btn-gold" style={{ flexShrink: 0 }} onClick={() => setActiveTest(t)}>
                    Start test →
                  </button>
                </div>
              ))}

              {/* ── My Lessons ── */}
              <div className="dashboard-exercises">
                <h3 className="dashboard-section-title">📅 My Lessons</h3>
                {nextLesson && (
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#15803d', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>🗓 Next lesson</div>
                      {nextLesson.title && <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '0.1rem' }}>{nextLesson.title}</div>}
                      <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                        {new Date(nextLesson.scheduled_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {new Date(nextLesson.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        {nextLesson.duration_minutes && <span style={{ color: '#4ade80' }}> · {nextLesson.duration_minutes} min</span>}
                      </div>
                    </div>
                  </div>
                )}
                {lessons.length === 0 && !nextLesson ? (
                  <div className="dashboard-actions">
                    <button className="btn-gold btn-full btn-lg" onClick={onBook}>
                      Book your first lesson →
                    </button>
                  </div>
                ) : lessons.length === 0 ? null : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {lessons.map((l, idx) => {
                      const hasDate = !!l.scheduled_at
                      const plan = l.lesson_plans
                      const fmtDate = (iso) => {
                        const d = new Date(iso)
                        return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                      }
                      const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

                      return (
                        <div key={l.id} style={{ background: '#fff', borderRadius: '10px', border: `1px solid ${hasDate ? '#e8e3d8' : '#d4d0c8'}`, padding: '0.8rem 1rem', opacity: l.status === 'cancelled' ? 0.55 : 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                                {l.lesson_no ? `Lesson ${l.lesson_no}` : `Lesson ${idx + 1}`}
                                {l.title && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>— {l.title}</span>}
                              </div>
                              {hasDate ? (
                                <div style={{ fontSize: '0.82rem', color: 'var(--gold)', marginTop: '0.15rem' }}>
                                  📅 {fmtDate(l.scheduled_at)} at {fmtTime(l.scheduled_at)}
                                  {l.duration_minutes && ` · ${l.duration_minutes} min`}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem', fontStyle: 'italic' }}>
                                  Not yet scheduled
                                </div>
                              )}
                              {l.teacher_notes_public && (
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}
                                  dangerouslySetInnerHTML={{ __html: '💬 ' + l.teacher_notes_public }} />
                              )}
                              {l.status === 'completed' && (
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#22c55e', marginTop: '0.2rem', display: 'inline-block' }}>✓ Completed</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                              {(plan || l.lesson_plan_id) ? (
                                <button className="btn-gold" style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem', whiteSpace: 'nowrap' }}
                                  onClick={() => openLesson(l)} disabled={openingLessonId === l.id}>
                                  {openingLessonId === l.id ? 'Opening…' : '▶ Start Lesson →'}
                                </button>
                              ) : !hasDate ? (
                                <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem', whiteSpace: 'nowrap' }}
                                  onClick={onBook}>
                                  📅 Book this lesson →
                                </button>
                              ) : null}
                              {l.whiteboard_pdf_url && (
                                <a href={l.whiteboard_pdf_url} target="_blank" rel="noreferrer"
                                  style={{ fontSize: '0.78rem', color: 'var(--gold)', textDecoration: 'underline' }}>
                                  📄 View whiteboard
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {/* Book more lessons CTA for non-bundle */}
                    {accessLevel !== 'bundle_12' && (
                      <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                        <button className="btn-ghost" style={{ fontSize: '0.88rem' }} onClick={onBook}>
                          + Book another lesson
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Placement test CTA (test_approved, no result yet) ── */}
              {isTestApproved && !hasTestResult && (
                <div style={{ background: 'linear-gradient(135deg, #f3f0ff 0%, #ede9fe 100%)', border: '1.5px solid #c4b5fd', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎓</div>
                  <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem' }}>Your placement test is ready</h3>
                  <p className="flow-sub" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                    This 45-minute test helps Dogukan plan your lessons. Answer as best you can — there are no penalties for guessing.
                  </p>
                  <button className="btn-gold" onClick={() => setTakingTest(true)}>
                    Start placement test →
                  </button>
                </div>
              )}
              {isTestApproved && hasTestResult && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>
                    ✅ <strong>Placement test complete!</strong> — Dogukan will review your results and confirm your free lesson soon.
                  </p>
                </div>
              )}

              {/* ── Placement result ── */}
              {result ? (
                <div className="dashboard-result-card">
                  <div className="dashboard-level" style={{ borderColor: color, color }}>
                    {result.cefr_level}
                  </div>
                  <div className="dashboard-result-info">
                    <h3>{result.level_name}</h3>
                    <p>Overall score: <strong>{result.overall_score}%</strong></p>
                    <p>Recommended course: <strong>{result.recommended_course}</strong></p>
                    {!result.writing_reviewed && (
                      <p className="dashboard-pending">✍️ Writing answer pending Dogukan's review</p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* ── Achievements ── */}
              {badgeDefs.length > 0 && (
                <div className="dashboard-exercises">
                  <h3 className="dashboard-section-title">🏅 My Achievements</h3>
                  <div className="badge-grid">
                    {badgeDefs.map(def => {
                      const earned = earnedBadges.find(b => b.badge_key === def.key)
                      return (
                        <div key={def.key} className={`badge-chip ${earned ? 'badge-chip--earned' : 'badge-chip--locked'}`}
                          title={earned ? `Earned ${new Date(earned.earned_at).toLocaleDateString('en-GB')}` : 'Not yet earned'}>
                          <span className="badge-emoji">{def.emoji}</span>
                          <span className="badge-name">{def.name}</span>
                          {earned && <span className="badge-check">✓</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Refer a friend ── */}
              {referralCode && (
                <div className="dashboard-exercises" style={{ background: '#fff', borderRadius: '0.75rem', border: '1.5px solid #F5C842', padding: '1.1rem 1.25rem' }}>
                  <h3 className="dashboard-section-title" style={{ marginBottom: '0.6rem' }}>🎁 Refer a friend</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.85rem', lineHeight: '1.6' }}>
                    Share your code with a friend. When they join, you get <strong>10% off your next lesson</strong> — Dogukan will apply it automatically.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                    <span style={{
                      fontFamily: 'monospace', fontSize: '1.35rem', fontWeight: 700,
                      letterSpacing: '0.18em', background: '#F8F5EE', border: '1.5px solid #e8e3d8',
                      borderRadius: '0.4rem', padding: '0.35rem 0.8rem', color: '#006699',
                    }}>{referralCode}</span>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
                      onClick={() => {
                        navigator.clipboard.writeText(referralCode)
                        setReferralCopied(true)
                        setTimeout(() => setReferralCopied(false), 2000)
                      }}
                    >
                      {referralCopied ? 'Copied! ✓' : 'Copy'}
                    </button>
                  </div>
                  {myReferrals.length > 0 && (
                    <p style={{ fontSize: '0.85rem', color: '#006699', fontWeight: 500, marginBottom: 0 }}>
                      You've referred {myReferrals.length} friend{myReferrals.length !== 1 ? 's' : ''} so far.
                    </p>
                  )}
                </div>
              )}

              {/* ── Progress chart ── */}
              {assignments.length > 0 && (() => {
                const weeks = getWeeklyProgress(assignments)
                const maxCount = Math.max(...weeks.map(w => w.count), 1)
                return (
                  <div className="dashboard-exercises">
                    <h3 className="dashboard-section-title">📈 Your progress</h3>
                    <div className="progress-chart">
                      {weeks.map((w, i) => (
                        <div key={i} className="progress-chart-col">
                          <span className="progress-chart-count">{w.count > 0 ? w.count : ''}</span>
                          <div className="progress-chart-bar-wrap">
                            <div className="progress-chart-bar"
                              style={{ height: `${Math.round((w.count / maxCount) * 72) + (w.count > 0 ? 8 : 0)}px` }} />
                          </div>
                          <span className="progress-chart-label">{w.label}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>
                      Exercises completed per week — last 8 weeks
                    </p>
                  </div>
                )
              })()}

              {/* ── Vocabulary log ── */}
              <div className="dashboard-exercises">
                <div className="vocab-header">
                  <h3 className="dashboard-section-title" style={{ margin: 0 }}>📖 My Vocabulary</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="vocab-count">{vocabulary.length} word{vocabulary.length !== 1 ? 's' : ''}</span>
                    <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.7rem' }}
                      onClick={() => setAddingVocab(v => !v)}>
                      {addingVocab ? 'Cancel' : '+ Add word'}
                    </button>
                    {vocabulary.length > 0 && (
                      <>
                        <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.7rem' }}
                          onClick={() => setShowVocab(v => !v)}>
                          {showVocab ? 'Hide' : 'Show all'}
                        </button>
                        <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.7rem' }}
                          onClick={handleDownloadVocab}
                          title="Download vocabulary list as a spreadsheet file">
                          ⬇ Export
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {addingVocab && (
                  <form className="vocab-add-form" onSubmit={handleAddVocab}>
                    <input type="text" placeholder="Word or phrase…" value={vocabWord}
                      onChange={e => setVocabWord(e.target.value)} required autoFocus />
                    <input type="text" placeholder="Meaning or note (optional)" value={vocabDef}
                      onChange={e => setVocabDef(e.target.value)} />
                    <button type="submit" className="btn-gold" disabled={vocabSaving || !vocabWord.trim()}>
                      {vocabSaving ? 'Saving…' : 'Save →'}
                    </button>
                  </form>
                )}

                {vocabulary.length === 0 && !addingVocab && (
                  <p className="dashboard-empty-small">No words saved yet. Add new words as you complete exercises.</p>
                )}

                {showVocab && vocabulary.length > 0 && (
                  <div className="vocab-list">
                    {vocabulary.map(v => (
                      <div key={v.id} className="vocab-item">
                        <div className="vocab-item-left">
                          <strong className="vocab-word">{v.word}</strong>
                          {v.definition && <span className="vocab-def">{v.definition}</span>}
                          {v.exercises?.title && (
                            <span className="vocab-source">from: {v.exercises.title}</span>
                          )}
                        </div>
                        <button className="vocab-delete" onClick={() => handleDeleteVocab(v.id)}
                          title="Remove word">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {!showVocab && vocabulary.length > 0 && (
                  <div className="vocab-preview">
                    {vocabulary.slice(0, 5).map(v => (
                      <span key={v.id} className="vocab-preview-chip">{v.word}</span>
                    ))}
                    {vocabulary.length > 5 && (
                      <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                        onClick={() => setShowVocab(true)}>+{vocabulary.length - 5} more</button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── AccountSettings ──────────────────────────────────────────
export function AccountSettings({ user, onBack, onSignOut }) {
  const [name,        setName]        = useState('')
  const [loading,     setLoading]     = useState(true)
  const [nameSaving,  setNameSaving]  = useState(false)
  const [nameSaved,   setNameSaved]   = useState(false)
  const [nameError,   setNameError]   = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')
  const [pwSaving,    setPwSaving]    = useState(false)
  const [pwSaved,     setPwSaved]     = useState(false)
  const [pwError,     setPwError]     = useState(null)

  useEffect(() => {
    if (!user) return
    fetchMyProfile(user.id).then(p => {
      setName(p?.name || user.user_metadata?.name || '')
      setLoading(false)
    })
  }, [user])

  const handleSaveName = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setNameSaving(true); setNameError(null)
    const ok = await updateMyName(user.id, name.trim())
    setNameSaving(false)
    if (ok) { setNameSaved(true); setTimeout(() => setNameSaved(false), 2500) }
    else setNameError('Could not save. Please try again.')
  }

  const handleSavePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPw) { setPwError('Passwords do not match.'); return }
    setPwSaving(true); setPwError(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    if (error) setPwError(error.message)
    else { setPwSaved(true); setNewPassword(''); setConfirmPw(''); setTimeout(() => setPwSaved(false), 2500) }
  }

  return (
    <div className="flow-card" style={{ maxWidth: 520 }}>
      <button className="back-btn" onClick={onBack}>← Back to dashboard</button>
      <h2>Account settings</h2>
      <p className="flow-sub">{user?.email}</p>

      {loading ? <div className="dashboard-loading">Loading…</div> : (
        <>
          {/* ── Display name ── */}
          <div className="settings-section">
            <h3>Display name</h3>
            <form onSubmit={handleSaveName} className="booking-form" style={{ gap: '0.75rem' }}>
              <div className="form-field">
                <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              {nameError && <div className="auth-error">{nameError}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button type="submit" className="btn-gold" disabled={nameSaving}>
                  {nameSaving ? 'Saving…' : 'Save name'}
                </button>
                {nameSaved && <span style={{ color: '#4ade80', fontSize: '0.9rem' }}>✓ Saved</span>}
              </div>
            </form>
          </div>

          {/* ── Password ── */}
          <div className="settings-section">
            <h3>Change password</h3>
            <form onSubmit={handleSavePassword} className="booking-form" style={{ gap: '0.75rem' }}>
              <div className="form-field">
                <label>New password</label>
                <input type="password" placeholder="At least 6 characters"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="form-field">
                <label>Confirm new password</label>
                <input type="password" placeholder="Repeat new password"
                  value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
              </div>
              {pwError && <div className="auth-error">{pwError}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button type="submit" className="btn-gold" disabled={pwSaving}>
                  {pwSaving ? 'Saving…' : 'Change password'}
                </button>
                {pwSaved && <span style={{ color: '#4ade80', fontSize: '0.9rem' }}>✓ Password updated</span>}
              </div>
            </form>
          </div>

          <div className="settings-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <button className="btn-ghost" onClick={onSignOut}>Sign out</button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── parseWordChoiceTemplate ──────────────────────────────────
// Converts "Maria [is/isn't] a [___] teacher." into a typed token array.
// choice token : { type:'choice', options:['is',"isn't"], index:0 }
// blank  token : { type:'blank',  index:1 }
// text   token : { type:'text',   value:'Maria ' }
