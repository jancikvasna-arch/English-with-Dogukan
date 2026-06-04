// Auto-extracted from App.jsx (Task #9 split). See lib/shared.js for shared constants/utils.
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { assignExercise, assignLessonPlan, createBook, createCourse, createExerciseWithQuestions, createLabel, createLesson, createLessonPlan, createLessonPlanWithStages, createManualStudent, createTestAssignment, deleteAssignment, deleteBook, deleteCourseRecord, deleteExercise, deleteLabel, deleteLesson, deleteLessonPlan, deleteTestAssignment, duplicateLessonPlan, fetchAllAssignmentsAdmin, fetchAllBooks, fetchAllCourses, fetchAllExercises, fetchAllLabels, fetchAllLessonPlans, fetchAllProspects, fetchAllReferrals, fetchAllTestAssignments, fetchAllUpcomingLessons, fetchArchivedProspects, fetchAssignedPlansForStudent, fetchAssignmentDetails, fetchArchivedStudentsAll, fetchExerciseWithQuestions, fetchManualStudents, fetchMyAnswersForAssignment, fetchPlanAssignmentHistory, fetchPlanAssignmentsAdmin, fetchPlansForManualStudentAdmin, fetchPlansForStudentAdmin, fetchQuestionsForReview, fetchSiteSetting, fetchStudentAssignmentsAdmin, fetchStudentLessonsAdmin, fetchStudentPlanAssignments, fetchStudentProfiles, fetchStudentsAdmin, findManualStudentByEmail, markDiscountApplied, saveAnswerReviews, saveExerciseFeedback, saveSiteSetting, setExerciseLabels, setManualStudentArchived, setStudentArchived, supabase, transferTestAssignments, updateBook, updateCourseRecord, updateExerciseThumbnail, updateExerciseWithQuestions, updateLesson, updateLessonNotes, updateLessonPlan, updateLessonPlanLink, updateLessonPlanWithStages, updateProspectStatus, updateStudentAccessLevel, updateStudentEnglishLevel, uploadLessonWhiteboard } from './lib/supabase'
import { ADMIN_EMAIL, GENERAL_PLACEMENT_QUESTIONS, HOSPITALITY_PLACEMENT_QUESTIONS, LABEL_COLORS, STAGE_TYPES, TEST_DEFINITIONS, getAdminCourses, getEffectiveQuestions, parseOverlayPrompt, resetQuestions, saveQuestions, setAdminCoursesCache } from './lib/shared'
import { COURSES_DATA } from './content'
import { AnnotatedImage, EmbeddedMedia, ExerciseDemoPlayer, FbBlankEditor, ImageOverlayFill, InlineExerciseContent, InlineFillBlank, MatchingQuestion, RTE_COLORS, RichTextEditor, StudentSubmissionReview, WORD_PILL_COLORS, WordChoiceQuestion, parseFillBlankCorrect } from './ExerciseComponents.jsx'
import { AccessBadge } from './StudentDashboard.jsx'

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Compress an image file to a JPEG data-URI (max 1200px wide, 78% quality). */
export function compressImage(file, maxWidth = 1200) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const ratio  = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.78))
    }
    img.src = url
  })
}

/**
 * OCR: extract raw text from an image file using Tesseract.js.
 * Runs entirely in the browser — no API key required.
 */
export async function ocrImage(file) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: () => {},
    errorHandler: () => {},
  })
  const url = URL.createObjectURL(file)
  const { data: { text } } = await worker.recognize(url)
  URL.revokeObjectURL(url)
  await worker.terminate()
  return text
}

// Detect blank positions in an exercise image using Tesseract word bboxes.
// Returns [{x,y,w,h}] as percentages of the image dimensions.
// x,y = top-left corner; w,h = width/height.
export async function detectImageBlanks(dataUrl) {
  // Natural dimensions of the (possibly compressed) image
  const naturalSize = await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })

  // Feed to Tesseract
  const resp  = await fetch(dataUrl)
  const blob  = await resp.blob()
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, { logger: () => {}, errorHandler: () => {} })
  const blobUrl = URL.createObjectURL(blob)
  const { data } = await worker.recognize(blobUrl)
  URL.revokeObjectURL(blobUrl)
  await worker.terminate()

  // Words that look like blank underlines: underscores, dashes, em-dashes, equals,
  // dots (with or without spaces between them), or any mix of blank-like characters.
  // Also catches ". . . ." and "- - -" patterns from OCR of dotted/dashed textbook blanks.
  const BLANK_RE = /^[_\-—=]{1,}$|^[.·•]{1,}$|^[_\-]{1,}[\s_\-]*[_\-]{1,}$|^([.·•]\s*){2,}$|^([\-—_=]\s*){2,}$/
  return (data.words || [])
    .filter(w => BLANK_RE.test(w.text.trim()))
    .map(w => ({
      x: parseFloat(((w.bbox.x0 / naturalSize.w) * 100).toFixed(2)),
      y: parseFloat(((w.bbox.y0 / naturalSize.h) * 100).toFixed(2)),
      w: parseFloat((((w.bbox.x1 - w.bbox.x0) / naturalSize.w) * 100).toFixed(2)),
      h: parseFloat((((w.bbox.y1 - w.bbox.y0) / naturalSize.h) * 100).toFixed(2)),
    }))
}

// Helper: is this question prompt an overlay definition?
export function parseOcrIntoQuestions(rawText, type) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 1)

  const items = []
  for (const line of lines) {
    const m = line.match(/^(?:\d+|[a-d])[.)\s]\s*(.+)/i)
    if (m) {
      items.push(m[1].trim())
    } else if (items.length > 0 && line.length > 3 && !/^[A-Z][A-Z]/.test(line)) {
      // continuation of previous item (wrapped line), skip headings
      items[items.length - 1] += ' ' + line
    }
  }

  // Fallback: every line becomes a question
  if (!items.length) {
    lines.forEach(l => { if (l.length > 3) items.push(l) })
  }

  return items.map(text => {
    const q = newQ(type)
    // Normalise all common blank markers to ___ regardless of whether the
    // teacher used underscores, dots, dashes, em-dashes, or spaced dots/dashes.
    q.prompt = text
      .replace(/_{2,}/g, '___')               // ________
      .replace(/\.{3,}/g, '___')              // ......
      .replace(/([.·•]\s*){3,}/g, '___')      // . . . . .
      .replace(/—{1,}|-{3,}/g, '___')         // ——— or ---
      .replace(/([\-—]\s*){3,}/g, '___')      // - - - -
      .replace(/\s{5,}/g, ' ___ ')            // 5+ spaces (tab-stop gap in pasted text)
    return q
  })
}

// ─── Shared: flow step indicator ──────────────────────────────
export function AdminLessonStages({ adminUserId }) {
  const [exercises,   setExercises]   = useState([])
  const [students,    setStudents]    = useState([])
  const [assignments, setAssignments] = useState([])
  const [labels,      setLabels]      = useState([])
  const [books,       setBooks]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [exTab,          setExTab]          = useState('library')
  const [view,           setView]           = useState('list') // 'list'|'review'|'create-stage'|'edit-exercise'
  const [reviewing,      setReviewing]      = useState(null)
  const [editingExercise,setEditingExercise]= useState(null)
  const [demoExercise,   setDemoExercise]   = useState(null) // {exercise, questions} for admin preview
  const [deletingId,     setDeletingId]     = useState(null) // exercise id pending delete confirm
  const [filterLabelIds, setFilterLabelIds] = useState([])   // active label filter in library tab
  const [filterStageType,setFilterStageType]= useState(null) // active stage type filter in library tab
  const [filterBookId,   setFilterBookId]   = useState(null) // active book filter in library tab
  const [filterUnit,     setFilterUnit]     = useState('')   // unit number filter
  const [filterPage,     setFilterPage]     = useState('')   // page number filter
  const [filterSection,  setFilterSection]  = useState('')   // section text filter
  const [filterCourse,   setFilterCourse]   = useState('')   // course filter in library tab
  const [showFilters,    setShowFilters]    = useState(false) // filter panel open
  const [showLabelMgr,   setShowLabelMgr]   = useState(false) // label management panel open
  const [deletingLabelId,setDeletingLabelId]= useState(null)
  const [showNewLabelForm, setShowNewLabelForm] = useState(false)
  const [newLabelMgrName,  setNewLabelMgrName]  = useState('')
  const [newLabelMgrColor, setNewLabelMgrColor] = useState(LABEL_COLORS[0].value)
  const [savingNewLabelMgr,setSavingNewLabelMgr]= useState(false)
  const [showBookMgr,    setShowBookMgr]    = useState(false) // book management panel open
  const [newBookTitle,   setNewBookTitle]   = useState('')
  const [savingBook,     setSavingBook]     = useState(false)
  const [deletingBookId, setDeletingBookId] = useState(null)
  const [showRecentlyDeletedEx, setShowRecentlyDeletedEx] = useState(false)

  // assign form
  const [assignMode,  setAssignMode]  = useState('exercise') // 'exercise'
  const [aStudentId,  setAStudentId]  = useState('')
  const [aExerciseId, setAExerciseId] = useState('')
  const [aMode,       setAMode]       = useState('homework')
  const [aNote,       setANote]       = useState('')
  const [assigning,   setAssigning]   = useState(false)
  const [assignError, setAssignError] = useState(null)
  const [showAssign,  setShowAssign]  = useState(false)

  const [refreshing, setRefreshing] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetchAllExercises(),
      fetchStudentProfiles(),
      fetchAllAssignmentsAdmin(),
      fetchAllLabels(),
      fetchAllBooks(),
    ]).then(([exs, studs, asgns, lbls, bks]) => {
      setExercises(exs); setStudents(studs)
      setAssignments(asgns); setLabels(lbls); setBooks(bks)
      setLoading(false)
    })
  }

  const refreshAssignments = async () => {
    setRefreshing(true)
    const asgns = await fetchAllAssignmentsAdmin()
    setAssignments(asgns)
    setRefreshing(false)
  }

  // Auto-refresh assignments when admin returns to this browser tab
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refreshAssignments() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(load, [])

  const openReview = async (asgn) => {
    const details = await fetchAssignmentDetails(asgn.id)
    if (details) { setReviewing(details); setView('review') }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!aStudentId) { setAssignError('Please select a student.'); return }
    if (!aExerciseId) { setAssignError('Please select an exercise.'); return }
    setAssigning(true); setAssignError(null)

    const ok = await assignExercise({ exerciseId: aExerciseId, studentId: aStudentId, assignedBy: adminUserId, mode: aMode, note: aNote || null })
    setAssigning(false)
    if (ok) {
      fetchAllAssignmentsAdmin().then(setAssignments)
      const student  = students.find(s => s.id === aStudentId)
      const exercise = exercises.find(e => e.id === aExerciseId)
      if (student?.email && exercise?.title) {
        fetch('/api/send-exercise-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: student.email, name: student.name, exerciseTitle: exercise.title, mode: aMode }),
        }).catch(e => console.error('[send-exercise-email]', e))
      }
      setShowAssign(false); setAStudentId(''); setAExerciseId(''); setANote('')
    } else { setAssignError('Something went wrong. Please try again.') }
  }

  if (view === 'review' && reviewing) {
    return <AdminExerciseReview details={reviewing}
      onBack={() => { setView('list'); setReviewing(null); fetchAllAssignmentsAdmin().then(setAssignments) }} />
  }
  const openEdit = async (ex) => {
    const full = await fetchExerciseWithQuestions(ex.id)
    if (full) { setEditingExercise(full); setView('edit-exercise') }
  }

  const openDemo = async (ex) => {
    const full = await fetchExerciseWithQuestions(ex.id)
    if (!full) { alert('Could not load exercise. It may have been deleted or there was a connection error.'); return }
    setDemoExercise(full); setView('demo-exercise')
  }

  const handleDeleteExercise = async (id) => {
    const exToDelete = exercises.find(e => e.id === id)
    const ok = await deleteExercise(id)
    if (ok) {
      if (exToDelete) logRecentlyDeleted('exercise', id, exToDelete.title)
      setExercises(prev => prev.filter(e => e.id !== id))
      setDeletingId(null)
    }
  }

  const handleLabelDeleted = async (id) => {
    const ok = await deleteLabel(id)
    if (ok) {
      setLabels(p => p.filter(l => l.id !== id))
      setExercises(p => p.map(ex => ({ ...ex, labels: (ex.labels||[]).filter(l => l.id !== id) })))
      setFilterLabelIds(p => p.filter(x => x !== id))
      setDeletingLabelId(null)
    }
  }

  const handleCreateBook = async () => {
    if (!newBookTitle.trim()) return
    setSavingBook(true)
    const bk = await createBook(newBookTitle.trim(), adminUserId)
    setSavingBook(false)
    if (bk) { setBooks(p => [...p, bk].sort((a,b) => a.title.localeCompare(b.title))); setNewBookTitle('') }
  }

  const handleDeleteBook = async (id) => {
    const ok = await deleteBook(id)
    if (ok) {
      setBooks(p => p.filter(b => b.id !== id))
      setExercises(p => p.map(ex => ex.book_id === id ? { ...ex, book_id: null, books: null } : ex))
      if (filterBookId === id) setFilterBookId(null)
      setDeletingBookId(null)
    }
  }

  if (view === 'create-stage') {
    return <ExerciseBuilder
      allLabels={labels}
      allBooks={books}
      onLabelCreated={lbl => setLabels(p => [...p, lbl])}
      onBookCreated={bk => setBooks(p => [...p, bk].sort((a,b) => a.title.localeCompare(b.title)))}
      onCancel={() => setView('list')}
      onSaved={() => { fetchAllExercises().then(setExercises); setView('list'); setExTab('library') }} />
  }
  if (view === 'edit-exercise' && editingExercise) {
    return <ExerciseBuilder
      initialExercise={editingExercise}
      allLabels={labels}
      allBooks={books}
      onLabelCreated={lbl => setLabels(p => [...p, lbl])}
      onBookCreated={bk => setBooks(p => [...p, bk].sort((a,b) => a.title.localeCompare(b.title)))}
      onCancel={() => { setView('list'); setEditingExercise(null) }}
      onSaved={() => { fetchAllExercises().then(setExercises); setView('list'); setExTab('library'); setEditingExercise(null) }} />
  }
  if (view === 'demo-exercise' && demoExercise) {
    return <ExerciseDemoPlayer
      exercise={demoExercise}
      questions={demoExercise.questions ?? []}
      embedded={true}
      onBack={() => { setView('list'); setDemoExercise(null) }} />
  }

  return (
    <div>
      {/* ── Library tab ── */}
      {exTab === 'library' && (() => {
        const typeFiltered = filterStageType
          ? exercises.filter(ex => ex.stage_type === filterStageType)
          : exercises
        const bookFiltered = filterBookId
          ? typeFiltered.filter(ex => ex.book_id === filterBookId)
          : typeFiltered
        const unitFiltered = filterUnit
          ? bookFiltered.filter(ex => String(ex.unit ?? '').startsWith(filterUnit))
          : bookFiltered
        const pageFiltered = filterPage
          ? unitFiltered.filter(ex => String(ex.page ?? '').startsWith(filterPage))
          : unitFiltered
        const sectionFiltered = filterSection.trim()
          ? pageFiltered.filter(ex => (ex.section || '').toLowerCase().includes(filterSection.trim().toLowerCase()))
          : pageFiltered
        const courseFiltered = filterCourse
          ? sectionFiltered.filter(ex => ex.level === filterCourse)
          : sectionFiltered
        const filteredExercises = filterLabelIds.length === 0
          ? courseFiltered
          : courseFiltered.filter(ex => (ex.labels || []).some(l => filterLabelIds.includes(l.id)))
        return (
          <div>
            <div className="admin-exercises-toolbar">
              <h3 style={{ margin: 0 }}>Exercise Library ({filteredExercises.length}{(filterStageType || filterLabelIds.length > 0 || filterBookId || filterUnit || filterPage || filterSection || filterCourse) ? ` / ${exercises.length}` : ''})</h3>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {/* Filters toggle */}
                {(() => {
                  const activeCount = [filterStageType, filterBookId, filterUnit, filterPage, filterSection.trim(), filterCourse].filter(Boolean).length + filterLabelIds.length
                  return (
                    <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', position: 'relative', borderColor: showFilters ? 'var(--gold)' : undefined }}
                      onClick={() => setShowFilters(p => !p)}>
                      🔽 Filters
                      {activeCount > 0 && (
                        <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--gold)', color: '#fff', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', lineHeight: 1.4 }}>{activeCount}</span>
                      )}
                    </button>
                  )
                })()}
                <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => { setShowLabelMgr(p => !p) }}>🏷 Manage Labels</button>
                <button className="btn-gold admin-create-btn" onClick={() => setView('create-stage')}>+ Create exercise</button>
              </div>
            </div>

            {/* ── Collapsible filter panel ── */}
            {showFilters && (
              <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Filter exercises</span>
                  {(filterStageType || filterLabelIds.length > 0 || filterBookId || filterUnit || filterPage || filterSection || filterCourse) && (
                    <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                      onClick={() => { setFilterLabelIds([]); setFilterStageType(null); setFilterBookId(null); setFilterUnit(''); setFilterPage(''); setFilterSection(''); setFilterCourse('') }}>
                      ✕ Clear all
                    </button>
                  )}
                </div>

                {/* Exercise type */}
                <div style={{ marginBottom: '0.65rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Exercise type</div>
                  <div className="stage-type-filter" style={{ margin: 0 }}>
                    <button className={`stage-type-chip ${!filterStageType ? 'active' : ''}`}
                      onClick={() => setFilterStageType(null)}>All</button>
                    {STAGE_TYPES.map(t => (
                      <button key={t.value}
                        className={`stage-type-chip ${filterStageType === t.value ? 'active' : ''}`}
                        onClick={() => setFilterStageType(filterStageType === t.value ? null : t.value)}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Book */}
                {books.length > 0 && (
                  <div style={{ marginBottom: '0.65rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Book</div>
                    <div className="library-filter-row" style={{ margin: 0 }}>
                      <button className={`filter-chip ${!filterBookId ? 'filter-chip--active' : ''}`}
                        onClick={() => setFilterBookId(null)}>All</button>
                      {books.map(bk => (
                        <button key={bk.id}
                          className={`filter-chip ${filterBookId === bk.id ? 'filter-chip--active' : ''}`}
                          onClick={() => setFilterBookId(filterBookId === bk.id ? null : bk.id)}>
                          {bk.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unit / Page / Section */}
                <div style={{ marginBottom: labels.length > 0 ? '0.65rem' : 0 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Location in textbook</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="number" min="1" placeholder="Unit" value={filterUnit}
                      onChange={e => setFilterUnit(e.target.value)}
                      className="location-filter-input" />
                    <input type="number" min="1" placeholder="Page" value={filterPage}
                      onChange={e => setFilterPage(e.target.value)}
                      className="location-filter-input" />
                    <input type="text" placeholder="Section" value={filterSection}
                      onChange={e => setFilterSection(e.target.value)}
                      className="location-filter-input location-filter-input--wide" />
                    {(filterUnit || filterPage || filterSection) && (
                      <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.22rem 0.55rem' }}
                        onClick={() => { setFilterUnit(''); setFilterPage(''); setFilterSection('') }}>Clear</button>
                    )}
                  </div>
                </div>

                {/* Labels */}
                {labels.length > 0 && (
                  <div style={{ marginBottom: getAdminCourses().length > 0 ? '0.65rem' : 0 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Label</div>
                    <div className="library-filter-row" style={{ margin: 0 }}>
                      <button className={`filter-chip ${filterLabelIds.length === 0 ? 'filter-chip--active' : ''}`}
                        onClick={() => setFilterLabelIds([])}>All</button>
                      {labels.map(lbl => (
                        <button key={lbl.id}
                          className={`filter-chip ${filterLabelIds.includes(lbl.id) ? 'filter-chip--active' : ''}`}
                          style={{ '--lbl-color': lbl.color }}
                          onClick={() => setFilterLabelIds(p =>
                            p.includes(lbl.id) ? p.filter(x => x !== lbl.id) : [...p, lbl.id]
                          )}>
                          {lbl.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Course filter */}
                {getAdminCourses().length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Course</div>
                    <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
                      style={{ fontSize: '0.85rem', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                      <option value="">All courses</option>
                      {getAdminCourses().map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* ── Label manager ── */}
            {showLabelMgr && (
              <div className="label-mgr-panel" style={{ background: '#EEF4F8', borderColor: '#c5d8e8' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <p className="label-mgr-title" style={{ margin: 0 }}>Manage labels</p>
                  <button className="btn-gold" style={{ fontSize: '0.78rem', padding: '0.28rem 0.75rem' }}
                    onClick={() => { setShowNewLabelForm(p => !p); setNewLabelMgrName(''); setNewLabelMgrColor(LABEL_COLORS[0].value) }}>
                    {showNewLabelForm ? '✕ Cancel' : '+ Add New Label'}
                  </button>
                </div>

                {showNewLabelForm && (
                  <div style={{ background: '#fff', border: '1px solid #c5d8e8', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="text" placeholder="Label name (e.g. Elementary)"
                        value={newLabelMgrName} onChange={e => setNewLabelMgrName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !savingNewLabelMgr && newLabelMgrName.trim() && (async () => {
                          setSavingNewLabelMgr(true)
                          const lbl = await createLabel(newLabelMgrName.trim(), newLabelMgrColor)
                          setSavingNewLabelMgr(false)
                          if (lbl) { setLabels(p => [...p, lbl]); setShowNewLabelForm(false); setNewLabelMgrName('') }
                        })()}
                        style={{ flex: 1, minWidth: '140px' }} autoFocus />
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {LABEL_COLORS.map(c => (
                          <button key={c.value} type="button" title={c.label}
                            style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2.5px solid ${newLabelMgrColor === c.value ? '#1a2030' : 'transparent'}`, background: c.value, cursor: 'pointer', padding: 0 }}
                            onClick={() => setNewLabelMgrColor(c.value)} />
                        ))}
                      </div>
                      <button className="btn-gold" style={{ fontSize: '0.8rem', padding: '0.32rem 0.85rem', flexShrink: 0 }}
                        disabled={savingNewLabelMgr || !newLabelMgrName.trim()}
                        onClick={async () => {
                          setSavingNewLabelMgr(true)
                          const lbl = await createLabel(newLabelMgrName.trim(), newLabelMgrColor)
                          setSavingNewLabelMgr(false)
                          if (lbl) { setLabels(p => [...p, lbl]); setShowNewLabelForm(false); setNewLabelMgrName('') }
                        }}>
                        {savingNewLabelMgr ? '…' : 'Create'}
                      </button>
                    </div>
                  </div>
                )}

                {labels.length === 0 ? (
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>No labels yet — create one above.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {labels.map(lbl => (
                      <div key={lbl.id} className="label-mgr-row">
                        <span className="label-chip label-chip--selected" style={{ '--lbl-color': lbl.color }}>{lbl.name}</span>
                        {deletingLabelId === lbl.id ? (
                          <>
                            <button className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#e05c5c', borderColor: '#e05c5c' }}
                              onClick={() => handleLabelDeleted(lbl.id)}>Confirm</button>
                            <button className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                              onClick={() => setDeletingLabelId(null)}>✕</button>
                          </>
                        ) : (
                          <button className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#e05c5c' }}
                            onClick={() => setDeletingLabelId(lbl.id)}>Delete</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Book manager ── */}
            {showBookMgr && (
              <div className="label-mgr-panel">
                <p className="label-mgr-title">Manage books</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input type="text" placeholder="Book title (e.g. English File B1)"
                    value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateBook()}
                    style={{ flex: 1, padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: '0.88rem' }} />
                  <button className="btn-gold" style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}
                    disabled={savingBook || !newBookTitle.trim()} onClick={handleCreateBook}>
                    {savingBook ? '…' : '+ Add'}
                  </button>
                </div>
                {books.length === 0 ? (
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>No books yet — add one above.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {books.map(bk => (
                      <div key={bk.id} className="label-mgr-row">
                        <span className="admin-level-chip">📚 {bk.title}</span>
                        {deletingBookId === bk.id ? (
                          <>
                            <button className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#e05c5c', borderColor: '#e05c5c' }}
                              onClick={() => handleDeleteBook(bk.id)}>Confirm</button>
                            <button className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                              onClick={() => setDeletingBookId(null)}>✕</button>
                          </>
                        ) : (
                          <button className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#e05c5c' }}
                            onClick={() => setDeletingBookId(bk.id)}>Delete</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}


            {loading ? <div className="dashboard-loading">Loading…</div>
            : exercises.length === 0 ? (
              <div className="dashboard-empty">
                <p>No lesson stages yet.</p>
                <p className="flow-sub" style={{ fontSize: '0.88rem' }}>Click "+ Create exercise" to build your first one — or upload a textbook photo.</p>
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="dashboard-empty">
                <p>No stages match the selected filter.</p>
                <button className="btn-ghost" style={{ fontSize: '0.85rem' }} onClick={() => { setFilterLabelIds([]); setFilterStageType(null); setFilterBookId(null); setFilterUnit(''); setFilterPage(''); setFilterSection(''); setFilterCourse('') }}>Clear filter</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                {filteredExercises.map(ex => {
                  const stDef = STAGE_TYPES.find(t => t.value === ex.stage_type) || { icon: '✏️', label: 'Exercise' }
                  return (
                  <div key={ex.id} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'border-color 0.15s', cursor: 'default' }}>
                    {ex.thumbnail
                      ? <img src={ex.thumbnail} alt="" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.25rem' }} />
                      : <div style={{ width: '100%', height: '120px', borderRadius: '6px', marginBottom: '0.25rem', background: '#f0ede6', border: '1.5px dashed #c8c2b4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                          <span style={{ fontSize: '1.5rem', opacity: 0.35 }}>🖼</span>
                          <span style={{ fontSize: '0.72rem', color: '#a09888', fontWeight: 500, letterSpacing: '0.03em' }}>No thumbnail</span>
                        </div>
                    }
                    <strong style={{ fontSize: '0.92rem' }}>{ex.title}</strong>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="stage-type-badge-sm" style={{ fontSize: '0.75rem', padding: '0.18rem 0.5rem' }}>{stDef.icon} {stDef.label}</span>
                      {ex.level && <span className="admin-level-chip" style={{ background: '#EEF4F8', color: 'var(--gold)', fontWeight: 600 }}>{ex.level}</span>}
                      {ex.books?.title && <span className="admin-level-chip chip-icon-text"><span className="chip-icon">📚</span><span>{ex.books.title}</span></span>}
                      {ex.estimated_minutes && (
                        <span className="admin-level-chip chip-icon-text" style={{ color: 'var(--text-muted)' }}><span className="chip-icon">⏱</span><span>{ex.estimated_minutes} min</span></span>
                      )}
                      {ex.audio_url && <span className="admin-level-chip" style={{ color: 'var(--text-muted)' }}>🎧 Audio</span>}
                      {ex.context_text && <span className="admin-level-chip" style={{ color: 'var(--text-muted)' }}>📖 Text</span>}
                      {(ex.labels || []).map(lbl => (
                        <span key={lbl.id} className="label-chip" style={{ '--lbl-color': lbl.color }}>{lbl.name}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.4rem' }}>
                      <button className="btn-ghost"
                        style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => openDemo(ex)}>View</button>
                      <button className="btn-ghost"
                        style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => openEdit(ex)}>Edit</button>
                      {deletingId === ex.id ? (
                        <>
                          <button className="btn-ghost"
                            style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', color: '#e05c5c', borderColor: '#e05c5c' }}
                            onClick={() => handleDeleteExercise(ex.id)}>Confirm delete</button>
                          <button className="btn-ghost"
                            style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                            onClick={() => setDeletingId(null)}>Cancel</button>
                        </>
                      ) : (
                        <button className="btn-ghost"
                          style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', color: '#e05c5c' }}
                          onClick={() => setDeletingId(ex.id)}>Delete</button>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        )
      })()}

      {/* Recently Deleted button - bottom right */}
      {exTab === 'library' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
              onClick={() => setShowRecentlyDeletedEx(p => !p)}>
              🗑 Recently Deleted
            </button>
          </div>
          {showRecentlyDeletedEx && <RecentlyDeletedPanel type="exercise" onClose={() => setShowRecentlyDeletedEx(false)} />}
        </>
      )}
    </div>
  )
}

// ─── LessonPlanView ───────────────────────────────────────────
// Collapsible stage cards — click any row to expand/collapse content.
// No navigate-away: exercise content renders inline.
export function LessonPlanView({ plan, exercises, onBack, adminUserId = null, adminEmail = null }) {
  const [viewMode,       setViewMode]       = useState('teacher')
  const [assignHistory,  setAssignHistory]  = useState([])
  const [exerciseCache,  setExerciseCache]  = useState({}) // exerciseId → full exercise obj
  const [loadingEx,      setLoadingEx]      = useState(false)
  const [expandedStages, setExpandedStages] = useState(new Set()) // stage IDs
  const [demoAnswers,    setDemoAnswers]    = useState({}) // exerciseId → { qId → val }
  const [whiteboard, setWhiteboard] = useState(() => {
    try { return localStorage.getItem('wb_' + plan.id) || '' } catch { return '' }
  })
  const saveWb = (v) => {
    setWhiteboard(v)
    try { localStorage.setItem('wb_' + plan.id, v) } catch {}
  }

  useEffect(() => {
    fetchPlanAssignmentHistory(plan.id).then(setAssignHistory)
  }, [plan.id])

  // Pre-fetch all exercise data (with questions) on mount
  useEffect(() => {
    const ids = [...new Set(
      (plan.lesson_stages ?? []).map(s => s.exercises?.id || s.exercise_id).filter(Boolean)
    )]
    if (!ids.length) return
    setLoadingEx(true)
    Promise.all(ids.map(id => fetchExerciseWithQuestions(id))).then(results => {
      const cache = {}
      results.forEach(ex => { if (ex) cache[ex.id] = ex })
      setExerciseCache(cache)
      setLoadingEx(false)
    })
  }, [plan.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleStage = (stageId) =>
    setExpandedStages(prev => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })

  const lessonStages = (plan.lesson_stages ?? [])
    .filter(s => (s.section ?? 'lesson') !== 'homework')
    .sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0) || a.order_index - b.order_index)

  const homeworkStages = (plan.lesson_stages ?? [])
    .filter(s => (s.section ?? 'lesson') === 'homework')

  const stageGroups = lessonStages.reduce((acc, s) => {
    const num = s.stage_number ?? 1
    if (!acc[num]) acc[num] = { number: num, name: s.stage_name, items: [] }
    acc[num].items.push(s)
    return acc
  }, {})

  const studentName = plan.profiles?.name || plan.profiles?.email || plan.manual_students?.name

  const PLAN_STAGE_COLORS = {
    controlled_exercise: '#3b82f6', free_exercise: '#059669',
    lead_in: '#d97706', feedback: '#7c3aed', instruction: '#64748b', clarification: '#dc2626',
  }

  const renderStageCard = (stage, isHomework = false) => {
    const exId       = stage.exercises?.id || stage.exercise_id
    const ex         = stage.exercises || exercises.find(e => e.id === exId)
    const isExpanded = expandedStages.has(stage.id)
    const hasContent = !!(exId || (viewMode === 'teacher' && stage.teacher_notes))
    const def        = STAGE_TYPES.find(t => t.value === stage.stage_type) || { icon: '▸', label: stage.stage_type || 'Activity' }
    const color      = PLAN_STAGE_COLORS[stage.stage_type] || '#94a3b8'

    return (
      <div key={stage.id} style={{ background: '#fff', borderRadius: '8px', border: `1px solid ${isExpanded ? '#d4c9b4' : '#e8e3d8'}`, borderLeft: `4px solid ${color}`, marginBottom: '0.45rem', overflow: 'hidden' }}>
        {/* Clickable header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.85rem', cursor: hasContent ? 'pointer' : 'default', userSelect: 'none' }}
          onClick={() => hasContent && toggleStage(stage.id)}>
          <span style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1 }}>{def.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ex?.title || stage.title || def.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', color, fontWeight: 600, background: `${color}18`, padding: '0.1rem 0.42rem', borderRadius: '20px' }}>
                {def.label}
              </span>
              {stage.duration_minutes && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>⏱ {stage.duration_minutes} min</span>
              )}
              {isHomework && stage.content_text && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{stage.content_text}</span>
              )}
            </div>
          </div>
          {hasContent && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0 }}>
              {isExpanded ? '▲' : '▼'}
            </span>
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div style={{ borderTop: '1px solid #f0ede6', padding: '0.75rem 0.85rem' }}>
            {viewMode === 'teacher' && stage.teacher_notes && (
              <div style={{ marginBottom: '0.65rem', fontSize: '0.8rem', color: '#78350f', background: '#fffbeb', borderRadius: '6px', padding: '0.35rem 0.6rem', borderLeft: '3px solid #fbbf24' }}
                dangerouslySetInnerHTML={{ __html: '🔒 ' + stage.teacher_notes }} />
            )}
            {exId && (
              <InlineExerciseContent
                exerciseId={exId}
                exerciseCache={exerciseCache}
                loadingExercises={loadingEx}
                demoAnswers={demoAnswers}
                setDemoAnswers={setDemoAnswers}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button className="back-btn" onClick={onBack}>← Back to plans</button>
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <button className="btn-ghost"
            style={{ fontSize: '0.85rem', ...(viewMode === 'teacher' ? { background: 'var(--gold)', color: '#fff', borderColor: 'var(--gold)' } : {}) }}
            onClick={() => setViewMode('teacher')}>👨‍🏫 Teacher view</button>
          <button className="btn-ghost"
            style={{ fontSize: '0.85rem', ...(viewMode === 'student' ? { background: 'var(--gold)', color: '#fff', borderColor: 'var(--gold)' } : {}) }}
            onClick={() => setViewMode('student')}>👤 Student view</button>
          {viewMode === 'teacher' && (
            <button className="btn-ghost" style={{ fontSize: '0.85rem' }} onClick={() => window.print()}>🖨 Print</button>
          )}
        </div>
      </div>

      {/* Plan title */}
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem' }}>{plan.title}</h2>

      {/* Metadata chips */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {studentName && <span className="admin-level-chip">👤 {studentName}</span>}
        {plan.scheduled_at && (
          <span className="admin-level-chip" style={{ color: 'var(--gold)' }}>
            📅 {new Date(plan.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Whiteboard — teacher only, shown prominently at the very top */}
      {viewMode === 'teacher' && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <strong style={{ fontSize: '0.92rem' }}>📝 Whiteboard</strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>(visible on screen — share with student)</span>
            {whiteboard && (
              <button type="button" className="btn-ghost"
                style={{ fontSize: '0.72rem', padding: '0.18rem 0.5rem', marginLeft: 'auto', color: '#e05c5c' }}
                onClick={() => saveWb('')}>✕ Clear</button>
            )}
          </div>
          <RichTextEditor
            value={whiteboard}
            onChange={saveWb}
            placeholder="Type your notes, emerging language, or instructions here — your student sees this on screen share…"
            minHeight="140px"
            style={{ border: '2px solid #d4a853', borderRadius: '10px', boxShadow: '0 2px 8px rgba(212,168,83,0.15)' }}
          />
        </div>
      )}

      {/* Teacher-only metadata */}
      {viewMode === 'teacher' && (plan.lesson_aim || plan.teaching_point || plan.language_analysis) && (
        <div style={{ background: '#FFFBF0', border: '1px solid #f0e8c8', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
          {plan.lesson_aim && (
            <>
              <strong>🎯 Lesson aim</strong>
              <div style={{ margin: '0.25rem 0 0.75rem' }} dangerouslySetInnerHTML={{ __html: plan.lesson_aim }} />
            </>
          )}
          {plan.teaching_point && (
            <>
              <strong>✏️ Teaching point</strong>
              <div style={{ margin: '0.25rem 0 0.75rem' }} dangerouslySetInnerHTML={{ __html: plan.teaching_point }} />
            </>
          )}
          {plan.language_analysis && (
            <>
              <strong>🔬 Language analysis</strong>
              <div style={{ margin: '0.25rem 0' }} dangerouslySetInnerHTML={{ __html: plan.language_analysis }} />
            </>
          )}
        </div>
      )}

      {/* Lesson stages */}
      <div className="builder-section">
        <h4 className="builder-section-title">📌 Lesson stages</h4>
        {Object.values(stageGroups).map(group => (
          <div key={group.number} style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: 'var(--gold)' }}>
              Stage {group.number}{group.name ? ` — ${group.name}` : ''}
            </div>
            {group.items.map(stage => renderStageCard(stage))}
          </div>
        ))}
        {Object.keys(stageGroups).length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No stages yet.</p>
        )}
      </div>

      {/* Homework */}
      {homeworkStages.length > 0 && (
        <div className="builder-section" style={{ marginTop: '1rem' }}>
          <h4 className="builder-section-title">📚 Homework</h4>
          {homeworkStages.map(stage => renderStageCard(stage, true))}
        </div>
      )}

      {/* Assignment history */}
      {assignHistory.length > 0 && (
        <div className="builder-section" style={{ marginTop: '1rem' }}>
          <h4 className="builder-section-title">👥 Assigned to</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {assignHistory.map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.45rem 0.75rem', background: '#fff', borderRadius: '6px', border: '1px solid #e8e3d8', fontSize: '0.88rem' }}>
                <span style={{ flex: 1 }}>
                  👤 {row.profiles?.name || row.profiles?.email || 'Unknown student'}
                </span>
                {row.scheduled_at ? (
                  <span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>
                    📅 {new Date(row.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' at '}{new Date(row.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Assigned {new Date(row.assigned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AdminLessonPlans ─────────────────────────────────────────
// ─── BoxTextArea ──────────────────────────────────────────────
// Isolated contenteditable inside each floating box.
// Keeps its own ref so React re-renders don't reset the cursor.
export function BoxTextArea({ initialText, color, onTextChange }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (ref.current && !ref.current._initialised) {
      ref.current.innerHTML = initialText || ''
      ref.current._initialised = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      style={{ flex: 1, padding: '5px 8px', outline: 'none', minHeight: '28px', cursor: 'text', wordBreak: 'break-word', fontSize: '0.95rem', lineHeight: 1.5, color: '#1a2030' }}
      onInput={e => onTextChange(e.currentTarget.innerHTML)}
      onMouseDown={e => e.stopPropagation()} // prevent drag when clicking in text
    />
  )
}

export const FILL_COLORS = [
  { name: 'None (transparent)', value: null },
  { name: 'Lemon',    value: '#fef9c3' },
  { name: 'Sky blue', value: '#dbeafe' },
  { name: 'Mint',     value: '#dcfce7' },
  { name: 'Rose',     value: '#fce7f3' },
  { name: 'Lavender', value: '#ede9fe' },
]

// ─── TeachWhiteboard ──────────────────────────────────────────
// Custom rich-text whiteboard for the Teach view. Has its own toolbar:
// bold / italic / underline / strikethrough / colours /
// insert blank / insert rectangle (with colour options).
export const RECT_COLORS = [
  { name: 'Blue',   value: '#2563eb' },
  { name: 'Red',    value: '#dc2626' },
  { name: 'Green',  value: '#16a34a' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Black',  value: '#1a2030' },
]

export function TeachWhiteboard({ value = '', onChange, placeholder, style = {}, storageKey = null }) {
  const ref        = useRef(null)
  const skipSync   = useRef(false)
  const containerRef = useRef(null)
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strike: false })
  const [showRectPalette, setShowRectPalette] = useState(false)
  const [selectedBoxId, setSelectedBoxId] = useState(null)
  const [pendingBorderColor, setPendingBorderColor] = useState(RECT_COLORS[0].value)
  const [pendingNoBorder,    setPendingNoBorder]    = useState(false)
  const [pendingFillColor,   setPendingFillColor]   = useState(null) // null = transparent white

  // Floating boxes — independent of text content
  const [boxes, setBoxes] = useState(() => {
    if (!storageKey) return []
    try { const s = localStorage.getItem(storageKey + '_boxes'); return s ? JSON.parse(s) : [] } catch { return [] }
  })
  const [dragging, setDragging] = useState(null)
  const [resizing, setResizing] = useState(null)

  const persistBoxes = (next) => {
    setBoxes(next)
    if (storageKey) { try { localStorage.setItem(storageKey + '_boxes', JSON.stringify(next)) } catch {} }
  }

  useEffect(() => {
    const onMove = (e) => {
      if (dragging) {
        const dx = e.clientX - dragging.startMX
        const dy = e.clientY - dragging.startMY
        setBoxes(prev => prev.map(b => b.id === dragging.id
          ? { ...b, x: dragging.startBX + dx, y: dragging.startBY + dy } : b))
      }
      if (resizing) {
        const dw = e.clientX - resizing.startMX
        const dh = e.clientY - resizing.startMY
        setBoxes(prev => prev.map(b => b.id === resizing.id
          ? { ...b, w: Math.max(40, resizing.startW + dw), h: Math.max(28, resizing.startH + dh) } : b))
      }
    }
    const onUp = () => {
      if (dragging || resizing) {
        setBoxes(prev => { if (storageKey) { try { localStorage.setItem(storageKey + '_boxes', JSON.stringify(prev)) } catch {} } return prev })
        setDragging(null); setResizing(null)
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging, resizing, storageKey])

  useLayoutEffect(() => {
    if (!ref.current || skipSync.current) return
    if (ref.current.innerHTML !== value) ref.current.innerHTML = value
  })

  useEffect(() => {
    const update = () => {
      if (!ref.current) return
      const active = document.activeElement
      if (active !== ref.current && !ref.current.contains(active)) return
      setFmt({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), underline: document.queryCommandState('underline'), strike: document.queryCommandState('strikeThrough') })
    }
    document.addEventListener('selectionchange', update)
    return () => document.removeEventListener('selectionchange', update)
  }, [])

  const emit = () => {
    skipSync.current = true
    onChange?.(ref.current?.innerHTML ?? '')
    requestAnimationFrame(() => { skipSync.current = false })
  }

  const exec = (cmd, val = null) => {
    ref.current?.focus()
    document.execCommand(cmd, false, val)
    emit()
    setFmt({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), underline: document.queryCommandState('underline'), strike: document.queryCommandState('strikeThrough') })
  }

  const insertBlank = () => {
    ref.current?.focus()
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    const range = sel.getRangeAt(0)
    range.deleteContents()
    const blank = document.createElement('span')
    blank.style.cssText = 'display:inline-block; border-bottom:2.5px solid #1a2030; min-width:80px; margin:0 3px; vertical-align:bottom;'
    blank.innerHTML = ' '
    range.insertNode(blank)
    range.setStartAfter(blank); range.collapse(true)
    sel.removeAllRanges(); sel.addRange(range)
    emit()
  }

  const applyFontSize = (sizePx) => {
    ref.current?.focus()
    // Use fontSize=7 trick then replace <font> with a styled <span>
    document.execCommand('fontSize', false, '7')
    const fontEls = ref.current?.querySelectorAll('font[size="7"]')
    fontEls?.forEach(el => {
      const span = document.createElement('span')
      span.style.fontSize = sizePx
      span.innerHTML = el.innerHTML
      el.parentNode?.replaceChild(span, el)
    })
    emit()
  }

  const getCurrentFontSizePx = () => {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return 18
    const node = sel.getRangeAt(0).startContainer
    const el = node.nodeType === 3 ? node.parentElement : node
    return parseFloat(window.getComputedStyle(el).fontSize) || 18
  }

  const adjustFontSize = (delta) => {
    ref.current?.focus()
    const next = Math.max(8, Math.min(72, Math.round(getCurrentFontSizePx() + delta)))
    applyFontSize(next + 'px')
  }

  const addBox = () => {
    setShowRectPalette(false)
    const newBox = {
      id: crypto.randomUUID(), x: 24, y: 24, w: 180, h: 72,
      color: pendingBorderColor,
      noBorder: pendingNoBorder,
      fillColor: pendingFillColor,
      text: '',
    }
    persistBoxes([...boxes, newBox])
  }

  const btnBase = { padding: '0.22rem 0.55rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', fontSize: '0.85rem', lineHeight: 1, transition: 'background 0.12s' }
  const activeS  = { background: 'rgba(0,0,0,0.12)', fontWeight: 700 }

  return (
    <div className="rte-wrapper" style={style}>
      <div className="rte-toolbar" style={{ flexWrap: 'wrap', gap: '0.15rem', position: 'relative' }}>
        <button type="button" title="Bold" style={{ ...btnBase, fontWeight: 700, ...(fmt.bold ? activeS : {}) }}
          onMouseDown={e => { e.preventDefault(); exec('bold') }}>B</button>
        <button type="button" title="Italic" style={{ ...btnBase, fontStyle: 'italic', ...(fmt.italic ? activeS : {}) }}
          onMouseDown={e => { e.preventDefault(); exec('italic') }}>I</button>
        <button type="button" title="Underline" style={{ ...btnBase, textDecoration: 'underline', ...(fmt.underline ? activeS : {}) }}
          onMouseDown={e => { e.preventDefault(); exec('underline') }}>U</button>
        <button type="button" title="Strikethrough" style={{ ...btnBase, textDecoration: 'line-through', ...(fmt.strike ? activeS : {}) }}
          onMouseDown={e => { e.preventDefault(); exec('strikeThrough') }}>S</button>

        {/* Font size controls: − dropdown + */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1px', border: '1px solid var(--border)', borderRadius: '5px', overflow: 'hidden', height: '26px' }}>
          <button type="button" title="Decrease font size"
            style={{ ...btnBase, padding: '0 0.45rem', fontWeight: 700, fontSize: '1rem', lineHeight: 1, height: '100%', borderRadius: 0, border: 'none' }}
            onMouseDown={e => { e.preventDefault(); adjustFontSize(-2) }}>−</button>
          <select
            title="Font size — select text first"
            defaultValue=""
            onChange={e => { if (e.target.value) { applyFontSize(e.target.value); e.target.value = '' } }}
            style={{ fontSize: '0.78rem', padding: '0.2rem 0.2rem', border: 'none', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit', height: '100%' }}>
            <option value="" disabled>Size</option>
            <option value="12px">12</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="18px">18 — Small</option>
            <option value="20px">20</option>
            <option value="24px">24 — Normal</option>
            <option value="28px">28</option>
            <option value="32px">32 — Large</option>
            <option value="36px">36</option>
          </select>
          <button type="button" title="Increase font size"
            style={{ ...btnBase, padding: '0 0.45rem', fontWeight: 700, fontSize: '1rem', lineHeight: 1, height: '100%', borderRadius: 0, border: 'none' }}
            onMouseDown={e => { e.preventDefault(); adjustFontSize(2) }}>+</button>
        </div>

        <span className="rte-sep" />
        {RTE_COLORS.map(c => (
          <button key={c.hex} type="button" className="rte-color-dot" title={c.name}
            style={{ background: c.hex }}
            onMouseDown={e => { e.preventDefault(); exec('foreColor', c.hex) }} />
        ))}
        <span className="rte-sep" />
        <button type="button" title="Insert blank placeholder"
          style={{ ...btnBase, fontSize: '0.78rem', borderBottom: '2.5px solid #1a2030', paddingBottom: '0px', letterSpacing: '0.04em' }}
          onMouseDown={e => { e.preventDefault(); insertBlank() }}>___</button>
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <button type="button" title="Add a draggable coloured box"
            style={{ ...btnBase, fontSize: '0.78rem', border: '2px solid #1a2030', borderRadius: '4px' }}
            onMouseDown={e => { e.preventDefault(); setShowRectPalette(p => !p) }}>
            ⬜ Box
          </button>
          {showRectPalette && (
            <div style={{ position: 'absolute', top: '110%', left: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.65rem 0.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.14)', width: '226px', zIndex: 20 }}>

              {/* Border colour */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>Border colour</div>
              <div style={{ display: 'flex', gap: '0.28rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.55rem' }}>
                {RECT_COLORS.map(c => (
                  <button key={c.value} type="button" title={c.name}
                    style={{ width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer',
                      border: pendingBorderColor === c.value && !pendingNoBorder ? `3px solid #1a2030` : `2.5px solid ${c.value}`,
                      background: pendingBorderColor === c.value && !pendingNoBorder ? `${c.value}30` : 'transparent' }}
                    onMouseDown={e => { e.preventDefault(); setPendingBorderColor(c.value); setPendingNoBorder(false) }} />
                ))}
                <button type="button" title="No border"
                  style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit',
                    border: `1.5px dashed ${pendingNoBorder ? '#1a2030' : '#ccc'}`,
                    background: pendingNoBorder ? '#f0f0f0' : 'transparent', color: 'var(--text-muted)' }}
                  onMouseDown={e => { e.preventDefault(); setPendingNoBorder(p => !p) }}>None</button>
              </div>

              {/* Fill colour */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>Fill colour</div>
              <div style={{ display: 'flex', gap: '0.28rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                {FILL_COLORS.map(c => (
                  <button key={c.name} type="button" title={c.name}
                    style={{ width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer',
                      border: pendingFillColor === c.value ? `3px solid #1a2030` : `1.5px solid #ccc`,
                      background: c.value || 'transparent',
                      ...(c.value === null ? { backgroundImage: 'repeating-linear-gradient(45deg,#e0e0e0 0,#e0e0e0 2px,transparent 0,transparent 50%)', backgroundSize: '8px 8px' } : {}) }}
                    onMouseDown={e => { e.preventDefault(); setPendingFillColor(c.value) }} />
                ))}
              </div>

              {/* Add box button */}
              <button type="button"
                style={{ width: '100%', padding: '0.38rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: pendingNoBorder ? '#4a5568' : pendingBorderColor, color: '#fff',
                  fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600 }}
                onMouseDown={e => { e.preventDefault(); addBox() }}>
                + Add box
              </button>
            </div>
          )}
        </div>
        {boxes.length > 0 && (
          <button type="button" title="Clear all boxes"
            style={{ ...btnBase, fontSize: '0.72rem', color: '#e05c5c', marginLeft: 'auto' }}
            onMouseDown={e => { e.preventDefault(); persistBoxes([]) }}>✕ Clear boxes</button>
        )}
      </div>

      <div ref={containerRef} className="teach-boxes-container" style={{ position: 'relative' }}>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          className="rte-content"
          data-placeholder={placeholder}
          style={{ minHeight: '160px', resize: 'vertical', overflow: 'auto' }}
          onInput={emit}
          onBlur={emit}
          onClick={() => { setShowRectPalette(false); setSelectedBoxId(null) }}
        />

        {boxes.map(box => {
          const isSelected = selectedBoxId === box.id
          return (
          <div key={box.id}
            className="teach-box"
            style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, minHeight: box.h,
              border: box.noBorder ? 'none' : `2.5px solid ${box.color}`,
              borderRadius: '6px',
              background: box.fillColor || 'rgba(255,255,255,0.96)',
              boxSizing: 'border-box', userSelect: 'none', zIndex: 5,
              display: 'flex', flexDirection: 'column' }}
            onMouseDown={() => setSelectedBoxId(box.id)}>

            {/* Drag handle — narrow bar at top */}
            <div
              style={{ height: '10px', background: `${box.color}28`, borderBottom: `1px solid ${box.color}40`,
                borderRadius: '4px 4px 0 0', cursor: dragging?.id === box.id ? 'grabbing' : 'grab',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setSelectedBoxId(box.id);
                setDragging({ id: box.id, startMX: e.clientX, startMY: e.clientY, startBX: box.x, startBY: box.y }) }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: box.color, opacity: 0.5 }} />)}
            </div>

            {/* Editable text area */}
            <BoxTextArea
              key={box.id + '_text'}
              initialText={box.text || ''}
              color={box.color}
              onTextChange={text => persistBoxes(boxes.map(b => b.id === box.id ? { ...b, text } : b))}
            />

            {/* ✕ delete — only when selected */}
            {isSelected && (
              <div
                style={{ position: 'absolute', top: -9, right: -9, width: 17, height: 17, borderRadius: '50%',
                  background: box.color, color: '#fff', fontSize: '10px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 6, lineHeight: 1 }}
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); persistBoxes(boxes.filter(b => b.id !== box.id)); setSelectedBoxId(null) }}>
                ✕
              </div>
            )}

            {/* Resize handle */}
            <div
              style={{ position: 'absolute', bottom: 2, right: 2, width: 7, height: 7,
                borderRight: `2px solid ${box.color}`, borderBottom: `2px solid ${box.color}`,
                cursor: 'se-resize', zIndex: 6, opacity: 0.7 }}
              onMouseDown={e => { e.preventDefault(); e.stopPropagation();
                setResizing({ id: box.id, startMX: e.clientX, startMY: e.clientY, startW: box.w, startH: box.h }) }} />
          </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── TeachView ────────────────────────────────────────────────
export function TeachView({ plan, onBack }) {
  const [whiteboard,     setWhiteboard]     = useState(() => { try { return localStorage.getItem('wb_' + plan.id) || '' } catch { return '' } })
  const [exerciseCache,  setExerciseCache]  = useState({})
  const [loadingEx,      setLoadingEx]      = useState(false)
  const [expandedStages, setExpandedStages] = useState(new Set())
  const [demoAnswers,    setDemoAnswers]    = useState({})
  // Live student submissions
  const [planAsgns,      setPlanAsgns]      = useState([])
  const [loadingAsgnId,  setLoadingAsgnId]  = useState(null)
  const [lastRefresh,    setLastRefresh]    = useState(null)
  const [reviewingDetails, setReviewingDetails] = useState(null) // full details for inline review

  const saveWb = (v) => { setWhiteboard(v); try { localStorage.setItem('wb_' + plan.id, v) } catch {} }

  const lessonStages = (plan.lesson_stages ?? [])
    .filter(s => (s.section ?? 'lesson') !== 'homework')
    .sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0) || a.order_index - b.order_index)
  const homeworkStages = (plan.lesson_stages ?? []).filter(s => s.section === 'homework')

  const stageGroups = lessonStages.reduce((acc, s) => {
    const num = s.stage_number ?? 1
    if (!acc[num]) acc[num] = { number: num, name: s.stage_name, items: [] }
    acc[num].items.push(s)
    return acc
  }, {})

  useEffect(() => {
    const ids = [...new Set(
      (plan.lesson_stages ?? []).map(s => s.exercises?.id || s.exercise_id).filter(Boolean)
    )]
    if (!ids.length) return
    setLoadingEx(true)
    Promise.all(ids.map(id => fetchExerciseWithQuestions(id))).then(results => {
      const cache = {}
      results.forEach(ex => { if (ex) cache[ex.id] = ex })
      setExerciseCache(cache)
      setLoadingEx(false)
    })
  }, [plan.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh student submissions every 30s
  const refreshPlanAsgns = () => fetchPlanAssignmentsAdmin(plan.id).then(data => {
    setPlanAsgns(data); setLastRefresh(new Date())
  })
  useEffect(() => {
    refreshPlanAsgns()
    const iv = setInterval(refreshPlanAsgns, 30000)
    return () => clearInterval(iv)
  }, [plan.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const openAsgnReview = async (asgnId) => {
    setLoadingAsgnId(asgnId)
    const details = await fetchAssignmentDetails(asgnId)
    setLoadingAsgnId(null)
    if (details) setReviewingDetails(details)
  }

  const renderStageStudents = (stage) => {
    if (!stage.exercise_id) return null
    const asgns = planAsgns.filter(a => a.exercise_id === stage.exercise_id)
    if (!asgns.length) return null
    return (
      <div style={{ borderTop: '1px dashed #e8e3d8', padding: '0.5rem 0.85rem 0.6rem', background: '#fafaf8' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          👥 Student progress
        </div>
        {asgns.map(a => {
          const name = a.profiles?.name || a.profiles?.email || 'Student'
          const submitted = a.status === 'submitted'
          const reviewed  = !!a.feedback_at
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              {submitted && !reviewed && <span title="New — not reviewed yet" style={{ width: 8, height: 8, borderRadius: '50%', background: '#e05c5c', flexShrink: 0 }} />}
              <span style={{ fontSize: '0.82rem', flex: 1, fontWeight: 500 }}>{name}</span>
              {submitted ? (
                <button className="btn-ghost"
                  style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem',
                    color: reviewed ? '#16a34a' : '#b91c1c',
                    borderColor: reviewed ? '#bbf7d0' : '#fca5a5' }}
                  onClick={() => openAsgnReview(a.id)}
                  disabled={loadingAsgnId === a.id}>
                  {loadingAsgnId === a.id ? '…' : reviewed ? '✓ Reviewed' : '📥 Review answers'}
                </button>
              ) : (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>⏳ Not submitted</span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const toggleStage = (id) => setExpandedStages(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const PLAN_STAGE_COLORS = {
    controlled_exercise: '#3b82f6', free_exercise: '#059669',
    lead_in: '#d97706', feedback: '#7c3aed', instruction: '#64748b', clarification: '#dc2626',
  }

  const renderStage = (stage) => {
    const exId = stage.exercises?.id || stage.exercise_id
    const def = STAGE_TYPES.find(t => t.value === stage.stage_type) || { icon: '▸', label: stage.stage_type || 'Activity' }
    const color = PLAN_STAGE_COLORS[stage.stage_type] || '#94a3b8'
    const isExpanded = expandedStages.has(stage.id)
    const hasContent = !!exId
    const title = stage.exercises?.title || stage.title || def.label

    return (
      <div key={stage.id} style={{ background: '#fff', borderRadius: '8px', border: `1px solid ${isExpanded ? '#d4c9b4' : '#e8e3d8'}`, borderLeft: `4px solid ${color}`, marginBottom: '0.45rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.85rem', cursor: hasContent ? 'pointer' : 'default' }}
          onClick={() => hasContent && toggleStage(stage.id)}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>{def.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', color, fontWeight: 600, background: `${color}18`, padding: '0.1rem 0.42rem', borderRadius: '20px' }}>{def.label}</span>
              {stage.duration_minutes && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>⏱ {stage.duration_minutes} min</span>}
            </div>
          </div>
          {hasContent && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>}
        </div>
        {isExpanded && exId && (
          <div style={{ borderTop: '1px solid #e8e3d8', padding: '0.75rem 0.85rem', background: '#fafaf8' }}>
            <InlineExerciseContent
              exerciseId={exId}
              exerciseCache={exerciseCache}
              loadingExercises={loadingEx}
              demoAnswers={demoAnswers}
              setDemoAnswers={setDemoAnswers}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #e8e3d8' }}>
              <button type="button" onClick={() => toggleStage(stage.id)}
                style={{ background: 'none', border: '1px solid #d4c9b4', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.25rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                ▲ Close
              </button>
            </div>
          </div>
        )}
        {/* Live student submissions — always shown when they exist */}
        {renderStageStudents(stage)}
      </div>
    )
  }

  // Inline student answer review
  if (reviewingDetails) {
    return (
      <div className="teach-view-wrapper" style={{ background: '#F2EFE8', margin: '-1.5rem', padding: '1.5rem', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', minHeight: '60vh' }}>
        <AdminExerciseReview
          details={reviewingDetails}
          onBack={() => { setReviewingDetails(null); refreshPlanAsgns() }}
        />
      </div>
    )
  }

  return (
    <div className="teach-view-wrapper" style={{ background: '#F2EFE8', margin: '-1.5rem', padding: '1.5rem', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', minHeight: '60vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button className="back-btn" style={{ margin: 0 }} onClick={onBack}>← Back to lesson plans</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {lastRefresh && planAsgns.length > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              🔄 Live · {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.7rem' }} onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>

      {/* Title */}
      <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.6rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>{plan.title}</h2>

      {/* Whiteboard */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <strong style={{ fontSize: '0.92rem' }}>📝 Whiteboard</strong>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>(drag bottom-right corner to resize · select text then click ⬜ Box to frame it)</span>
          {whiteboard && (
            <button type="button" className="btn-ghost"
              style={{ fontSize: '0.72rem', padding: '0.18rem 0.5rem', marginLeft: 'auto', color: '#e05c5c' }}
              onClick={() => saveWb('')}>✕ Clear</button>
          )}
        </div>
        <TeachWhiteboard
          value={whiteboard}
          onChange={saveWb}
          placeholder="Type your notes, emerging language, or instructions here…"
          style={{ border: '2px solid var(--gold)', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,102,153,0.10)' }}
          storageKey={`teach_boxes_${plan.id}`}
        />
      </div>

      {/* Lesson stages */}
      {Object.keys(stageGroups).length > 0 && (
        <div className="builder-section">
          <h4 className="builder-section-title">📌 Lesson stages</h4>
          {Object.values(stageGroups).map(group => (
            <div key={group.number} style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem', color: 'var(--gold)' }}>
                {group.number}{group.name ? ` — ${group.name}` : ''}
              </div>
              {group.items.map(stage => renderStage(stage))}
            </div>
          ))}
        </div>
      )}

      {/* Homework */}
      {homeworkStages.length > 0 && (
        <div className="builder-section" style={{ marginTop: '1rem' }}>
          <h4 className="builder-section-title">📚 Homework</h4>
          {homeworkStages.map(stage => renderStage(stage))}
        </div>
      )}
    </div>
  )
}

export function RecentlyDeletedPanel({ type, onClose }) {
  const items = getRecentlyDeleted().filter(i => i.type === type)
  return (
    <div style={{ position: 'fixed', bottom: '5rem', right: '1.5rem', width: '320px', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-darker)' }}>
        <strong style={{ fontSize: '0.88rem' }}>🗑 Recently Deleted</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-muted)', padding: '0.1rem 0.3rem' }}>✕</button>
      </div>
      <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '0.5rem' }}>
        {items.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No recently deleted items.</p>
        ) : (
          items.map((item, i) => (
            <div key={i} style={{ padding: '0.5rem 0.6rem', borderRadius: '6px', marginBottom: '0.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Deleted {new Date(item.deletedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function AdminLessonPlans({ adminUserId, studentScope = null }) {
  // studentScope = { id, name, email, isManual } — when set, only plans for that
  // student are shown, and the assign panel defaults to this student.
  const [exercises,      setExercises]      = useState([])
  const [plans,          setPlans]          = useState([])
  const [labels,         setLabels]         = useState([])
  const [books,          setBooks]          = useState([])
  const [authStudents,   setAuthStudents]   = useState([])
  const [manualStudents, setManualStudents] = useState([])
  const [loading,        setLoading]        = useState(true)
  const [view,           setView]           = useState('list') // 'list' | 'create' | 'edit' | 'view'
  const [editingPlan,    setEditingPlan]    = useState(null)
  const [viewingPlan,    setViewingPlan]    = useState(null)
  const [teachingPlan,   setTeachingPlan]   = useState(null)
  const [deletingPlanId, setDeletingPlanId] = useState(null)

  // Filters
  const [filterEnglishLevel, setFilterEnglishLevel] = useState('')
  const [filterLessonLevel,  setFilterLessonLevel]  = useState('')
  const [showPlanFilters,    setShowPlanFilters]    = useState(false)
  const [showRecentlyDeleted, setShowRecentlyDeleted] = useState(false)

  // Draft indicator — check if a draft was saved by this admin
  const draftStorageKey = adminUserId ? `lessonPlanDraft_${adminUserId}` : null
  const [hasDraft, setHasDraft] = useState(() => {
    if (!draftStorageKey) return false
    try { return !!localStorage.getItem(draftStorageKey) } catch { return false }
  })

  // Assign plan to student
  const [assigningPlanId, setAssigningPlanId] = useState(null)
  const [apStudentId,     setApStudentId]     = useState('')
  const [apMode,          setApMode]          = useState('homework')
  const [apNote,          setApNote]          = useState('')
  const [apScheduledAt,   setApScheduledAt]   = useState('')
  const [apSaving,        setApSaving]        = useState(false)
  const [apError,         setApError]         = useState(null)
  const [apDone,          setApDone]          = useState(false)
  const [apMultiIds,      setApMultiIds]      = useState([]) // selected student IDs for bulk assign
  const [apBulkDone,      setApBulkDone]      = useState([]) // track which student IDs succeeded
  const [apIsMulti,       setApIsMulti]       = useState(false) // toggle between single/multi mode

  // Choose the plan-fetch strategy based on scope
  const fetchScopedPlans = () => {
    if (!studentScope) return fetchAllLessonPlans()
    return studentScope.isManual
      ? fetchPlansForManualStudentAdmin(studentScope.id)
      : fetchAssignedPlansForStudent(studentScope.id)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchAllExercises(),
      fetchScopedPlans(),
      fetchAllLabels(),
      fetchAllBooks(),
      fetchStudentsAdmin(),
      fetchManualStudents(),
    ]).then(([exs, pls, lbls, bks, auths, manuals]) => {
      setExercises(exs); setPlans(pls); setLabels(lbls)
      setBooks(bks); setAuthStudents(auths); setManualStudents(manuals)
      setLoading(false)
    })
  }, [studentScope?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const reloadAll = () => Promise.all([fetchAllExercises(), fetchScopedPlans()])
    .then(([exs, pls]) => { setExercises(exs); setPlans(pls) })

  const handleAssignPlan = async (planId) => {
    if (!apStudentId) { setApError('Please select a student.'); return }
    setApSaving(true); setApError(null)
    const isManual = manualStudents.some(s => s.id === apStudentId)
    const ok = await assignLessonPlan({
      planId,
      studentId:       isManual ? null : apStudentId,
      manualStudentId: isManual ? apStudentId : null,
      assignedBy: adminUserId, mode: apMode, note: apNote || null,
      scheduledAt: apScheduledAt ? new Date(apScheduledAt).toISOString() : null,
    })
    setApSaving(false)
    if (ok === true) {
      setApDone(true)
      if (studentScope) reloadAll()
      setTimeout(() => { setAssigningPlanId(null); setApDone(false); setApStudentId(''); setApNote(''); setApScheduledAt('') }, 2000)
    } else { setApError('Assignment failed: ' + (ok?.error || 'Unknown error — check the browser console for details.')) }
  }

  const handleBulkAssign = async (planId) => {
    if (!apMultiIds.length) { setApError('Select at least one student.'); return }
    setApSaving(true); setApError(null)
    const results = await Promise.all(
      apMultiIds.map(sid => {
        const isManual = manualStudents.some(s => s.id === sid)
        return assignLessonPlan({
          planId,
          studentId:       isManual ? null : sid,
          manualStudentId: isManual ? sid : null,
          assignedBy: adminUserId, mode: apMode, note: apNote || null,
          scheduledAt: apScheduledAt ? new Date(apScheduledAt).toISOString() : null,
        })
      })
    )
    setApSaving(false)
    const succeeded = apMultiIds.filter((_, i) => results[i])
    setApBulkDone(succeeded)
    if (studentScope) reloadAll()
    if (succeeded.length === apMultiIds.length) {
      setTimeout(() => { setAssigningPlanId(null); setApMultiIds([]); setApBulkDone([]); setApNote(''); setApScheduledAt('') }, 2000)
    }
  }

  const builderProps = {
    exercises, labels, books, authStudents, manualStudents, adminUserId,
  }

  if (view === 'create') {
    return <LessonStageBuilder {...builderProps}
      onCancel={() => {
        // Re-check if a draft was saved while in the builder
        const stillHasDraft = draftStorageKey ? !!localStorage.getItem(draftStorageKey) : false
        setHasDraft(stillHasDraft)
        setView('list')
      }}
      onSaved={() => { setHasDraft(false); reloadAll(); setView('list') }} />
  }
  if (view === 'edit' && editingPlan) {
    return <LessonStageBuilder {...builderProps}
      initialPlan={editingPlan}
      onCancel={() => { setView('list'); setEditingPlan(null) }}
      onSaved={(newExs) => { reloadAll(); setView('list'); setEditingPlan(null) }} />
  }
  if (view === 'view' && viewingPlan) {
    return <LessonPlanView
      plan={viewingPlan}
      exercises={exercises}
      onBack={() => { setView('list'); setViewingPlan(null) }}
      adminUserId={adminUserId}
      adminEmail={ADMIN_EMAIL}
    />
  }
  if (view === 'teach' && teachingPlan) {
    return <TeachView
      plan={teachingPlan}
      onBack={() => { setView('list'); setTeachingPlan(null) }}
    />
  }

  return (
    <div>
      <div className="admin-exercises-toolbar">
        <h3 style={{ margin: 0 }}>
          {studentScope ? `Lesson Plans — ${studentScope.name || 'student'} (${plans.length})` : `Lesson Plans (${plans.length})`}
        </h3>
        {!studentScope && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', position: 'relative' }}
              onClick={() => setShowPlanFilters(p => !p)}>
              🔽 Filters
              {filterEnglishLevel && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--gold)', color: '#fff', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', lineHeight: 1.4 }}>1</span>}
            </button>
            <button className="btn-gold" onClick={() => setView('create')}>+ Create plan</button>
          </div>
        )}
      </div>

      {/* Draft in progress banner */}
      {!studentScope && hasDraft && (
        <div style={{
          background: 'linear-gradient(135deg, #fef9ec 0%, #fdf3d3 100%)',
          border: '1.5px solid var(--gold)', borderRadius: '10px',
          padding: '0.9rem 1.1rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>📋 Draft in progress</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginLeft: '0.6rem' }}>
              You have an unsaved lesson plan draft.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button className="btn-gold" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
              onClick={() => setView('create')}>
              Resume →
            </button>
            <button className="btn-ghost" style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem', color: '#e05c5c' }}
              onClick={() => {
                if (draftStorageKey) { try { localStorage.removeItem(draftStorageKey) } catch { /* ignore */ } }
                setHasDraft(false)
              }}>
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Assign-to-student panel */}
      {assigningPlanId && (() => {
        const plan = plans.find(p => p.id === assigningPlanId)
        return (
          <div className="admin-assign-form" style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.75rem', fontWeight: 600 }}>Assign: {plan?.title}</p>
            <div className="form-field">
              <label>Student(s)</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <button type="button" className={`radio-option ${!apIsMulti ? 'selected' : ''}`}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem' }}
                  onClick={() => { setApIsMulti(false); setApMultiIds([]) }}>
                  Single student
                </button>
                <button type="button" className={`radio-option ${apIsMulti ? 'selected' : ''}`}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem' }}
                  onClick={() => { setApIsMulti(true); setApStudentId('') }}>
                  Multiple students
                </button>
              </div>
              {!apIsMulti ? (
                <select value={apStudentId} onChange={e => setApStudentId(e.target.value)}>
                  <option value="">Select student…</option>
                  <optgroup label="Registered students">
                    {authStudents.filter(s => s.access_level !== 'pending').map(s => (
                      <option key={s.id} value={s.id}>{s.name || s.email}</option>
                    ))}
                  </optgroup>
                  {manualStudents.length > 0 && (
                    <optgroup label="Manual students (no portal access)">
                      {manualStudents.map(s => (
                        <option key={s.id} value={s.id}>📝 {s.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '180px', overflowY: 'auto', padding: '0.25rem 0' }}>
                  {authStudents.filter(s => s.access_level !== 'pending').map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.87rem' }}>
                      <input type="checkbox" checked={apMultiIds.includes(s.id)}
                        onChange={e => setApMultiIds(prev =>
                          e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id)
                        )} />
                      {s.name || s.email}
                      {apBulkDone.includes(s.id) && <span style={{ color: '#22c55e', fontSize: '0.75rem' }}>✓</span>}
                    </label>
                  ))}
                  {manualStudents.length > 0 && (
                    <>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, paddingTop: '0.35rem', paddingLeft: '0.1rem' }}>Manual students (no portal access)</div>
                      {manualStudents.map(s => (
                        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.87rem' }}>
                          <input type="checkbox" checked={apMultiIds.includes(s.id)}
                            onChange={e => setApMultiIds(prev =>
                              e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id)
                            )} />
                          📝 {s.name}
                          {apBulkDone.includes(s.id) && <span style={{ color: '#22c55e', fontSize: '0.75rem' }}>✓</span>}
                        </label>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="form-field" style={{ marginTop: '0.5rem' }}>
              <label style={{ fontSize: '0.82rem' }}>📅 Lesson date &amp; time <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input type="datetime-local" value={apScheduledAt} onChange={e => setApScheduledAt(e.target.value)}
                style={{ fontSize: '0.85rem' }} />
            </div>
            <div className="form-field">
              <label>Note <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input type="text" placeholder="e.g. Complete before Friday's lesson"
                value={apNote} onChange={e => setApNote(e.target.value)} />
            </div>
            {apError && <div className="auth-error">{apError}</div>}
            {apDone && (
              <div style={{ color: '#22c55e', padding: '0.5rem 0.75rem', background: 'rgba(34,197,94,0.12)',
                borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                ✓ Plan assigned to student successfully
              </div>
            )}
            <button className="btn-gold btn-full"
              disabled={apSaving || (apIsMulti ? apMultiIds.length === 0 : !apStudentId) || apDone}
              onClick={() => apIsMulti
                ? handleBulkAssign(assigningPlanId)
                : handleAssignPlan(assigningPlanId)}>
              {apSaving ? 'Assigning…'
                : apIsMulti
                  ? `Assign to ${apMultiIds.length} student${apMultiIds.length > 1 ? 's' : ''} →`
                  : 'Assign all exercises to student →'}
            </button>
          </div>
        )
      })()}

      {/* Collapsible filter panel */}
      {showPlanFilters && (
        <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Filter lesson plans</span>
            {filterEnglishLevel && (
              <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                onClick={() => setFilterEnglishLevel('')}>✕ Clear</button>
            )}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Course</div>
            <select value={filterEnglishLevel} onChange={e => setFilterEnglishLevel(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: '#fff' }}>
              <option value="">All courses</option>
              {getAdminCourses().map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {loading ? <p>Loading…</p> : plans.length === 0 ? (
        <div className="dashboard-empty"><p>{studentScope ? 'No lesson plans assigned to this student yet.' : 'No lesson plans yet.'}</p></div>
      ) : (() => {
        const filteredPlans = plans.filter(p =>
          (!filterEnglishLevel || p.english_level === filterEnglishLevel)
        )
        return (
        <div className="plan-list">
          {filteredPlans.length === 0 && (
            <div className="dashboard-empty"><p>No plans match the current filters.</p></div>
          )}
          {filteredPlans.map(p => {
            const studentName = p.profiles?.name || p.profiles?.email || p.manual_students?.name || null
            return (
              <div key={p.id} className="plan-row">
                <div>
                  <strong>{p.title}</strong>
                  {p.description && <span className="plan-desc"> — {p.description}</span>}
                  <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {p.english_level && (
                      <span className="admin-level-chip" style={{ background: '#EEF4F8', color: 'var(--gold)', fontWeight: 600 }}>{p.english_level}</span>
                    )}
                    {studentName && (
                      <span className="admin-level-chip">👤 {studentName}</span>
                    )}
                    {p.scheduled_at && (
                      <span className="admin-level-chip" style={{ color: 'var(--gold)' }}>
                        📅 {new Date(p.scheduled_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <button
                    style={{ fontSize: '0.88rem', fontWeight: 700, padding: '0.4rem 1.1rem', borderRadius: '8px', border: 'none', background: 'var(--gold)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em', boxShadow: '0 2px 6px rgba(0,102,153,0.25)', transition: 'filter 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.12)'}
                    onMouseLeave={e => e.currentTarget.style.filter = ''}
                    onClick={() => { setTeachingPlan(p); setView('teach') }}>
                    🎓 Teach
                  </button>
                  <button className="btn-ghost"
                    style={{ fontSize: '0.85rem', color: assigningPlanId === p.id ? undefined : 'var(--gold)', borderColor: assigningPlanId === p.id ? undefined : 'var(--gold)' }}
                    onClick={() => {
                      setAssigningPlanId(p.id === assigningPlanId ? null : p.id)
                      setApStudentId(studentScope ? studentScope.id : ''); setApMode('homework'); setApNote(''); setApError(null); setApDone(false); setApMultiIds([]); setApBulkDone([])
                    }}>
                    {assigningPlanId === p.id ? '✕ Cancel' : 'Assign →'}
                  </button>
                  <button className="btn-ghost" style={{ fontSize: '0.85rem' }}
                    onClick={() => { setViewingPlan(p); setView('view') }}>View</button>
                  <button className="btn-ghost" style={{ fontSize: '0.85rem' }}
                    onClick={() => { setEditingPlan(p); setView('edit') }}>Edit</button>
                  <button className="btn-ghost" style={{ fontSize: '0.85rem' }}
                    onClick={async () => {
                      const newId = await duplicateLessonPlan(p.id, adminUserId)
                      if (newId) reloadAll()
                    }}>Duplicate</button>
                  {deletingPlanId === p.id ? (
                    <>
                      <button className="btn-ghost"
                        style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', color: '#e05c5c', borderColor: '#e05c5c' }}
                        onClick={async () => {
                          const ok = await deleteLessonPlan(p.id)
                          if (ok) {
                            logRecentlyDeleted('lesson_plan', p.id, p.title)
                            setPlans(prev => prev.filter(x => x.id !== p.id))
                            setDeletingPlanId(null)
                          }
                        }}>Confirm delete</button>
                      <button className="btn-ghost"
                        style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => setDeletingPlanId(null)}>Cancel</button>
                    </>
                  ) : (
                    <button className="btn-ghost"
                      style={{ fontSize: '0.85rem', color: '#e05c5c' }}
                      onClick={() => setDeletingPlanId(p.id)}>Delete</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        )
      })()}

      {/* Recently Deleted button - bottom right */}
      {!studentScope && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
            onClick={() => setShowRecentlyDeleted(p => !p)}>
            🗑 Recently Deleted
          </button>
        </div>
      )}
      {!studentScope && showRecentlyDeleted && <RecentlyDeletedPanel type="lesson_plan" onClose={() => setShowRecentlyDeleted(false)} />}
    </div>
  )
}

// ─── ExerciseBuilder ─────────────────────────────────────────
export const EXERCISE_LEVELS = [
  'Elementary',
  'Lower Intermediate',
  'Upper Intermediate',
  'Advanced',
  'Elementary Business',
  'Intermediate Business',
  'Hospitality English',
]

// Module-level courses cache — populated from Supabase on login
export function logRecentlyDeleted(type, id, title) {
  try {
    const key = 'recently_deleted_v1'
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    const updated = [{ type, id, title, deletedAt: new Date().toISOString() }, ...existing].slice(0, 50)
    localStorage.setItem(key, JSON.stringify(updated))
  } catch {}
}

export function getRecentlyDeleted() {
  try {
    return JSON.parse(localStorage.getItem('recently_deleted_v1') || '[]')
  } catch { return [] }
}

export const BUILDER_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice', icon: '☑️' },
  { value: 'fill_blank',      label: 'Fill in the Blank', icon: '✏️' },
  { value: 'true_false',      label: 'True / False', icon: '✓✗' },
  { value: 'matching',        label: 'Matching', icon: '↔️' },
  { value: 'word_choice',     label: 'Word Choice', icon: '↕️' },
  { value: 'listening',       label: 'Listening', icon: '🎧' },
  { value: 'viewing',         label: 'Viewing',   icon: '🎥' },
  { value: 'speaking',        label: 'Speaking',  icon: '🎙️' },
]

// ─── Stage group & card color palettes ───────────────────────
export const STAGE_GROUP_COLORS = [
  { bg: '#EAF3DE', border: '#c5dfa3', pill: '#4a8a1a' },  // green
  { bg: '#E6F1FB', border: '#a8c8e8', pill: '#2b72b5' },  // blue
  { bg: '#EEEDFE', border: '#c4c1f5', pill: '#6058cc' },  // purple
  { bg: '#FDF6E0', border: '#e8d99a', pill: '#a07a10' },  // amber
]
export const STAGE_TYPE_CARD_BG = {
  'controlled_exercise': '#FAEEDA',
  'free_exercise':       '#FBEAF0',
  'lead_in':             '#EEEDFE',
  'instruction':         '#E1F5EE',
  'feedback':            '#E6F1FB',
  'clarification':       '#F1EFE8',
}

// ─── Lesson stage types ───────────────────────────────────────
export function newStage(type) {
  return {
    id:             crypto.randomUUID(),
    type,
    title:          '',
    durationMinutes: null,
    customDuration:  '',
    exerciseId:      null,
    contentText:     '',
    audioUrl:        '',
    contentImages:   [],
    teacherNotes:    '',
  }
}

export function initStagesFromPlan(plan) {
  if (!plan) return []
  // Use lesson_stages if they exist (new builder)
  const stages = (plan.lesson_stages ?? []).slice().sort((a, b) => a.order_index - b.order_index)
  if (stages.length > 0) {
    return stages.map(s => ({
      id:             s.id,
      type:           s.stage_type,
      title:          s.title         || '',
      durationMinutes: [5, 10, 15].includes(s.duration_minutes) ? s.duration_minutes
                     : s.duration_minutes ? 'other' : null,
      customDuration:  ![5, 10, 15].includes(s.duration_minutes) && s.duration_minutes
                       ? String(s.duration_minutes) : '',
      exerciseId:      s.exercise_id  || null,
      exerciseTitle:   s.exercises?.title || '',
      contentText:     s.content_text || '',
      audioUrl:        s.audio_url    || '',
      contentImages:   s.content_images || [],
      teacherNotes:    s.teacher_notes || '',
    }))
  }
  // Fallback: convert legacy lesson_plan_exercises to controlled_exercise stages
  return (plan.lesson_plan_exercises ?? [])
    .slice().sort((a, b) => a.order_index - b.order_index)
    .filter(lpe => lpe.exercises?.id)
    .map(lpe => ({
      id:             crypto.randomUUID(),
      type:           'controlled_exercise',
      title:          '',
      durationMinutes: null,
      customDuration:  '',
      exerciseId:      lpe.exercises.id,
      exerciseTitle:   lpe.exercises.title || '',
      contentText:     '',
      audioUrl:        '',
      contentImages:   [],
      teacherNotes:    '',
    }))
}

/** Convert a lesson plan's lesson_stages into grouped stage structure for the builder. */
export function initStageGroupsFromPlan(plan) {
  if (!plan) return [{ number: 1, name: '', items: [] }]
  // Only include lesson-section stages (not homework) in the stage builder
  const stages = (plan.lesson_stages ?? [])
    .filter(s => (s.section ?? 'lesson') !== 'homework')
    .slice().sort((a, b) => a.order_index - b.order_index)
  if (stages.length === 0) {
    // Legacy: load from lesson_plan_exercises
    const legacyItems = (plan.lesson_plan_exercises ?? [])
      .slice().sort((a, b) => a.order_index - b.order_index)
      .filter(lpe => lpe.exercises?.id)
      .map(lpe => ({
        id: crypto.randomUUID(), type: 'controlled_exercise', title: '',
        durationMinutes: null, customDuration: '', exerciseId: lpe.exercises.id,
        exerciseTitle: lpe.exercises.title || '', contentText: '', audioUrl: '', contentImages: [], teacherNotes: '',
      }))
    return [{ number: 1, name: '', items: legacyItems }]
  }
  // Group by stage_number; fall back to one group per item if stage_number is null
  const groups = {}
  stages.forEach((s, i) => {
    const num = s.stage_number ?? (i + 1)
    if (!groups[num]) groups[num] = { number: num, name: s.stage_name || '', items: [] }
    groups[num].items.push({
      id: s.id, type: s.stage_type, title: s.title || '',
      durationMinutes: [5,10,15].includes(s.duration_minutes) ? s.duration_minutes
                       : s.duration_minutes ? 'other' : null,
      customDuration: ![5,10,15].includes(s.duration_minutes) && s.duration_minutes
                      ? String(s.duration_minutes) : '',
      exerciseId: s.exercise_id || null, exerciseTitle: s.exercises?.title || '',
      contentText: s.content_text || '', audioUrl: s.audio_url || '',
      contentImages: s.content_images || [], teacherNotes: s.teacher_notes || '',
    })
  })
  return Object.values(groups).sort((a, b) => a.number - b.number)
}

export function newQ(type) {
  return {
    tempId:         crypto.randomUUID(),
    type,
    prompt:         '',
    options:        type === 'multiple_choice' ? ['', '', '', '']
                  : type === 'true_false'      ? ['True', 'False']
                  : type === 'matching'        ? { v: 2, left: Array(5).fill(''), right: Array(5).fill('') }
                  : null,
    correct_answer: type === 'true_false' ? 'True' : '',
    hint:           '',
  }
}

export function ExerciseBuilder({ onSaved, onCancel, initialExercise = null, allLabels = [], allBooks = [], onLabelCreated = null, onBookCreated = null, initialStageType = null, cancelLabel = 'Cancel' }) {
  const isEdit = !!initialExercise

  const [stageType,      setStageType]      = useState(initialExercise?.stage_type ?? initialStageType ?? null)
  const [title,          setTitle]          = useState(initialExercise?.title        ?? '')
  const [description,    setDescription]    = useState(initialExercise?.description  ?? '')
  const [selType,        setSelType]        = useState(initialExercise?.questions?.[0]?.type ?? null)
  const [contextImages,  setContextImages]  = useState(initialExercise?.context_images ?? [])
  const [contextText,    setContextText]    = useState(initialExercise?.context_text  ?? '')
  const [audioUrl,       setAudioUrl]       = useState(initialExercise?.audio_url     ?? '')
  const [estimatedMins,  setEstimatedMins]  = useState(initialExercise?.estimated_minutes ?? null)
  const [customMins,     setCustomMins]     = useState(
    initialExercise?.estimated_minutes && ![5,10,15].includes(initialExercise.estimated_minutes)
      ? String(initialExercise.estimated_minutes) : ''
  )
  const [bookId,         setBookId]         = useState(initialExercise?.book_id     ?? null)
  const [exUnit,         setExUnit]         = useState(initialExercise?.unit        ?? null)
  const [exPage,         setExPage]         = useState(initialExercise?.page        ?? null)
  const [exSection,      setExSection]      = useState(initialExercise?.section     ?? '')
  const [exNo,           setExNo]           = useState(initialExercise?.exercise_no ?? null)
  const [exLevel,        setExLevel]        = useState(initialExercise?.level       ?? null)
  const [thumbnail,      setThumbnail]      = useState(initialExercise?.thumbnail   ?? null)
  const [thumbLoading,   setThumbLoading]   = useState(false)
  const [localBooks,     setLocalBooks]     = useState(allBooks)
  const [newBookTitle,   setNewBookTitle]   = useState('')
  const [savingBook,     setSavingBook]     = useState(false)
  const [showBookForm,   setShowBookForm]   = useState(false)
  const [labelIds,       setLabelIds]       = useState(
    (initialExercise?.exercise_labels || []).map(el => el.label_id)
  )
  const [localLabels,    setLocalLabels]    = useState(allLabels)
  const [newLabelName,   setNewLabelName]   = useState('')
  const [newLabelColor,  setNewLabelColor]  = useState('#d4a853')
  const [savingLabel,    setSavingLabel]    = useState(false)
  const [showLabelForm,  setShowLabelForm]  = useState(false)
  const [questions,      setQuestions]      = useState(
    (initialExercise?.questions ?? []).map(q => ({ ...q, tempId: crypto.randomUUID() }))
  )
  const [saving,         setSaving]         = useState(false)
  const [saveError,      setSaveError]      = useState(null)
  // Matching: whether the interactive drag-and-drop pairs are enabled.
  // Off = context-material-only matching exercise (no pairs required).
  const [matchingDnd,    setMatchingDnd]    = useState(true)
  // Speaking: whether the (optional) written questions section is shown.
  // Off = pure verbal speaking activity, no written questions.
  const [speakingQuestions, setSpeakingQuestions] = useState(
    () => (initialExercise?.questions || []).some(q => q.type === 'speaking' && (q.prompt || '').trim().length > 0)
  )
  const [photoLoading,   setPhotoLoading]   = useState(false)
  const [photoError,     setPhotoError]     = useState(null)
  // OCR review state: null = not in review, string = raw text to review
  const [ocrDraft,       setOcrDraft]       = useState(null)
  // fill_blank picture upload state
  const [fbPicLoading,   setFbPicLoading]   = useState(false)
  const [fbPicError,        setFbPicError]        = useState(null)
  // fill_blank word-bank state
  const [newWordInput,   setNewWordInput]   = useState('')
  const [wordOcrLoading, setWordOcrLoading] = useState(false)
  // Annotation modes per context image [{circles, lines}]
  const [contextImageModes, setContextImageModes] = useState(
    Array.isArray(initialExercise?.context_image_settings)
      ? initialExercise.context_image_settings : []
  )
  // Annotation picker state — shown after upload
  const [annPickerOpen,    setAnnPickerOpen]    = useState(false)
  const [annPickerStart,   setAnnPickerStart]   = useState(0)
  const [annPickerLen,     setAnnPickerLen]     = useState(0)
  const [annPickerCircles, setAnnPickerCircles] = useState(true)
  const [annPickerLines,   setAnnPickerLines]   = useState(true)
  const contextFileRef  = useRef(null)
  const exerciseFileRef = useRef(null)
  const fbPicFileRef    = useRef(null)
  const wordOcrFileRef  = useRef(null)
  const thumbnailRef    = useRef(null)

  // ── Context images ──────────────────────────────────────────
  const handleContextImages = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 10 - contextImages.length)
    if (!files.length) return
    const compressed = await Promise.all(files.map(f => compressImage(f)))
    setContextImages(prev => {
      const batchStart = prev.length
      setAnnPickerStart(batchStart)
      setAnnPickerLen(compressed.length)
      setAnnPickerCircles(true)
      setAnnPickerLines(true)
      setAnnPickerOpen(true)
      return [...prev, ...compressed].slice(0, 10)
    })
    e.target.value = ''
  }

  const confirmAnnPicker = () => {
    const mode = { circles: annPickerCircles, lines: annPickerLines }
    setContextImageModes(prev => {
      const updated = [...prev]
      for (let i = annPickerStart; i < annPickerStart + annPickerLen; i++) updated[i] = mode
      return updated
    })
    setAnnPickerOpen(false)
  }

  // ── Thumbnail: small compressed image for library card ───────
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    e.target.value = ''
    setThumbLoading(true)
    try {
      const compressed = await compressImage(file, 400)
      setThumbnail(compressed)
    } catch {}
    finally { setThumbLoading(false) }
  }

  // ── Fill-blank: upload picture + auto-detect blank positions ─
  const handleFbPicUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    e.target.value = ''
    setFbPicLoading(true); setFbPicError(null)
    try {
      // 1. Compress + store image
      const compressed = await compressImage(file)
      setContextImages([compressed])
      // 2. Detect blank bounding boxes
      const blanks = await detectImageBlanks(compressed)
      // 3. Store as overlay prompt (even if 0 blanks — Dogukan can tap to add).
      //    Preserve any existing mode + word bank.
      setQuestions(prev => {
        const q = prev[0] ?? newQ('fill_blank')
        const cur = parseOverlayPrompt(q.prompt) || {}
        const merged = {
          overlay: true, blanks,
          mode:  cur.mode === 'wordbank' ? 'wordbank' : 'type',
          words: Array.isArray(cur.words) ? cur.words : [],
        }
        return [{ ...q, type: 'fill_blank', prompt: JSON.stringify(merged), correct_answer: '' }]
      })
    } catch (err) {
      setFbPicError(err.message ?? 'Failed to read the picture. Please try again.')
    } finally {
      setFbPicLoading(false)
    }
  }

  // ── Fill-blank word bank (mode 2) ───────────────────────────
  // Patch the overlay prompt on questions[0], preserving the other fields.
  const patchFbOverlay = (patch) => setQuestions(prev => {
    const q = prev[0] ?? newQ('fill_blank')
    const cur = parseOverlayPrompt(q.prompt) || { overlay: true, blanks: [] }
    const next = { ...cur, overlay: true, ...patch }
    const rest = prev.slice(1)
    return [{ ...q, type: 'fill_blank', prompt: JSON.stringify(next) }, ...rest]
  })
  const setFbMode  = (mode)  => patchFbOverlay({ mode })
  const addFbWords = (list)  => setQuestions(prev => {
    const q = prev[0] ?? newQ('fill_blank')
    const cur = parseOverlayPrompt(q.prompt) || { overlay: true, blanks: [] }
    const words = [...(Array.isArray(cur.words) ? cur.words : []), ...list]
    return [{ ...q, type: 'fill_blank', prompt: JSON.stringify({ ...cur, overlay: true, mode: 'wordbank', words }) }, ...prev.slice(1)]
  })
  const removeFbWord = (idx) => setQuestions(prev => {
    const q = prev[0]; if (!q) return prev
    const cur = parseOverlayPrompt(q.prompt) || { overlay: true, blanks: [] }
    const words = (Array.isArray(cur.words) ? cur.words : []).filter((_, i) => i !== idx)
    return [{ ...q, prompt: JSON.stringify({ ...cur, overlay: true, words }) }, ...prev.slice(1)]
  })

  // OCR a picture → extract candidate words → add to the bank
  const handleWordOcr = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    e.target.value = ''
    setWordOcrLoading(true); setFbPicError(null)
    try {
      const raw = await ocrImage(file)
      const detected = raw.split(/\s+/)
        .map(w => w.replace(/[^\p{L}\p{N}'’-]/gu, '').trim())
        .filter(w => w.length > 1)
      if (!detected.length) { setFbPicError('No words detected — try a clearer photo of the word list.'); return }
      addFbWords(detected)
    } catch (err) {
      setFbPicError(err.message ?? 'Failed to read the picture.')
    } finally {
      setWordOcrLoading(false)
    }
  }

  // ── Exercise type ───────────────────────────────────────────
  const selectType = (type) => {
    setSelType(type)
    if (!questions.length) {
      setQuestions([newQ(type)])
    } else {
      // Convert all existing questions to the new type, keeping prompts + hints
      setQuestions(prev => prev.map(q => ({
        ...newQ(type),
        tempId: q.tempId,   // preserve React key
        prompt: q.prompt,   // preserve question text
        hint:   q.hint,     // preserve hint text
      })))
    }
  }

  // ── OCR photo → show raw text for review ───────────────────
  const handleExercisePhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    if (!selType) { setPhotoError('Please select an exercise type first, then upload the photo.'); e.target.value = ''; return }
    setPhotoLoading(true); setPhotoError(null)
    try {
      const rawText = await ocrImage(file)
      if (!rawText.trim()) throw new Error('Could not read any text. Try a clearer, well-lit photo.')
      // Pre-clean: remove leading/trailing blank lines
      setOcrDraft(rawText.trim())
    } catch (err) { setPhotoError(err.message) }
    finally { setPhotoLoading(false); e.target.value = '' }
  }

  // ── Convert reviewed OCR text → question cards ─────────────
  const applyOcrDraft = () => {
    if (!ocrDraft?.trim() || !selType) return
    const lines = ocrDraft
      .split('\n')
      .map(l => l.replace(/^\s*\d+[.)]\s*/, '').trim())  // strip "1. " "2) " etc.
      .filter(l => l.length > 2)
    if (!lines.length) return
    setQuestions(lines.map(line => {
      const q = newQ(selType)
      q.prompt = line.replace(/_{1,}/g, '___')
      return q
    }))
    setOcrDraft(null)
  }

  // ── Questions ───────────────────────────────────────────────
  const addQ    = ()             => setQuestions(p => [...p, newQ(selType)])
  const removeQ = (id)           => setQuestions(p => p.filter(q => q.tempId !== id))
  const updateQ = (id, fld, val) => setQuestions(p => p.map(q => q.tempId === id ? { ...q, [fld]: val } : q))

  // ── Label helpers ────────────────────────────────────────────
  const handleCreateBook = async () => {
    if (!newBookTitle.trim()) return
    setSavingBook(true)
    const bk = await createBook(newBookTitle.trim())
    setSavingBook(false)
    if (bk) {
      setLocalBooks(p => [...p, bk].sort((a, b) => a.title.localeCompare(b.title)))
      setBookId(bk.id)
      setNewBookTitle(''); setShowBookForm(false)
      onBookCreated?.(bk)
    }
  }

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return
    setSavingLabel(true)
    const label = await createLabel(newLabelName.trim(), newLabelColor)
    setSavingLabel(false)
    if (label) {
      setLocalLabels(p => [...p, label])
      setLabelIds(p => [...p, label.id])
      setNewLabelName(''); setShowLabelForm(false)
      onLabelCreated?.(label)
    }
  }
  const toggleLabel = (id) => setLabelIds(p =>
    p.includes(id) ? p.filter(x => x !== id) : [...p, id]
  )

  // ── Save ────────────────────────────────────────────────────
  const handleSave = async () => {
    const stDef = STAGE_TYPES.find(t => t.value === stageType)
    const isVerbal = selType === 'listening' || selType === 'viewing' || selType === 'speaking'
    if (!title.trim()) return
    if (!exLevel) { setSaveError('Please select a course for this exercise.'); return }
    const _courses = getAdminCourses()
    if (!_courses.find(c => c.name === exLevel)) { setSaveError('The selected course was deleted. Please choose a valid course.'); return }
    const noDnd = selType === 'matching' && !matchingDnd
    if (stDef?.hasQuestions && !selType) return
    if (stDef?.hasQuestions && !isVerbal && !noDnd && !questions.length) return
    // Location fields are required for exercise stages
    if (stDef?.hasQuestions && !isVerbal && !noDnd && (!exUnit || !exPage || !exSection.trim() || !exNo)) {
      setSaveError('Please fill in the location fields (unit, page, section, exercise number) — these are required for exercises.')
      return
    }
    setSaving(true); setSaveError(null)
    const finalMins = estimatedMins === 'other' ? (parseInt(customMins) || null) : estimatedMins
    const meta = {
      title, description, contextImages, contextText, audioUrl,
      estimatedMinutes: finalMins,
      stageType: stageType ?? 'controlled_exercise',
      bookId:    bookId   || null,
      unit:      exUnit   || null,
      page:      exPage   || null,
      section:   exSection.trim() || null,
      exerciseNo: exNo    || null,
      thumbnail: thumbnail || null,
      level:     exLevel  || null,
      contextImageSettings: contextImageModes.length ? contextImageModes : null,
    }
    // Pure-verbal activities (listening, viewing, or speaking with questions OFF):
    // save one dummy question as the activity-type marker.
    // Matching with drag-and-drop OFF: save no questions (context-material only).
    const speakingNoQuestions = selType === 'speaking' && !speakingQuestions
    const pureVerbal = selType === 'listening' || selType === 'viewing' || speakingNoQuestions
    const questionsToSave = pureVerbal
      ? [{ type: selType, prompt: '', order_index: 0, options: [], correct_answer: null, hint: null }]
      : noDnd
        ? []
        : questions
    const result = isEdit
      ? await updateExerciseWithQuestions(initialExercise.id, meta, questionsToSave)
      : await createExerciseWithQuestions(meta, questionsToSave)
    // result is either an exerciseId string, or {exerciseId, dbError} if questions failed, or null
    const id = typeof result === 'string' ? result : (result?.exerciseId ?? null)
    const dbErr = typeof result === 'object' && result !== null ? result.dbError : null
    if (id && !dbErr) {
      await setExerciseLabels(id, labelIds)
      setSaving(false)
      onSaved(id)
    } else {
      setSaving(false)
      setSaveError(dbErr
        ? `DB error saving questions: ${dbErr} — you may need to update the "questions" table type constraint in Supabase.`
        : 'Something went wrong saving. Check your connection and try again.')
    }
  }

  // ── Stage type picker (shown before builder when no type chosen) ─
  if (!stageType) {
    return (
      <div>
        <div className="admin-exercises-toolbar">
          <h3 style={{ margin: 0 }}>Create Lesson Stage</h3>
          <button className="btn-ghost" onClick={onCancel}>{cancelLabel}</button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: '0.5rem 0 0.25rem' }}>
          What type of lesson stage are you creating?
        </p>
        <div className="stage-type-picker">
          {STAGE_TYPES.map(t => (
            <button key={t.value} className="stage-type-card" onClick={() => setStageType(t.value)}>
              <div className="stc-icon">{t.icon}</div>
              <div className="stc-label">{t.label}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const stageTypeDef = STAGE_TYPES.find(t => t.value === stageType) || {}
  // Matching exercise with drag-and-drop turned off → no questions required
  const matchingNoDnd = selType === 'matching' && !matchingDnd
  // Speaking exercise with the questions section turned off → pure verbal
  const speakingNoQ = selType === 'speaking' && !speakingQuestions

  return (
    <div>
      <div className="admin-exercises-toolbar">
        <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Lesson Stage' : 'Create Lesson Stage'}</h3>
        <button className="btn-ghost" onClick={onCancel}>{cancelLabel}</button>
      </div>

      {/* ── Stage type badge ── */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="stage-type-badge-sm">{stageTypeDef.icon} {stageTypeDef.label}</span>
        <button type="button" style={{ fontSize: '0.78rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
          onClick={() => setStageType(null)}>Change</button>
      </div>

      {/* ── Course (mandatory, shown first) ── */}
      <div className="builder-section">
        <h4 className="builder-section-title">📚 Course <span className="required-star">*</span></h4>
        {(() => {
          const adminCourses = getAdminCourses()
          const courseExists = adminCourses.find(c => c.name === exLevel)
          return (
            <>
              {adminCourses.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  No courses yet — create one in the 🎓 Courses tab first.
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  {adminCourses.map(c => {
                    const active = exLevel === c.name
                    return (
                      <button key={c.id} type="button"
                        onClick={() => setExLevel(active ? null : c.name)}
                        style={{
                          fontSize: '0.85rem', padding: '0.45rem 0.95rem', borderRadius: '8px',
                          cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                          border: `1.5px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                          background: active ? 'var(--gold)' : '#fff',
                          color: active ? '#fff' : 'var(--text)',
                          transition: 'all 0.12s',
                        }}>
                        {c.name}
                      </button>
                    )
                  })}
                </div>
              )}
              {!exLevel && adminCourses.length > 0 && (
                <p style={{ fontSize: '0.78rem', color: '#e05c5c', marginTop: '0.4rem' }}>
                  Please choose a course (required).
                </p>
              )}
              {exLevel && !courseExists && (
                <p style={{ fontSize: '0.8rem', color: '#e05c5c', marginTop: '0.35rem' }}>
                  The course "{exLevel}" was deleted. Please select a new course before saving.
                </p>
              )}
            </>
          )
        })()}
      </div>

      {/* ── 1. Exercise type (for exercise stages) ── */}
      {(!stageType || stageTypeDef.hasQuestions) && (
        <div className="builder-section">
          <h4 className="builder-section-title">✏️ Exercise type</h4>
          <div className="builder-type-pills">
            {BUILDER_TYPES.map(t => (
              <button key={t.value}
                className={`builder-type-pill ${selType === t.value ? 'active' : ''}`}
                onClick={() => selectType(t.value)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. Estimated time (admin-only) ── */}
      {(stageTypeDef.hasQuestions ? selType : true) && (
        <div className="builder-section">
          <h4 className="builder-section-title">⏱ Estimated time <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 400 }}>(only you can see this)</span></h4>
          <div className="builder-time-pills">
            {[5, 10, 15].map(m => (
              <button key={m} type="button"
                className={`builder-type-pill ${estimatedMins === m ? 'active' : ''}`}
                onClick={() => { setEstimatedMins(estimatedMins === m ? null : m); setCustomMins('') }}>
                {m} min
              </button>
            ))}
            <button type="button"
              className={`builder-type-pill ${estimatedMins === 'other' ? 'active' : ''}`}
              onClick={() => setEstimatedMins(estimatedMins === 'other' ? null : 'other')}>
              Other
            </button>
          </div>
          {estimatedMins === 'other' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input type="number" min="1" max="120" style={{ width: '6rem' }}
                placeholder="e.g. 20" value={customMins}
                onChange={e => setCustomMins(e.target.value)} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>minutes</span>
            </div>
          )}
        </div>
      )}

      {/* ── 3. Book ── */}
      <div className="builder-section">
        <div className="builder-section-header">
          <div>
            <h4 className="builder-section-title">📚 Book</h4>
            <p className="builder-section-sub">Which textbook is this stage from? (optional)</p>
          </div>
          <button type="button" className="btn-ghost"
            style={{ fontSize: '0.78rem', padding: '0.28rem 0.65rem', flexShrink: 0 }}
            onClick={() => setShowBookForm(p => !p)}>
            {showBookForm ? 'Cancel' : '+ New book'}
          </button>
        </div>

        {showBookForm && (
          <div style={{ display: 'flex', gap: '0.5rem', margin: '0.5rem 0' }}>
            <input type="text" placeholder="e.g. English File B1"
              value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateBook()}
              style={{ flex: 1 }} />
            <button className="btn-gold" style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}
              disabled={savingBook || !newBookTitle.trim()} onClick={handleCreateBook}>
              {savingBook ? '…' : 'Create'}
            </button>
          </div>
        )}

        <select value={bookId || ''}
          onChange={e => setBookId(e.target.value || null)}
          style={{ marginTop: showBookForm ? 0 : '0.25rem' }}>
          <option value="">— No book selected —</option>
          {localBooks.map(bk => (
            <option key={bk.id} value={bk.id}>{bk.title}</option>
          ))}
        </select>
      </div>

      {/* ── Location in textbook ── */}
      <div className="builder-section">
        <h4 className="builder-section-title">
          📍 Location in textbook
          {stageTypeDef.hasQuestions
            ? <span className="builder-required-note"> — required for exercises</span>
            : <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 400 }}> (optional)</span>}
        </h4>
        <div className="location-fields">
          <div className="location-field">
            <label>Unit {stageTypeDef.hasQuestions && <span className="required-star">*</span>}</label>
            <input type="number" min="1" placeholder="e.g. 3"
              value={exUnit ?? ''}
              onChange={e => setExUnit(e.target.value ? parseInt(e.target.value) : null)} />
          </div>
          <div className="location-field">
            <label>Page {stageTypeDef.hasQuestions && <span className="required-star">*</span>}</label>
            <input type="number" min="1" placeholder="e.g. 42"
              value={exPage ?? ''}
              onChange={e => setExPage(e.target.value ? parseInt(e.target.value) : null)} />
          </div>
          <div className="location-field">
            <label>Section {stageTypeDef.hasQuestions && <span className="required-star">*</span>}</label>
            <input type="text" placeholder="e.g. Grammar"
              value={exSection}
              onChange={e => setExSection(e.target.value)} />
          </div>
          <div className="location-field">
            <label>Exercise No. {stageTypeDef.hasQuestions && <span className="required-star">*</span>}</label>
            <input type="number" min="1" placeholder="e.g. 2"
              value={exNo ?? ''}
              onChange={e => setExNo(e.target.value ? parseInt(e.target.value) : null)} />
          </div>
        </div>

        {/* Thumbnail */}
        <div style={{ marginTop: '1rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>
            📸 Thumbnail <span style={{ fontWeight: 400 }}>(optional — a photo snippet shown on the library card)</span>
          </label>
          <input ref={thumbnailRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={handleThumbnailUpload} />
          {thumbnail ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src={thumbnail} alt="Thumbnail"
                style={{ width: '88px', height: '62px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <button type="button" className="btn-ghost"
                  style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem' }}
                  disabled={thumbLoading}
                  onClick={() => thumbnailRef.current?.click()}>
                  {thumbLoading ? '⏳…' : '🔄 Replace'}
                </button>
                <button type="button" className="btn-ghost"
                  style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', color: 'var(--text-muted)' }}
                  onClick={() => setThumbnail(null)}>
                  ✕ Remove
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn-ghost"
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
              disabled={thumbLoading}
              onClick={() => thumbnailRef.current?.click()}>
              {thumbLoading ? '⏳ Uploading…' : '+ Upload thumbnail'}
            </button>
          )}
        </div>
      </div>

      {/* ── 4. Labels ── */}
      <div className="builder-section">
        <div className="builder-section-header">
          <div>
            <h4 className="builder-section-title">🏷 Labels</h4>
            <p className="builder-section-sub">Tag this exercise so you can filter later (e.g. Elementary, Jason – Week 3).</p>
          </div>
          <button type="button" className="btn-ghost"
            style={{ fontSize: '0.78rem', padding: '0.28rem 0.65rem', flexShrink: 0 }}
            onClick={() => setShowLabelForm(p => !p)}>
            {showLabelForm ? 'Cancel' : '+ New label'}
          </button>
        </div>

        {showLabelForm && (
          <div className="builder-label-form">
            <input type="text" placeholder="Label name (e.g. Elementary)"
              value={newLabelName} onChange={e => setNewLabelName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateLabel()} />
            <div className="builder-color-swatches">
              {LABEL_COLORS.map(c => (
                <button key={c.value} type="button"
                  title={c.label}
                  className={`builder-color-swatch ${newLabelColor === c.value ? 'active' : ''}`}
                  style={{ '--swatch-color': c.value }}
                  onClick={() => setNewLabelColor(c.value)} />
              ))}
            </div>
            <button className="btn-gold" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
              disabled={savingLabel || !newLabelName.trim()} onClick={handleCreateLabel}>
              {savingLabel ? 'Creating…' : 'Create label'}
            </button>
          </div>
        )}

        {localLabels.length > 0 && (
          <div className="builder-label-chips">
            {localLabels.map(lbl => (
              <button key={lbl.id} type="button"
                className={`label-chip ${labelIds.includes(lbl.id) ? 'label-chip--selected' : ''}`}
                style={{ '--lbl-color': lbl.color }}
                onClick={() => toggleLabel(lbl.id)}>
                {lbl.name}
              </button>
            ))}
          </div>
        )}
        {localLabels.length === 0 && !showLabelForm && (
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            No labels yet — create one to start organising.
          </p>
        )}
      </div>

      {/* ── 4. Title + instruction ── */}
      <div className="admin-assign-form" style={{ marginBottom: '1.25rem' }}>
        <div className="form-field">
          <label>Title *</label>
          <input type="text" placeholder="e.g. Jason's Family — Verbs: have / go / live / like"
            value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Instruction <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(shown to student)</span></label>
          <input type="text" placeholder="e.g. Complete the sentences about Jason."
            value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>

      {/* ── 5. Context material (hidden for fill_blank — image is managed in the template section) ── */}
      {selType !== 'fill_blank' && <div className="builder-section">
        <div className="builder-section-header">
          <div>
            <h4 className="builder-section-title">📖 Context material</h4>
            <p className="builder-section-sub">Reading text, vocab list or images from the book — your student sees these above the exercise</p>
          </div>
          {contextImages.length < 10 && (
            <button className="builder-upload-btn"
              onClick={() => contextFileRef.current?.click()}>
              + Upload photo {contextImages.length > 0 ? `(${contextImages.length}/10)` : '(up to 10)'}
            </button>
          )}
        </div>
        <input ref={contextFileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={handleContextImages} />
        {contextImages.length > 0 && (
          <div className="builder-thumbs">
            {contextImages.map((src, i) => (
              <div key={i} className="builder-thumb">
                <img src={src} alt={`Context ${i + 1}`} />
                <button className="builder-thumb-remove"
                  onClick={() => {
                    setContextImages(p => p.filter((_, j) => j !== i))
                    setContextImageModes(p => p.filter((_, j) => j !== i))
                  }}>✕</button>
              </div>
            ))}
          </div>
        )}
        {/* ── Annotation picker (shown after upload) ── */}
        {annPickerOpen && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px',
            border: '1.5px solid #2563eb', background: '#eff6ff', display: 'flex',
            flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e40af', flexShrink: 0 }}>
              🎨 Annotation tools for {annPickerLen === 1 ? 'this image' : `these ${annPickerLen} images`}:
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', cursor: 'pointer', color: '#1e3a8a' }}>
              <input type="checkbox" checked={annPickerCircles} onChange={e => setAnnPickerCircles(e.target.checked)} />
              ⭕ Draw circles
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', cursor: 'pointer', color: '#1e3a8a' }}>
              <input type="checkbox" checked={annPickerLines} onChange={e => setAnnPickerLines(e.target.checked)} />
              🏹 Draw arrow lines
            </label>
            <button type="button" onClick={confirmAnnPicker}
              style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '0.28rem 0.75rem',
                borderRadius: '6px', border: '1.5px solid #2563eb', background: '#2563eb',
                color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              Confirm
            </button>
          </div>
        )}
        <div className="form-field" style={{ marginTop: '1rem' }}>
          <label>🎧 Audio / video link <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — YouTube, SoundCloud, etc.)</span></label>
          <input type="url" placeholder="https://youtube.com/…"
            value={audioUrl} onChange={e => setAudioUrl(e.target.value)} />
          <p className="builder-section-sub" style={{ marginTop: '0.25rem' }}>
            Students see a "Listen first" link above the exercise.
          </p>
        </div>
        <div className="form-field" style={{ marginTop: '0.75rem' }}>
          <label>📖 Reading text <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — shown above exercise)</span></label>
          <RichTextEditor
            value={contextText} onChange={v => setContextText(v)}
            placeholder="Paste or type a reading passage here. Students read it before answering the questions."
            minHeight="110px" />
        </div>
      </div>}
      {/* fill_blank audio link (shown separately since context material section is hidden) */}
      {selType === 'fill_blank' && (
        <div className="builder-section">
          <div className="form-field">
            <label>🎧 Audio / video link <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input type="url" placeholder="https://youtube.com/…"
              value={audioUrl} onChange={e => setAudioUrl(e.target.value)} />
          </div>
        </div>
      )}

      {/* ── 6. Verbal activity note or Questions ── */}
      {(!stageType || stageTypeDef.hasQuestions) && (
        <>
          {(selType === 'listening' || selType === 'viewing') && (
            <div className="builder-section">
              <div className="verbal-activity-note" style={{ margin: 0 }}>
                {selType === 'listening' ? '🎧' : '🎥'}
                <span>
                  {selType === 'listening'
                    ? 'Students will listen and discuss verbally with you. No written answers required — just add the audio link and any instructions above.'
                    : 'Students will watch and discuss verbally with you. No written answers required — just add the video link and any instructions above.'}
                </span>
              </div>
            </div>
          )}

          {selType && selType !== 'listening' && selType !== 'viewing' && (
            <div className="builder-section">
              {selType === 'fill_blank' ? (
                /* ── Fill-in-the-blank: upload picture → auto-extract blanks ── */
                (() => {
                  const overlay = parseOverlayPrompt(questions[0]?.prompt) || { overlay: true, blanks: [] }
                  const fbMode  = overlay.mode === 'wordbank' ? 'wordbank' : 'type'
                  const blanks  = overlay.blanks ?? []
                  const words   = Array.isArray(overlay.words) ? overlay.words : []
                  const updateBlanks = (next) => {
                    const cur = parseOverlayPrompt(questions[0].prompt) || { overlay: true, blanks: [] }
                    updateQ(questions[0].tempId, 'prompt', JSON.stringify({ ...cur, overlay: true, blanks: next }))
                  }
                  const addWordsFromInput = () => {
                    const parts = newWordInput.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
                    if (parts.length) addFbWords(parts)
                    setNewWordInput('')
                  }
                  return (
                  <>
                  {/* Mode selector — the two ways to fill the blanks */}
                  <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.7rem 0.85rem', marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>How do students fill the blanks?</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button type="button"
                        className={`radio-option ${fbMode === 'type' ? 'selected' : ''}`}
                        style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}
                        onClick={() => setFbMode('type')}>
                        ✍️ Type the answers
                      </button>
                      <button type="button"
                        className={`radio-option ${fbMode === 'wordbank' ? 'selected' : ''}`}
                        style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}
                        onClick={() => setFbMode('wordbank')}>
                        🧩 Drag words from a bank
                      </button>
                    </div>
                  </div>

                  {/* Word bank editor (mode 2 only) — shown above the picture */}
                  {fbMode === 'wordbank' && (
                    <div className="fb-preview-section" style={{ marginBottom: '0.85rem' }}>
                      <div className="fb-preview-header">
                        <span className="fb-preview-label">🧩 Word bank ({words.length})</span>
                      </div>
                      <p className="builder-section-sub" style={{ marginTop: 0 }}>
                        Add the words students will drag into the blanks. Each word is used once.
                      </p>
                      {words.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.65rem' }}>
                          {words.map((w, i) => {
                            const c = WORD_PILL_COLORS[i % WORD_PILL_COLORS.length]
                            return (
                              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: c.bg, color: c.text, border: `1.5px solid ${c.border}`, borderRadius: '20px', padding: '0.25rem 0.7rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                {w}
                                <button type="button" onClick={() => removeFbWord(i)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, opacity: 0.7, fontSize: '0.85rem', lineHeight: 1, padding: 0 }}>✕</button>
                              </span>
                            )
                          })}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={newWordInput}
                          onChange={e => setNewWordInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWordsFromInput() } }}
                          placeholder="Type a word (or several, comma-separated)…"
                          style={{ flex: 1, minWidth: '200px', fontSize: '0.85rem', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)' }} />
                        <button type="button" className="btn-ghost" style={{ fontSize: '0.82rem' }}
                          onClick={addWordsFromInput} disabled={!newWordInput.trim()}>+ Add</button>
                        <input ref={wordOcrFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleWordOcr} />
                        <button type="button" className="btn-ghost" style={{ fontSize: '0.82rem' }}
                          disabled={wordOcrLoading}
                          onClick={() => wordOcrFileRef.current?.click()}>
                          {wordOcrLoading ? '⏳ Reading…' : '📸 Detect words from a picture'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="fb-upload-area">
                    <input ref={fbPicFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={handleFbPicUpload} />

                    {contextImages.length === 0 ? (
                      <button
                        type="button"
                        className="fb-upload-cta"
                        disabled={fbPicLoading}
                        onClick={() => fbPicFileRef.current?.click()}>
                        {fbPicLoading
                          ? <><span className="fb-spinner">⏳</span> Reading picture…</>
                          : <><span style={{ fontSize: '2rem' }}>📸</span><br />Upload exercise picture<br /><small>Blanks are detected automatically</small></>
                        }
                      </button>
                    ) : (
                      <div className="fb-pic-row">
                        <img src={contextImages[0]} alt="Exercise" className="fb-pic-thumb" />
                        <div className="fb-pic-actions">
                          <button type="button" className="btn-ghost"
                            style={{ fontSize: '0.82rem' }}
                            disabled={fbPicLoading}
                            onClick={() => fbPicFileRef.current?.click()}>
                            {fbPicLoading ? '⏳ Reading…' : '🔄 Replace picture'}
                          </button>
                          <button type="button" className="btn-ghost"
                            style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}
                            onClick={() => { setContextImages([]); setQuestions([newQ('fill_blank')]) }}>
                            ✕ Remove
                          </button>
                        </div>
                      </div>
                    )}

                    {fbPicError && <div className="auth-error" style={{ marginTop: '0.5rem' }}>{fbPicError}</div>}
                  </div>

                  {/* Preview: image with detected blanks + tap-to-add tool */}
                  {contextImages[0] && questions[0] && (
                      <div className="fb-preview-section">
                        <div className="fb-preview-header">
                          <span className="fb-preview-label">
                            {blanks.length > 0
                              ? `✅ ${blanks.length} blank${blanks.length !== 1 ? 's' : ''} detected — students will ${fbMode === 'wordbank' ? 'drag words into these gaps' : 'type directly on the image'}`
                              : '⚠️ No blanks detected automatically — tap on the image below to add blank boxes'}
                          </span>
                          {blanks.length > 0 && (
                            <button type="button" className="btn-ghost"
                              style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                              onClick={() => updateBlanks([])}>
                              Clear all blanks
                            </button>
                          )}
                        </div>

                        <FbBlankEditor
                          src={contextImages[0]}
                          blanks={blanks}
                          onChange={updateBlanks}
                        />

                        <p className="builder-section-sub" style={{ marginTop: '0.5rem' }}>
                          💡 Click and drag on the image to add a blank. Click an existing blank to remove it.
                        </p>
                      </div>
                  )}
                  </>
                  )
                })()
              ) : (
                /* ── All other types: numbered question cards ── */
                <>
                  {/* Matching: optional drag-and-drop toggle */}
                  {selType === 'matching' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', background: 'var(--bg-darker)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.7rem 0.85rem', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>🔀 Interactive drag-and-drop pairs</span>
                      <div style={{ display: 'flex', gap: '0.35rem', marginLeft: 'auto' }}>
                        <button type="button"
                          className={`radio-option ${matchingDnd ? 'selected' : ''}`}
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.85rem' }}
                          onClick={() => { setMatchingDnd(true); if (!questions.length) setQuestions([newQ('matching')]) }}>
                          On
                        </button>
                        <button type="button"
                          className={`radio-option ${!matchingDnd ? 'selected' : ''}`}
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.85rem' }}
                          onClick={() => setMatchingDnd(false)}>
                          Off
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Speaking: optional written-questions toggle */}
                  {selType === 'speaking' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', background: 'var(--bg-darker)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.7rem 0.85rem', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>❓ Written questions</span>
                      <div style={{ display: 'flex', gap: '0.35rem', marginLeft: 'auto' }}>
                        <button type="button"
                          className={`radio-option ${speakingQuestions ? 'selected' : ''}`}
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.85rem' }}
                          onClick={() => { setSpeakingQuestions(true); if (!questions.length) setQuestions([newQ('speaking')]) }}>
                          On
                        </button>
                        <button type="button"
                          className={`radio-option ${!speakingQuestions ? 'selected' : ''}`}
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.85rem' }}
                          onClick={() => setSpeakingQuestions(false)}>
                          Off
                        </button>
                      </div>
                    </div>
                  )}

                  {matchingNoDnd ? (
                    <div className="builder-section-sub" style={{ background: '#f8f5ee', border: '1px dashed var(--border)', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                      Drag-and-drop is off. Students will just see the context material and any instructions you add in the
                      <strong> Description</strong> or <strong>Reading text</strong> above — no pairs to build.
                    </div>
                  ) : speakingNoQ ? (
                    <div className="builder-section-sub" style={{ background: '#f8f5ee', border: '1px dashed var(--border)', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                      Written questions are off. This is a verbal speaking activity — students discuss with you, no written
                      questions needed. Turn this on if you want to add prompts.
                    </div>
                  ) : (
                  <>
                  <div className="builder-section-header">
                    <h4 className="builder-section-title">❓ Questions</h4>
                    <button className="builder-ai-btn"
                      onClick={() => exerciseFileRef.current?.click()}
                      disabled={photoLoading}>
                      {photoLoading ? '⏳ Reading photo…' : '📸 Extract questions from photo'}
                    </button>
                  </div>
                  <input ref={exerciseFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={handleExercisePhoto} />
                  {photoError && <div className="auth-error" style={{ margin: '0.5rem 0 0.75rem' }}>{photoError}</div>}

                  {ocrDraft !== null && (
                    <div className="ocr-review-box">
                      <p className="ocr-review-label">
                        📝 OCR extracted the text below. <strong>Delete everything except the exercise questions</strong>, then click "Create questions".
                      </p>
                      <textarea
                        className="ocr-review-textarea"
                        rows={10}
                        value={ocrDraft}
                        onChange={e => setOcrDraft(e.target.value)}
                        spellCheck={false}
                      />
                      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.6rem' }}>
                        <button className="btn-gold" style={{ fontSize: '0.88rem', padding: '0.5rem 1rem' }}
                          onClick={applyOcrDraft} disabled={!ocrDraft.trim()}>
                          ✓ Create questions from this text
                        </button>
                        <button className="btn-ghost" style={{ fontSize: '0.88rem', padding: '0.5rem 1rem' }}
                          onClick={() => setOcrDraft(null)}>Discard</button>
                      </div>
                    </div>
                  )}

                  <div className="builder-questions">
                    {questions.map((q, idx) => (
                      <BuilderQuestion key={q.tempId} idx={idx} question={q}
                        onChange={(fld, val) => updateQ(q.tempId, fld, val)}
                        onRemove={() => removeQ(q.tempId)}
                        canRemove={questions.length > 1} />
                    ))}
                  </div>
                  <button className="builder-add-q-btn" onClick={addQ}>+ Add question</button>
                  </>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {saveError && <div className="auth-error" style={{ marginTop: '1rem' }}>{saveError}</div>}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button className="btn-gold" onClick={handleSave}
          disabled={saving || !title.trim() || (stageTypeDef.hasQuestions && (!selType || (selType !== 'listening' && selType !== 'viewing' && selType !== 'speaking' && !matchingNoDnd && !questions.length)))}>
          {saving
            ? 'Saving…'
            : isEdit
              ? (stageTypeDef.hasQuestions ? `Update stage (${(selType === 'listening' || selType === 'viewing' || selType === 'speaking') ? selType : questions.length + ' Q'})` : 'Update stage')
              : (stageTypeDef.hasQuestions
                  ? ((selType === 'listening' || selType === 'viewing' || selType === 'speaking')
                      ? `Save ${selType} stage`
                      : `Save stage (${questions.length} question${questions.length !== 1 ? 's' : ''})`)
                  : 'Save stage')}
        </button>
        <button className="btn-ghost" onClick={onCancel}>{cancelLabel}</button>
      </div>
    </div>
  )
}

// ─── BuilderQuestion ──────────────────────────────────────────
export function BuilderQuestion({ idx, question, onChange, onRemove, canRemove, flat = false }) {
  const { type, prompt, options, correct_answer, hint } = question

  // fill_blank: count blanks and parse stored correct answers
  const fbBlankCount = type === 'fill_blank' ? (prompt || '').split('___').length - 1 : 0
  const fbAnswers = (() => {
    if (type !== 'fill_blank') return []
    if (!correct_answer) return Array(Math.max(fbBlankCount, 1)).fill('')
    try {
      const p = JSON.parse(correct_answer)
      if (Array.isArray(p)) {
        const arr = [...p]
        while (arr.length < fbBlankCount) arr.push('')
        return arr
      }
    } catch {}
    // Legacy plain string → slot 0
    return [correct_answer, ...Array(Math.max(0, fbBlankCount - 1)).fill('')]
  })()
  const updateFbAnswer = (i, val) => {
    const next = fbBlankCount > 0
      ? Array.from({ length: fbBlankCount }, (_, j) => j === i ? val : (fbAnswers[j] || ''))
      : [val]
    onChange('correct_answer', JSON.stringify(next))
  }

  const matchLeftPhotoRef  = useRef(null)
  const matchRightPhotoRef = useRef(null)
  const [mOcrLoading, setMOcrLoading] = useState(null)
  const wcLineRefs = useRef([]) // refs for word-choice line inputs

  // Word-choice helpers
  const wcLines = type === 'word_choice' ? (prompt || '').split('\n') : []
  const wcUpdateLine = (idx, val) => {
    const next = [...wcLines]; next[idx] = val
    onChange('prompt', next.join('\n'))
  }
  const wcAddLine = () => onChange('prompt', (prompt ? prompt + '\n' : '') + '')
  const wcRemoveLine = (idx) => {
    const next = wcLines.filter((_, i) => i !== idx)
    onChange('prompt', next.join('\n'))
  }
  const wcInsert = (lineIdx, text) => {
    const input = wcLineRefs.current[lineIdx]
    const cur = wcLines[lineIdx] || ''
    const start = input ? input.selectionStart : cur.length
    const end   = input ? input.selectionEnd   : start
    const next  = cur.slice(0, start) + text + cur.slice(end)
    wcUpdateLine(lineIdx, next)
    requestAnimationFrame(() => {
      if (input) { input.selectionStart = input.selectionEnd = start + text.length; input.focus() }
    })
  }

  return (
    <div className={flat ? 'builder-flat-template' : 'builder-question-card'}>
      {!flat && (
        <div className="builder-q-header">
          <span className="eq-num">{idx + 1}</span>
          <span className="eq-type" style={{ flex: 1 }}>
            {type === 'multiple_choice' ? 'Multiple choice'
             : type === 'fill_blank'    ? 'Fill in the blank'
             : type === 'true_false'    ? 'True / False'
             : type === 'matching'      ? 'Matching'
             : type === 'word_choice'   ? 'Word choice'
             : 'Written answer'}
          </span>
          {canRemove && <button className="builder-q-remove" onClick={onRemove}>✕</button>}
        </div>
      )}

      {type !== 'word_choice' && type !== 'fill_blank' && (
        <div className="form-field">
          <label>
            {type === 'matching' ? 'Instruction (e.g. "Match the words to their meanings")'
             : 'Question'}
          </label>
          <input type="text"
            placeholder={
              type === 'multiple_choice' ? 'e.g. Which sentence is correct?'
              : type === 'true_false'    ? 'e.g. "Good morning" is used in the evening.'
              : 'e.g. Match the words to their definitions.'
            }
            value={prompt}
            onChange={e => onChange('prompt', e.target.value)}
          />
        </div>
      )}

      {type === 'fill_blank' && (
        <div className="form-field">
          <label>Conversation / sentence <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(use ___ for each blank)</span></label>
          <p className="builder-section-sub" style={{ marginBottom: '0.5rem' }}>
            Type the full text with <code>___</code> where each blank goes. Use new lines for multi-line dialogue.
          </p>
          <textarea className="writing-input"
            rows={Math.max(3, (prompt || '').split('\n').length + 1)}
            placeholder={"e.g. Hello. My ___ Cathy. What's ___ name?\nD: Dan.\nC: Where ___ you from?"}
            value={prompt || ''}
            onChange={e => onChange('prompt', e.target.value)}
          />
          {prompt && fbBlankCount > 0 && (
            <div className="fill-blank-preview">
              <span className="fill-blank-preview-label">Preview:</span>
              <InlineFillBlank prompt={prompt} answer={null} onChange={() => {}} disabled={true} />
            </div>
          )}
        </div>
      )}

      {type === 'word_choice' && (
        <div className="form-field">
          <label>Sentences</label>
          <p className="builder-section-sub" style={{ marginBottom: '0.75rem' }}>
            Each line is one sentence. Use <code>[word1/word2]</code> for a two-option choice and <code>[___]</code> for a fill-in blank.
          </p>

          {(wcLines.length === 0 ? [''] : wcLines).map((line, li) => (
            <div key={li} style={{ marginBottom: '0.65rem', background: 'var(--bg-darker)', borderRadius: '8px', padding: '0.6rem 0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: '16px' }}>{li + 1}.</span>
                <button type="button" className="btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => wcInsert(li, '[option1/option2]')}>
                  + Choice [A/B]
                </button>
                <button type="button" className="btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => wcInsert(li, '[___]')}>
                  + Blank [___]
                </button>
                {wcLines.length > 1 && (
                  <button type="button" className="btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: '#e05c5c', marginLeft: 'auto' }}
                    onClick={() => wcRemoveLine(li)}>
                    ✕ Remove
                  </button>
                )}
              </div>
              <input
                ref={el => { wcLineRefs.current[li] = el }}
                type="text"
                style={{ width: '100%', fontSize: '0.9rem' }}
                placeholder="e.g. Maria [is/isn't] a good teacher."
                value={line}
                onChange={e => wcUpdateLine(li, e.target.value)}
              />
            </div>
          ))}

          <button type="button" className="btn-ghost"
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem' }}
            onClick={wcAddLine}>
            + Add sentence
          </button>

          {prompt?.includes('[') && (
            <div style={{ marginTop: '0.85rem' }}>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Preview:
              </label>
              <div className="word-choice-preview">
                <WordChoiceQuestion template={prompt} answer={null} onChange={() => {}} />
              </div>
            </div>
          )}
        </div>
      )}

      {type === 'multiple_choice' && (
        <div className="form-field">
          <label>Options <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(click ○ to mark correct)</span></label>
          <div className="builder-mc-options">
            {(options || ['', '', '', '']).map((opt, i) => (
              <div key={i} className="builder-mc-row">
                <button type="button"
                  className={`builder-mc-correct-btn ${correct_answer === opt && opt ? 'active' : ''}`}
                  onClick={() => opt && onChange('correct_answer', opt)}>
                  {correct_answer === opt && opt ? '✓' : '○'}
                </button>
                <input type="text" placeholder={`Option ${i + 1}`} value={opt}
                  onChange={e => {
                    const nxt = [...(options || ['','','',''])]
                    nxt[i] = e.target.value
                    onChange('options', nxt)
                  }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {type === 'fill_blank' && fbBlankCount > 0 && (
        <div className="form-field">
          <label>Correct answer{fbBlankCount !== 1 ? 's' : ''} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({fbBlankCount} blank{fbBlankCount !== 1 ? 's' : ''})</span></label>
          {Array.from({ length: fbBlankCount }, (_, i) => (
            <div key={i} className="fill-blank-answer-row">
              <span className="fill-blank-num">Blank {i + 1}</span>
              <input type="text"
                placeholder={`Correct answer for blank ${i + 1}`}
                value={fbAnswers[i] || ''}
                onChange={e => updateFbAnswer(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {type === 'true_false' && (
        <div className="form-field">
          <label>Correct answer</label>
          <div className="radio-group" style={{ flexDirection: 'row', gap: '0.75rem' }}>
            {['True', 'False'].map(v => (
              <button key={v} type="button"
                className={`radio-option ${correct_answer === v ? 'selected' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => onChange('correct_answer', v)}>
                {v === 'True' ? '✓ True' : '✗ False'}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === 'matching' && (() => {
        const LETTERS = ['A','B','C','D','E','F','G','H','I','J']
        const isNew = options && !Array.isArray(options) && options?.v === 2
        const left  = isNew ? (options.left  || []) : []
        const right = isNew ? (options.right || []) : []
        const correctArr = (() => { try { return correct_answer ? JSON.parse(correct_answer) : [] } catch { return [] } })()

        const setMatch = (li, ri) => {
          const arr = [...(Array.isArray(correctArr) ? correctArr : [])]
          while (arr.length <= li) arr.push(null)
          arr[li] = ri === '' ? null : parseInt(ri)
          onChange('correct_answer', JSON.stringify(arr))
        }
        // Fix: update both sides in one onChange call to avoid stale-closure overwrite
        const addItem = () => {
          if (left.length >= 10) return
          onChange('options', { v: 2, left: [...left, ''], right: [...right, ''] })
        }
        const removeItem = () => {
          if (left.length <= 1) return
          onChange('options', { v: 2, left: left.slice(0, -1), right: right.slice(0, -1) })
        }

        const handleMatchPhoto = async (side, file) => {
          if (!file) return
          setMOcrLoading(side)
          try {
            const rawText = await ocrImage(file)
            const lines = rawText.split('\n').map(l => l.replace(/^\s*[\dA-Ja-j][.)]\s*/, '').trim()).filter(l => l.length > 1)
            const extracted = lines.slice(0, 10)
            if (side === 'left') {
              const padded = extracted.concat(Array(Math.max(0, right.length - extracted.length)).fill(''))
              onChange('options', { v: 2, left: padded, right })
            } else {
              const padded = extracted.concat(Array(Math.max(0, left.length - extracted.length)).fill(''))
              onChange('options', { v: 2, left, right: padded })
            }
          } catch (err) {
            console.error('[matchPhoto] OCR failed:', err)
            alert('Could not read text from the photo. Please try a clearer image.')
          }
          setMOcrLoading(null)
        }

        return (
          <div className="form-field">
            {/* Hidden file inputs — triggered by button clicks via refs */}
            <input ref={matchLeftPhotoRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files[0]; e.target.value = ''; handleMatchPhoto('left', f) }} />
            <input ref={matchRightPhotoRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files[0]; e.target.value = ''; handleMatchPhoto('right', f) }} />
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Matching pairs</label>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn-ghost"
                  style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                  disabled={!!mOcrLoading}
                  onClick={() => matchLeftPhotoRef.current?.click()}>
                  {mOcrLoading === 'left' ? '⏳ Reading…' : '📸 Left from photo'}
                </button>
                <button type="button" className="btn-ghost"
                  style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                  disabled={!!mOcrLoading}
                  onClick={() => matchRightPhotoRef.current?.click()}>
                  {mOcrLoading === 'right' ? '⏳ Reading…' : '📸 Right from photo'}
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Left column */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Numbered list</div>
                {left.map((text, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gold)', width: '18px', flexShrink: 0 }}>{i+1}.</span>
                    <input type="text" style={{ flex: 1 }} placeholder={`Item ${i+1}…`} value={text}
                      onChange={e => { const n=[...left]; n[i]=e.target.value; onChange('options', { v: 2, left: n, right }) }} />
                    <select style={{ fontSize: '0.78rem', padding: '0.28rem 0.4rem', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-card)', width: '54px', flexShrink: 0 }}
                      value={correctArr[i] != null ? correctArr[i] : ''}
                      onChange={e => setMatch(i, e.target.value)}
                      title="Correct match">
                      <option value="">—</option>
                      {right.map((_, j) => j < LETTERS.length && (
                        <option key={j} value={j}>{LETTERS[j]}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {/* Right column */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lettered list</div>
                {right.map((text, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', width: '18px', flexShrink: 0 }}>{LETTERS[i]}.</span>
                    <input type="text" style={{ flex: 1 }} placeholder={`Item ${LETTERS[i]}…`} value={text}
                      onChange={e => { const n=[...right]; n[i]=e.target.value; onChange('options', { v: 2, left, right: n }) }} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
              {left.length < 10 && (
                <button type="button" className="builder-add-pair-btn" onClick={addItem}>+ Add pair</button>
              )}
              {left.length > 1 && (
                <button type="button" className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                  onClick={removeItem}>− Remove last</button>
              )}
            </div>
          </div>
        )
      })()}

      <div className="form-field">
        <label>Hint <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
        <input type="text" placeholder="e.g. am / is / are"
          value={hint || ''} onChange={e => onChange('hint', e.target.value)} />
      </div>
    </div>
  )
}

// ─── LessonPlanBuilder ────────────────────────────────────────
export function LessonPlanBuilder({ exercises, adminUserId, onSaved, onCancel, initialPlan = null }) {
  const isEdit = !!initialPlan
  const [title,    setTitle]    = useState(initialPlan?.title ?? '')
  const [desc,     setDesc]     = useState(initialPlan?.description ?? '')
  const [selected, setSelected] = useState(() => {
    if (!initialPlan) return []
    return (initialPlan.lesson_plan_exercises ?? [])
      .slice().sort((a, b) => a.order_index - b.order_index)
      .map(lpe => ({ id: lpe.exercises?.id, title: lpe.exercises?.title }))
      .filter(ex => ex.id)
  })
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState(null)

  const toggle = (ex) => setSelected(prev => {
    if (prev.find(e => e.id === ex.id)) return prev.filter(e => e.id !== ex.id)
    return [...prev, { id: ex.id, title: ex.title }]
  })

  const moveUp   = (i) => setSelected(p => { const a=[...p]; [a[i-1],a[i]]=[a[i],a[i-1]]; return a })
  const moveDown = (i) => setSelected(p => { const a=[...p]; [a[i],a[i+1]]=[a[i+1],a[i]]; return a })

  const handleSave = async () => {
    if (!title.trim() || !selected.length) return
    setSaving(true); setErr(null)
    const id = isEdit
      ? await updateLessonPlan(initialPlan.id, title, desc, selected.map(e => e.id))
      : await createLessonPlan(title, desc, adminUserId, selected.map(e => e.id))
    setSaving(false)
    if (id) onSaved(id)
    else setErr('Something went wrong. Please try again.')
  }

  return (
    <div>
      <div className="admin-exercises-toolbar">
        <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Lesson Plan' : 'Create Lesson Plan'}</h3>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>

      <div className="admin-assign-form" style={{ marginBottom: '1.5rem' }}>
        <div className="form-field">
          <label>Plan title *</label>
          <input type="text" placeholder="e.g. Beginner — Lesson 2: Present Simple"
            value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <input type="text" placeholder="Brief description"
            value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
      </div>

      <div className="plan-builder-grid">
        <div>
          <p className="plan-col-label">Exercise Library — click to add</p>
          <div className="plan-picker-list">
            {exercises.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No exercises yet.</p>}
            {exercises.map(ex => {
              const sel = !!selected.find(e => e.id === ex.id)
              return (
                <button key={ex.id} className={`plan-picker-item ${sel ? 'selected' : ''}`} onClick={() => toggle(ex)}>
                  <span style={{ flex: 1, textAlign: 'left' }}>{ex.title}</span>
                  <span className="plan-picker-check">{sel ? '✓' : '+'}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <p className="plan-col-label">Lesson order ({selected.length})</p>
          {selected.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Click exercises on the left to add them.</p>
          ) : (
            <div className="plan-order-list">
              {selected.map((ex, i) => (
                <div key={ex.id} className="plan-order-item">
                  <span className="plan-order-num">{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '0.88rem' }}>{ex.title}</span>
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <button className="plan-order-btn" onClick={() => moveUp(i)}   disabled={i === 0}>▲</button>
                    <button className="plan-order-btn" onClick={() => moveDown(i)} disabled={i === selected.length - 1}>▼</button>
                    <button className="plan-order-btn plan-order-btn--remove" onClick={() => toggle(ex)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {err && <div className="auth-error" style={{ marginTop: '1rem' }}>{err}</div>}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button className="btn-gold" onClick={handleSave}
          disabled={saving || !title.trim() || !selected.length}>
          {saving ? 'Saving…'
            : isEdit
              ? `Save changes (${selected.length} exercise${selected.length !== 1 ? 's' : ''})`
              : `Save plan (${selected.length} exercise${selected.length !== 1 ? 's' : ''})`}
        </button>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── ExercisePicker — lesson plan library picker ──────────────
export function ExercisePicker({ exercises, labels = [], books = [], onSelect, onCancel, cancelLabel = 'Cancel' }) {
  const [search,        setSearch]        = useState('')
  const [filterType,    setFilterType]    = useState(null)
  const [filterBook,    setFilterBook]    = useState(null)
  const [filterUnit,    setFilterUnit]    = useState('')
  const [filterPage,    setFilterPage]    = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [filterLabels,  setFilterLabels]  = useState([])

  const filtered = useMemo(() => exercises.filter(ex => {
    if (filterType    && ex.stage_type !== filterType)                         return false
    if (filterBook    && ex.book_id    !== filterBook)                         return false
    if (filterUnit    && !String(ex.unit  ?? '').startsWith(filterUnit))        return false
    if (filterPage    && !String(ex.page  ?? '').startsWith(filterPage))       return false
    if (filterSection && !(ex.section || '').toLowerCase().includes(filterSection.toLowerCase())) return false
    if (filterLabels.length > 0 && !(ex.labels || []).some(l => filterLabels.includes(l.id))) return false
    if (search        && !ex.title.toLowerCase().includes(search.toLowerCase()))  return false
    return true
  }), [exercises, filterType, filterBook, filterUnit, filterPage, filterSection, filterLabels, search])

  const allExLabels = useMemo(() => {
    const map = {}
    exercises.forEach(ex => (ex.labels || []).forEach(l => { map[l.id] = l }))
    return Object.values(map)
  }, [exercises])

  return (
    <div>
      <div className="admin-exercises-toolbar">
        <h3 style={{ margin: 0 }}>Pick an exercise from your library</h3>
        <button className="btn-ghost" onClick={onCancel}>{cancelLabel}</button>
      </div>

      {/* Stage type filter */}
      <div className="stage-type-filter">
        <button className={`stage-type-chip ${!filterType ? 'active' : ''}`} onClick={() => setFilterType(null)}>All</button>
        {STAGE_TYPES.map(t => (
          <button key={t.value} className={`stage-type-chip ${filterType === t.value ? 'active' : ''}`}
            onClick={() => setFilterType(filterType === t.value ? null : t.value)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Book filter */}
      {books.length > 0 && (
        <div className="library-filter-row">
          <span className="library-filter-label">📚 Book:</span>
          <button className={`filter-chip ${!filterBook ? 'filter-chip--active' : ''}`} onClick={() => setFilterBook(null)}>All</button>
          {books.map(bk => (
            <button key={bk.id} className={`filter-chip ${filterBook === bk.id ? 'filter-chip--active' : ''}`}
              onClick={() => setFilterBook(filterBook === bk.id ? null : bk.id)}>{bk.title}</button>
          ))}
        </div>
      )}

      {/* Location + search row */}
      <div className="library-filter-row library-filter-row--location">
        <span className="library-filter-label">📍</span>
        <input type="number" min="1" placeholder="Unit" value={filterUnit}
          onChange={e => setFilterUnit(e.target.value)} className="location-filter-input" />
        <input type="number" min="1" placeholder="Page" value={filterPage}
          onChange={e => setFilterPage(e.target.value)} className="location-filter-input" />
        <input type="text" placeholder="Section" value={filterSection}
          onChange={e => setFilterSection(e.target.value)} className="location-filter-input location-filter-input--wide" />
        <input type="text" placeholder="Search by title…" value={search}
          onChange={e => setSearch(e.target.value)} className="location-filter-input"
          style={{ width: '14rem' }} />
      </div>

      {/* Label filter */}
      {allExLabels.length > 0 && (
        <div className="library-filter-row">
          <span className="library-filter-label">Filter:</span>
          <button className={`filter-chip ${filterLabels.length === 0 ? 'filter-chip--active' : ''}`}
            onClick={() => setFilterLabels([])}>All</button>
          {allExLabels.map(l => (
            <button key={l.id} className={`filter-chip ${filterLabels.includes(l.id) ? 'filter-chip--active' : ''}`}
              style={{ '--lbl-color': l.color }}
              onClick={() => setFilterLabels(p => p.includes(l.id) ? p.filter(x=>x!==l.id) : [...p, l.id])}>
              {l.name}
            </button>
          ))}
        </div>
      )}

      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.75rem' }}>
        {filtered.length} exercise{filtered.length !== 1 ? 's' : ''} shown
      </p>

      {filtered.length === 0 ? (
        <div className="dashboard-empty"><p>No exercises match the filter.</p></div>
      ) : (
        <div className="stage-picker-grid">
          {filtered.map(ex => {
            const def = STAGE_TYPES.find(t => t.value === ex.stage_type) || { icon: '✏️', label: 'Exercise' }
            return (
              <button key={ex.id} className="stage-picker-card" onClick={() => onSelect(ex)}>
                {ex.thumbnail && (
                  <img src={ex.thumbnail} alt="" style={{ width: '100%', height: '72px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.5rem' }} />
                )}
                <div className="stage-picker-title">{ex.title}</div>
                <div className="stage-picker-meta">
                  <span className="admin-level-chip" style={{ fontSize: '0.72rem' }}>{def.icon} {def.label}</span>
                  {ex.books?.title && <span className="admin-level-chip" style={{ fontSize: '0.72rem' }}>📚 {ex.books.title}</span>}
                  {(ex.unit != null || ex.page != null) && (
                    <span className="admin-level-chip" style={{ fontSize: '0.72rem', color: 'var(--gold)' }}>
                      {[ex.unit != null ? `U${ex.unit}` : null, ex.page != null ? `p.${ex.page}` : null, ex.section || null].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {ex.estimated_minutes && <span className="admin-level-chip" style={{ fontSize: '0.72rem' }}>⏱ {ex.estimated_minutes} min</span>}
                  {(ex.labels||[]).map(l => <span key={l.id} className="label-chip" style={{ '--lbl-color': l.color, fontSize: '0.72rem' }}>{l.name}</span>)}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── StagePicker ─────────────────────────────────────────────
export function StagePicker({ type, allStages, onSelect, onCancel }) {
  const def = STAGE_TYPES.find(t => t.value === type) || {}
  const stagesOfType = allStages.filter(s => s.stage_type === type)
  const [search, setSearch] = useState('')
  const [filterLabels, setFilterLabels] = useState([])

  const allLabels = useMemo(() => {
    const map = {}
    stagesOfType.forEach(s => (s.labels || []).forEach(l => { map[l.id] = l }))
    return Object.values(map)
  }, [stagesOfType])

  const filtered = stagesOfType.filter(s => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase())
    const matchLabels = filterLabels.length === 0 || (s.labels||[]).some(l => filterLabels.includes(l.id))
    return matchSearch && matchLabels
  })

  return (
    <div>
      <div className="admin-exercises-toolbar">
        <h3 style={{ margin: 0 }}>{def.icon} Select {def.label}</h3>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
      <div className="library-filter-row" style={{ marginBottom: '0.75rem' }}>
        <input type="text" placeholder="Search by title…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: '0.9rem', minWidth: '220px' }} />
        {allLabels.map(l => (
          <button key={l.id} onClick={() => setFilterLabels(p => p.includes(l.id) ? p.filter(x=>x!==l.id) : [...p, l.id])}
            className={`filter-chip ${filterLabels.includes(l.id) ? 'filter-chip--active' : ''}`}
            style={{ '--lbl-color': l.color }}>{l.name}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="dashboard-empty">
          <p>No {def.label ? def.label.toLowerCase() : ''} stages found. Create one in the Lesson Stages tab first.</p>
        </div>
      ) : (
        <div className="stage-picker-grid">
          {filtered.map(s => (
            <button key={s.id} className="stage-picker-card" onClick={() => onSelect(s)}>
              <div className="stage-picker-title">{s.title}</div>
              {s.description && <div className="stage-picker-desc">{s.description}</div>}
              <div className="stage-picker-meta">
                {s.estimated_minutes && <span className="admin-level-chip">⏱ {s.estimated_minutes} min</span>}
                {s.audio_url && <span className="admin-level-chip">🎧 Audio</span>}
                {s.context_text && <span className="admin-level-chip">📖 Text</span>}
                {(s.labels||[]).map(l => (
                  <span key={l.id} className="label-chip" style={{ '--lbl-color': l.color }}>{l.name}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── StageCard (one block in the lesson plan builder) ─────────
export function StageCard({ stage, idx, exercises, onChange, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown, onPickerOpen }) {
  const def         = STAGE_TYPES.find(t => t.value === stage.type)
  const stageImgRef = useRef(null)
  const [imgLoading, setImgLoading] = useState(false)
  const [exExpanded, setExExpanded] = useState(false)

  const handleImages = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 2 - stage.contentImages.length)
    if (!files.length) return
    setImgLoading(true)
    const compressed = await Promise.all(files.map(f => compressImage(f)))
    onChange('contentImages', [...stage.contentImages, ...compressed].slice(0, 2))
    setImgLoading(false)
    e.target.value = ''
  }

  return (
    <div className="stage-card">
      <div className="stage-card-header">
        <span className="stage-index">{idx + 1}</span>
        <span className="stage-type-badge">{def.icon} {def.label}</span>

        {/* Duration picker */}
        <div className="stage-dur-row">
          {[5, 10, 15, 'other'].map(m => (
            <button key={m} type="button"
              className={`stage-dur-btn ${stage.durationMinutes === m ? 'active' : ''}`}
              onClick={() => onChange('durationMinutes', stage.durationMinutes === m ? null : m)}>
              {m === 'other' ? '…' : `${m}m`}
            </button>
          ))}
          {stage.durationMinutes === 'other' && (
            <input type="number" min="1" max="180" className="stage-dur-input"
              placeholder="min" value={stage.customDuration}
              onChange={e => onChange('customDuration', e.target.value)} />
          )}
        </div>

        <div className="stage-card-actions">
          <button type="button" className="stage-move-btn" onClick={onMoveUp}  disabled={!canMoveUp}>▲</button>
          <button type="button" className="stage-move-btn" onClick={onMoveDown} disabled={!canMoveDown}>▼</button>
          <button type="button" className="stage-remove-btn" onClick={onRemove}>✕</button>
        </div>
      </div>

      {/* Optional label */}
      <div className="form-field" style={{ marginBottom: '0.5rem' }}>
        <input type="text" placeholder={`Label (optional) — e.g. "${def.label} 1"`}
          value={stage.title}
          onChange={e => onChange('title', e.target.value)} />
      </div>

      {/* Teacher-only notes for this stage */}
      <div style={{ marginBottom: '0.6rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          🔒 Stage notes <span style={{ fontWeight: 400, fontStyle: 'italic' }}>(only you see this)</span>
        </div>
        <RichTextEditor
          value={stage.teacherNotes || ''}
          onChange={v => onChange('teacherNotes', v)}
          placeholder="What you'll do in this stage, reminders, timing cues…"
          minHeight="60px" />
      </div>

      {/* Exercise picker (exercise stages) */}
      {def.hasExercise && (
        <div className="form-field" style={{ marginBottom: 0 }}>
          {stage.exerciseId ? (() => {
            const selEx = exercises.find(ex => ex.id === stage.exerciseId)
            const stDef = STAGE_TYPES.find(t => t.value === selEx?.stage_type) || { icon: '✏️', label: 'Exercise' }
            return (
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.7rem', background: '#f8f5ee' }}>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem' }}>
                    {stDef.icon} {selEx?.title || 'Selected exercise'}
                  </span>
                  <button type="button" className="btn-ghost" style={{ fontSize: '0.73rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => setExExpanded(v => !v)}>
                    {exExpanded ? '▲ Less' : '▼ Details'}
                  </button>
                  <button type="button" className="stage-change-btn" onClick={onPickerOpen}>Change</button>
                </div>
                {/* Expanded details */}
                {exExpanded && selEx && (
                  <div style={{ padding: '0.6rem 0.75rem', borderTop: '1px solid var(--border)', background: '#fff', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      <span className="stage-type-badge-sm">{stDef.icon} {stDef.label}</span>
                      {selEx.books?.title && <span className="admin-level-chip">📚 {selEx.books.title}</span>}
                      {selEx.estimated_minutes && <span className="admin-level-chip">⏱ {selEx.estimated_minutes} min</span>}
                      {selEx.audio_url && <span className="admin-level-chip">🎧 Audio</span>}
                      {selEx.context_text && <span className="admin-level-chip">📖 Text</span>}
                      {(selEx.labels || []).map(lbl => (
                        <span key={lbl.id} className="label-chip" style={{ '--lbl-color': lbl.color }}>{lbl.name}</span>
                      ))}
                    </div>
                    {selEx.description && <p style={{ margin: '0 0 0.3rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{selEx.description}</p>}
                    {selEx.context_text && (
                      <div style={{ background: '#f5f2eb', borderRadius: '5px', padding: '0.4rem 0.6rem', fontSize: '0.82rem', marginTop: '0.3rem' }}
                        dangerouslySetInnerHTML={{ __html: selEx.context_text }} />
                    )}
                    {selEx.thumbnail && (
                      <img src={selEx.thumbnail} alt="" style={{ maxWidth: '100%', borderRadius: '5px', marginTop: '0.4rem' }} />
                    )}
                  </div>
                )}
              </div>
            )
          })() : (
            <button type="button" className="stage-select-btn" onClick={onPickerOpen}>
              Select stage →
            </button>
          )}
        </div>
      )}

      {/* Content fields (non-exercise stages) */}
      {!def.hasExercise && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input type="url" placeholder="🎧 Audio / video link (optional)"
            value={stage.audioUrl}
            onChange={e => onChange('audioUrl', e.target.value)} />
          <RichTextEditor
            value={stage.contentText}
            onChange={v => onChange('contentText', v)}
            placeholder="📖 Notes, text or instructions (optional)"
            minHeight="80px" />
          {stage.contentImages.length < 2 && (
            <button type="button" className="builder-upload-btn"
              onClick={() => stageImgRef.current?.click()}>
              {imgLoading ? '⏳ Uploading…' : `+ Add image (${stage.contentImages.length}/2)`}
            </button>
          )}
          <input ref={stageImgRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={handleImages} />
          {stage.contentImages.length > 0 && (
            <div className="builder-thumbs">
              {stage.contentImages.map((src, i) => (
                <div key={i} className="builder-thumb">
                  <img src={src} alt={`Stage img ${i + 1}`} />
                  <button className="builder-thumb-remove"
                    onClick={() => onChange('contentImages', stage.contentImages.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── LessonStageBuilder v2 ────────────────────────────────────
export function LessonStageBuilder({
  exercises: allExercises, labels, books, authStudents = [], manualStudents = [],
  adminUserId, onSaved, onCancel, initialPlan = null
}) {
  const isEdit = !!initialPlan

  // Lesson metadata
  const [title,           setTitle]           = useState(initialPlan?.title            ?? '')
  const [lessonAim,       setLessonAim]       = useState(initialPlan?.lesson_aim       ?? '')
  const [teachingPoint,   setTeachingPoint]   = useState(initialPlan?.teaching_point   ?? '')
  const [langAnalysis,    setLangAnalysis]    = useState(initialPlan?.language_analysis ?? '')
  const [englishLevel,    setEnglishLevel]    = useState(initialPlan?.english_level    ?? '')
  const [lessonLevel,     setLessonLevel]     = useState(initialPlan?.lesson_level     ?? '')

  // Numbered stage groups
  const [stageGroups,  setStageGroups]  = useState(() => initStageGroupsFromPlan(initialPlan))

  // Homework items (flat list, separate from lesson stages)
  const [homeworkItems, setHomeworkItems] = useState(() => {
    if (!initialPlan) return []
    return (initialPlan.lesson_stages ?? [])
      .filter(s => (s.section ?? 'lesson') === 'homework')
      .map(s => ({
        id:         s.id,
        exerciseId: s.exercise_id || '',
        note:       s.content_text || '',
      }))
  })

  const addHomeworkItem    = () => setHomeworkItems(prev => [...prev, { id: crypto.randomUUID(), exerciseId: '', note: '' }])
  const removeHomeworkItem = (id) => setHomeworkItems(prev => prev.filter(h => h.id !== id))
  const updateHomeworkItem = (id, field, val) => setHomeworkItems(prev => prev.map(h => h.id === id ? { ...h, [field]: val } : h))

  // Exercise picker/creator overlay: null | { groupNumber, mode: 'pick'|'create' }
  const [pickerCtx,    setPickerCtx]    = useState(null)
  // Inline edit of an existing exercise from within the plan
  const [editingStageEx,  setEditingStageEx]  = useState(null) // { groupNumber, itemId | for:'homework', homeworkId, exercise }
  const [loadingEditExId, setLoadingEditExId] = useState(null)
  // All exercises including ones created inline during this session
  const [exercises,    setExercises]    = useState(allExercises)
  // Ref for the "Add stage" button — used to scroll into view after adding
  const addStageBtnRef = useRef(null)

  // ── Auto-save draft to localStorage ──────────────────────────
  // Only active for new plans (not edits of saved plans).
  const DRAFT_KEY = adminUserId ? `lessonPlanDraft_${adminUserId}` : null

  // On mount: restore a previously unsaved draft for new plans
  const [draftRestored, setDraftRestored] = useState(false)
  useEffect(() => {
    if (isEdit || !DRAFT_KEY) return
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (draft.title)         setTitle(draft.title)
      if (draft.lessonAim)     setLessonAim(draft.lessonAim)
      if (draft.teachingPoint) setTeachingPoint(draft.teachingPoint)
      if (draft.langAnalysis)  setLangAnalysis(draft.langAnalysis)
      if (draft.englishLevel)  setEnglishLevel(draft.englishLevel)
      if (draft.lessonLevel)   setLessonLevel(draft.lessonLevel)
      if (draft.stageGroups && draft.stageGroups.length > 0) setStageGroups(draft.stageGroups)
      setDraftRestored(true)
    } catch { /* corrupt draft — ignore */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save on every change (300 ms after last keystroke)
  useEffect(() => {
    if (isEdit || !DRAFT_KEY) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          title, lessonAim, teachingPoint, langAnalysis,
          stageGroups, englishLevel, lessonLevel,
          savedAt: Date.now(),
        }))
      } catch { /* storage full — ignore */ }
    }, 300)
    return () => clearTimeout(t)
  }, [title, lessonAim, teachingPoint, langAnalysis, stageGroups, englishLevel, lessonLevel]) // eslint-disable-line react-hooks/exhaustive-deps

  // Helper: close picker and return to builder
  const closePickerCtx = () => { setPickerCtx(null) }

  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState(null)

  // ── Stage group helpers ────────────────────────────────────────
  const addStageGroup = () => {
    const nextNum = stageGroups.length > 0
      ? Math.max(...stageGroups.map(g => g.number)) + 1
      : 1
    if (nextNum > 10) return // max 10 stages
    // Preserve scroll position so the page doesn't jump to top after re-render
    const savedScrollY = window.scrollY
    setStageGroups(p => [...p, { number: nextNum, name: '', items: [] }])
    requestAnimationFrame(() => {
      // Scroll to the "Add stage" button so user can immediately add another
      if (addStageBtnRef.current) {
        addStageBtnRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      } else {
        window.scrollTo({ top: savedScrollY, behavior: 'instant' })
      }
    })
  }
  const removeStageGroup = (num) =>
    setStageGroups(p => p.filter(g => g.number !== num))
  const updateGroupName = (num, name) =>
    setStageGroups(p => p.map(g => g.number === num ? { ...g, name } : g))
  const addItemToGroup = (num, item) =>
    setStageGroups(p => p.map(g => g.number === num ? { ...g, items: [...g.items, item] } : g))
  const removeItemFromGroup = (num, itemId) =>
    setStageGroups(p => p.map(g => g.number === num ? { ...g, items: g.items.filter(i => i.id !== itemId) } : g))
  // Reorder an exercise within its stage group (dir: -1 = up, +1 = down)
  const moveItemInGroup = (num, itemId, dir) =>
    setStageGroups(p => p.map(g => {
      if (g.number !== num) return g
      const idx = g.items.findIndex(i => i.id === itemId)
      if (idx < 0) return g
      const j = idx + dir
      if (j < 0 || j >= g.items.length) return g
      const items = [...g.items]
      ;[items[idx], items[j]] = [items[j], items[idx]]
      return { ...g, items }
    }))
  const moveStageUp = (num) => {
    setStageGroups(prev => {
      const idx = prev.findIndex(g => g.number === num)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next.map((g, i) => ({ ...g, number: i + 1 }))
    })
  }
  const moveStageDown = (num) => {
    setStageGroups(prev => {
      const idx = prev.findIndex(g => g.number === num)
      if (idx < 0 || idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next.map((g, i) => ({ ...g, number: i + 1 }))
    })
  }
  const updateItemInGroup = (num, itemId, field, val) =>
    setStageGroups(p => p.map(g => g.number === num
      ? { ...g, items: g.items.map(i => i.id === itemId ? { ...i, [field]: val } : i) }
      : g))

  // ── Exercise picker callbacks ──────────────────────────────────
  const handlePickerSelect = (exercise) => {
    if (!pickerCtx) return
    if (pickerCtx.for === 'homework') {
      // Homework picker: update the homework item's exerciseId
      updateHomeworkItem(pickerCtx.homeworkId, 'exerciseId', exercise.id)
    } else {
      // Stage picker
      const item = newStage('controlled_exercise')
      item.exerciseId    = exercise.id
      item.exerciseTitle = exercise.title
      item.type          = exercise.stage_type || 'controlled_exercise'
      addItemToGroup(pickerCtx.groupNumber, item)
    }
    closePickerCtx()
  }

  const handleNewExerciseSaved = async (newExId) => {
    const reloaded = await fetchAllExercises()
    setExercises(reloaded)
    const newEx = reloaded.find(e => e.id === newExId)
    if (newEx && pickerCtx) {
      if (pickerCtx.for === 'homework') {
        // Homework create: link newly created exercise to the homework item
        updateHomeworkItem(pickerCtx.homeworkId, 'exerciseId', newEx.id)
      } else {
        const item = newStage(newEx.stage_type || 'controlled_exercise')
        item.exerciseId    = newEx.id
        item.exerciseTitle = newEx.title
        item.type          = newEx.stage_type || 'controlled_exercise'
        addItemToGroup(pickerCtx.groupNumber, item)
      }
    }
    closePickerCtx()
  }

  // ── Edit an existing exercise inline (opens the full ExerciseBuilder) ──
  const openEditExercise = async (ctx, exerciseId) => {
    setLoadingEditExId(exerciseId)
    const full = await fetchExerciseWithQuestions(exerciseId)
    setLoadingEditExId(null)
    if (!full) { alert('Could not load this exercise. It may have been deleted.'); return }
    setEditingStageEx({ ...ctx, exercise: full })
  }

  const handleEditExerciseSaved = async (exId) => {
    const reloaded = await fetchAllExercises()
    setExercises(reloaded)
    const updated = reloaded.find(e => e.id === exId)
    // Refresh the cached title/type on the stage item (homework looks up by id, no cache to update)
    if (updated && editingStageEx && editingStageEx.for !== 'homework') {
      setStageGroups(prev => prev.map(g => g.number === editingStageEx.groupNumber
        ? { ...g, items: g.items.map(it => it.id === editingStageEx.itemId
            ? { ...it, exerciseTitle: updated.title, type: updated.stage_type || it.type }
            : it) }
        : g))
    }
    setEditingStageEx(null)
  }

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) return
    if (!englishLevel) { setErr('Please select a course for this lesson plan.'); return }
    setSaving(true); setErr(null)
    const flatItems = stageGroups.flatMap(g =>
      g.items.map(item => ({ ...item, stageNumber: g.number, stageName: g.name || null, section: 'lesson' }))
    )
    // Append homework items as flat stages with section:'homework'
    const hwItems = homeworkItems
      .filter(hw => hw.exerciseId)
      .map((hw, i) => ({
        id:              hw.id,
        type:            'controlled_exercise',
        title:           '',
        durationMinutes: null,
        customDuration:  '',
        exerciseId:      hw.exerciseId,
        contentText:     hw.note || '',
        audioUrl:        '',
        contentImages:   [],
        stageNumber:     null,
        stageName:       null,
        section:         'homework',
      }))
    const allStages = [...flatItems, ...hwItems]
    const meta = {
      lessonAim:        lessonAim,
      teachingPoint:    teachingPoint,
      languageAnalysis: langAnalysis,
      englishLevel:     englishLevel || null,
      lessonLevel:      lessonLevel  || null,
    }
    const id = isEdit
      ? await updateLessonPlanWithStages(initialPlan.id, title, null, allStages, meta)
      : await createLessonPlanWithStages(title, null, adminUserId, allStages, meta)
    setSaving(false)
    if (id) {
      // Clear the auto-saved draft now that it's been saved to the DB
      if (!isEdit && DRAFT_KEY) { try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } }
      onSaved(id)
    } else {
      setErr('Something went wrong. Please try again.')
    }
  }

  const totalItems = stageGroups.reduce((sum, g) => sum + g.items.length, 0)

  // ── Picker overlay ─────────────────────────────────────────────
  if (pickerCtx?.mode === 'pick') {
    return <ExercisePicker
      exercises={exercises} labels={labels} books={books}
      onSelect={handlePickerSelect}
      onCancel={closePickerCtx}
      cancelLabel="← Back to lesson plan" />
  }
  if (pickerCtx?.mode === 'create') {
    return <ExerciseBuilder
      allLabels={labels} allBooks={books}
      onSaved={handleNewExerciseSaved}
      onCancel={closePickerCtx}
      cancelLabel="← Back to lesson plan" />
  }
  if (editingStageEx) {
    return <ExerciseBuilder
      initialExercise={editingStageEx.exercise}
      allLabels={labels} allBooks={books}
      onSaved={handleEditExerciseSaved}
      onCancel={() => setEditingStageEx(null)}
      cancelLabel="← Back to lesson plan" />
  }

  const totalPlanMins = stageGroups.flatMap(g => g.items).reduce((sum, item) => {
    const exFull = exercises.find(e => e.id === item.exerciseId)
    const m = item.durationMinutes === 'other'
      ? (parseInt(item.customDuration) || 0)
      : (typeof item.durationMinutes === 'number' ? item.durationMinutes
         : (exFull?.estimated_minutes || 0))
    return sum + m
  }, 0)

  return (
    <div>
      <div className="admin-exercises-toolbar">
        <button className="btn-ghost" style={{ fontSize: '0.88rem', padding: '0.4rem 0.75rem' }} onClick={onCancel}>← Back to plans</button>
        <h3 style={{ margin: '0 auto' }}>{isEdit ? 'Edit Lesson Plan' : 'Create Lesson Plan'}</h3>
        {totalPlanMins > 0 ? (
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gold)', background: 'rgba(212,168,83,0.12)', border: '1px solid rgba(212,168,83,0.35)', borderRadius: '20px', padding: '0.25rem 0.75rem', whiteSpace: 'nowrap' }}>
            ⏱ {totalPlanMins} min total
          </div>
        ) : <div style={{ width: '100px' }} />}
      </div>

      {/* Draft restored banner */}
      {draftRestored && (
        <div style={{
          background: 'var(--gold)', color: '#fff', padding: '0.5rem 1rem',
          borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>📋 Draft restored from your last session.</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}
            onClick={() => { setDraftRestored(false); if (DRAFT_KEY) localStorage.removeItem(DRAFT_KEY); }}>
            ✕ Discard
          </button>
        </div>
      )}

      {/* ── Course (mandatory) ── */}
      <div className="builder-section">
        <h4 className="builder-section-title">📚 Course <span className="required-star">*</span></h4>
        {(() => {
          const adminCourses = getAdminCourses()
          return (
            <select value={englishLevel} onChange={e => setEnglishLevel(e.target.value)}
              style={{ fontSize: '0.88rem', padding: '0.4rem 0.6rem', borderRadius: '6px', border: `1px solid ${!englishLevel ? '#e05c5c' : 'var(--border)'}`, background: '#fff', minWidth: '220px' }}>
              <option value="">— Select course (required) —</option>
              {adminCourses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              {englishLevel && !adminCourses.find(c => c.name === englishLevel) && (
                <option value={englishLevel} disabled style={{ color: '#e05c5c' }}>{englishLevel} (deleted — please re-select)</option>
              )}
            </select>
          )
        })()}
      </div>

      {/* ── Lesson Info ── */}
      <div className="builder-section">
        <h4 className="builder-section-title">📋 Lesson info</h4>
        <div className="form-field">
          <label>Title <span className="required-star">*</span></label>
          <input type="text" placeholder="e.g. Present Simple — Habits & Routines"
            value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="form-field" style={{ marginTop: '0.75rem' }}>
          <label>🎯 Lesson aim</label>
          <RichTextEditor value={lessonAim} onChange={v => setLessonAim(v)}
            placeholder="e.g. Students will be able to talk about daily habits using the present simple."
            minHeight="64px" />
        </div>
        <div className="form-field" style={{ marginTop: '0.75rem' }}>
          <label>✏️ Teaching point</label>
          <RichTextEditor value={teachingPoint} onChange={v => setTeachingPoint(v)}
            placeholder="e.g. He/She/It + verb + s/es. Negative: don't / doesn't."
            minHeight="64px" />
        </div>
        <div className="form-field" style={{ marginTop: '0.75rem' }}>
          <label>🔬 Language analysis</label>
          <RichTextEditor value={langAnalysis} onChange={v => setLangAnalysis(v)}
            placeholder="e.g. Form: S + V(s) + O. Meaning: habitual actions. Pronunciation: /s/ /z/ /ɪz/ endings."
            minHeight="160px" />
        </div>
      </div>

      {/* ── Stage Groups ── */}
      <div className="builder-section">
        <h4 className="builder-section-title">📌 Lesson stages</h4>
        {stageGroups.length === 0 && (
          <div className="dashboard-empty" style={{ margin: '0.5rem 0 1rem' }}>
            <p style={{ margin: 0 }}>No stages yet — click "Add stage" to begin.</p>
          </div>
        )}
        {stageGroups.map((group, groupIdx) => {
          const gc = STAGE_GROUP_COLORS[groupIdx % STAGE_GROUP_COLORS.length]
          return (
          <div key={group.number} className="plan-stage-group"
            style={{ background: gc.bg, border: `1.5px solid ${gc.border}` }}>
            <div className="plan-stage-group-header">
              <span className="plan-stage-num"
                style={{ background: gc.border, color: gc.pill, borderRadius: '6px', padding: '0.18rem 0.55rem' }}>
                Stage {group.number}
              </span>
              <input type="text" className="plan-stage-name-input"
                placeholder="Stage name (optional, e.g. Warm-up)"
                value={group.name}
                onChange={e => updateGroupName(group.number, e.target.value)}
                style={{ background: 'rgba(255,255,255,0.7)' }} />
              <button type="button" className="btn-ghost"
                style={{ fontSize: '0.78rem', padding: '0.22rem 0.45rem', flexShrink: 0 }}
                disabled={group.number === 1}
                onClick={() => moveStageUp(group.number)}
                title="Move stage up">
                ▲
              </button>
              <button type="button" className="btn-ghost"
                style={{ fontSize: '0.78rem', padding: '0.22rem 0.45rem', flexShrink: 0 }}
                disabled={group.number === stageGroups.length}
                onClick={() => moveStageDown(group.number)}
                title="Move stage down">
                ▼
              </button>
              <button type="button" className="btn-ghost"
                style={{ fontSize: '0.78rem', padding: '0.22rem 0.55rem', color: '#e05c5c', flexShrink: 0 }}
                onClick={() => removeStageGroup(group.number)}>
                Remove
              </button>
            </div>

            {/* Items in this group */}
            {group.items.length === 0 ? (
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0.4rem 0' }}>
                No exercises yet — add one below.
              </p>
            ) : (
              <div className="plan-stage-items">
                {group.items.map((item, itemIdx) => {
                  const def = STAGE_TYPES.find(t => t.value === item.type) || { icon: '✏️', label: 'Exercise' }
                  const exFull = exercises.find(e => e.id === item.exerciseId)
                  const book   = exFull?.book_id ? books.find(b => b.id === exFull.book_id) : null
                  const locParts = [
                    exFull?.unit != null ? `Unit ${exFull.unit}` : null,
                    exFull?.page != null ? `p.${exFull.page}` : null,
                    exFull?.section || null,
                    exFull?.exercise_no != null ? `Ex.${exFull.exercise_no}` : null,
                  ].filter(Boolean)
                  const cardBg = STAGE_TYPE_CARD_BG[item.type] || '#F1EFE8'
                  return (
                    <div key={item.id} className="plan-stage-item-card"
                      style={{ background: cardBg, border: '1px solid rgba(0,0,0,0.07)' }}>
                      {exFull?.thumbnail ? (
                        <img src={exFull.thumbnail} alt="" className="plan-stage-item-thumb" />
                      ) : item.exerciseId ? (
                        /* Thumbnail placeholder — click to upload */
                        <label className="plan-stage-item-thumb-placeholder" title="Add thumbnail">
                          <input type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]; if (!file) return
                              e.target.value = ''
                              try {
                                const compressed = await compressImage(file, 400)
                                const ok = await updateExerciseThumbnail(item.exerciseId, compressed)
                                if (ok) setExercises(prev => prev.map(ex =>
                                  ex.id === item.exerciseId ? { ...ex, thumbnail: compressed } : ex
                                ))
                              } catch (err) { console.error('thumb upload', err) }
                            }} />
                          <span style={{ fontSize: '1.3rem', display: 'block', lineHeight: 1 }}>📷</span>
                          <span style={{ fontSize: '0.7rem', display: 'block', marginTop: '0.2rem' }}>Add thumbnail</span>
                        </label>
                      ) : null}
                      <div className="plan-stage-item-body">
                        <div className="plan-stage-item-title-row">
                          <span className="plan-stage-item-icon">{def.icon}</span>
                          <span className="plan-stage-item-title">
                            {item.exerciseTitle || item.title || <em style={{ color: 'var(--text-muted)' }}>No title</em>}
                          </span>
                          {group.items.length > 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '0.3rem', flexShrink: 0 }}>
                              <button type="button" title="Move up" disabled={itemIdx === 0}
                                onClick={() => moveItemInGroup(group.number, item.id, -1)}
                                style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '4px', cursor: itemIdx === 0 ? 'default' : 'pointer', fontSize: '0.55rem', lineHeight: 1, padding: '2px 6px', color: 'var(--text-muted)', opacity: itemIdx === 0 ? 0.35 : 1 }}>▲</button>
                              <button type="button" title="Move down" disabled={itemIdx === group.items.length - 1}
                                onClick={() => moveItemInGroup(group.number, item.id, 1)}
                                style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '4px', cursor: itemIdx === group.items.length - 1 ? 'default' : 'pointer', fontSize: '0.55rem', lineHeight: 1, padding: '2px 6px', color: 'var(--text-muted)', opacity: itemIdx === group.items.length - 1 ? 0.35 : 1 }}>▼</button>
                            </div>
                          )}
                          {item.exerciseId && (
                            <button type="button" title="Edit this exercise"
                              onClick={() => openEditExercise({ groupNumber: group.number, itemId: item.id }, item.exerciseId)}
                              disabled={loadingEditExId === item.exerciseId}
                              style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid var(--gold)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, padding: '0.22rem 0.55rem', color: 'var(--gold)', marginRight: '0.3rem', flexShrink: 0, fontFamily: 'inherit' }}>
                              {loadingEditExId === item.exerciseId ? '…' : '✏️ Edit'}
                            </button>
                          )}
                          <button type="button" className="plan-stage-item-remove"
                            onClick={() => removeItemFromGroup(group.number, item.id)}>✕</button>
                        </div>
                        <div className="plan-stage-item-meta">
                          <span className="stage-type-badge-sm">{def.icon} {def.label}</span>
                          {book && <span className="admin-level-chip" style={{ fontSize: '0.72rem' }}>📚 {book.title}</span>}
                          {locParts.length > 0 && (
                            <span className="admin-level-chip location-chip" style={{ fontSize: '0.72rem' }}>{locParts.join(' · ')}</span>
                          )}
                          {exFull?.estimated_minutes && (
                            <span className="admin-level-chip" style={{ fontSize: '0.72rem' }}>⏱ {exFull.estimated_minutes} min</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add exercise buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button"
                style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem', borderRadius: '7px', border: `1.5px solid ${gc.border}`, background: 'rgba(255,255,255,0.75)', color: gc.pill, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                onClick={() => setPickerCtx({ groupNumber: group.number, mode: 'pick' })}>
                📚 Pick from library
              </button>
              <button type="button"
                style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem', borderRadius: '7px', border: `1.5px solid ${gc.border}`, background: 'rgba(255,255,255,0.75)', color: gc.pill, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                onClick={() => setPickerCtx({ groupNumber: group.number, mode: 'create' })}>
                ✏️ Create new exercise
              </button>
            </div>
          </div>
          )
        })}

        {stageGroups.length < 10 && (
          <button type="button" className="stage-add-btn"
            ref={addStageBtnRef}
            style={{ marginTop: '0.75rem' }}
            onClick={addStageGroup}>
            + Add Stage {stageGroups.length > 0 ? stageGroups.length + 1 : 1}
          </button>
        )}
      </div>

      {/* ── Homework ── */}
      <div className="builder-section" style={{ marginTop: '1.5rem' }}>
        <h4 className="builder-section-title">📚 Homework</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
          Exercises assigned to the student to complete after the lesson.
        </p>
        {homeworkItems.map((hw) => {
          const ex = exercises.find(e => e.id === hw.exerciseId)
          return (
            <div key={hw.id} style={{ background:'#fff', borderRadius:'8px', border:'1px solid #e8e3d8', marginBottom:'0.5rem', padding:'0.6rem 0.75rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom: ex || hw.exerciseId ? '0.45rem' : 0 }}>
                {ex ? (
                  <span style={{ flex:1, fontWeight:600, fontSize:'0.9rem' }}>{ex.title}</span>
                ) : (
                  <span style={{ flex:1, fontSize:'0.88rem', color:'var(--text-muted)', fontStyle:'italic' }}>No exercise selected</span>
                )}
                <button className="btn-ghost" style={{ fontSize:'0.8rem', padding:'0.25rem 0.55rem' }}
                  onClick={() => setPickerCtx({ for:'homework', homeworkId:hw.id, mode:'pick' })}>
                  📚 {ex ? 'Change' : 'Pick from library'}
                </button>
                <button className="btn-ghost" style={{ fontSize:'0.8rem', padding:'0.25rem 0.55rem' }}
                  onClick={() => setPickerCtx({ for:'homework', homeworkId:hw.id, mode:'create' })}>
                  ✏️ Create new
                </button>
                {hw.exerciseId && (
                  <button className="btn-ghost" style={{ fontSize:'0.8rem', padding:'0.25rem 0.55rem', color:'var(--gold)', borderColor:'var(--gold)' }}
                    onClick={() => openEditExercise({ for:'homework', homeworkId:hw.id }, hw.exerciseId)}
                    disabled={loadingEditExId === hw.exerciseId}>
                    {loadingEditExId === hw.exerciseId ? '…' : '✏️ Edit'}
                  </button>
                )}
                <button className="btn-ghost" style={{ fontSize:'0.8rem', padding:'0.25rem 0.45rem', color:'#e05c5c' }}
                  onClick={() => removeHomeworkItem(hw.id)}>✕</button>
              </div>
              <input type="text" placeholder="Note to student (optional)" value={hw.note}
                onChange={e => updateHomeworkItem(hw.id, 'note', e.target.value)}
                style={{ width:'100%', fontSize:'0.82rem', padding:'0.3rem 0.55rem', borderRadius:'6px', border:'1px solid #d4d0c8', boxSizing:'border-box' }} />
            </div>
          )
        })}
        <button className="btn-ghost" style={{ fontSize:'0.85rem', marginTop:'0.25rem' }}
          onClick={addHomeworkItem}>+ Add homework exercise</button>
      </div>

      {err && <div className="auth-error" style={{ marginTop: '0.75rem' }}>{err}</div>}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn-gold" onClick={handleSave} disabled={saving || !title.trim()}>
          {saving ? 'Saving…'
            : isEdit
              ? `Save changes (${stageGroups.length} stage${stageGroups.length !== 1 ? 's' : ''}, ${totalItems} item${totalItems !== 1 ? 's' : ''})`
              : `Save plan (${stageGroups.length} stage${stageGroups.length !== 1 ? 's' : ''}, ${totalItems} item${totalItems !== 1 ? 's' : ''})`}
        </button>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── AdminExerciseReview ──────────────────────────────────────
export function AdminExerciseReview({ details, onBack }) {
  const LETTERS    = ['A','B','C','D','E','F','G','H','I','J']
  const questions  = (details.exercises?.questions ?? [])
    .slice().sort((a, b) => a.order_index - b.order_index)
  const answerMap  = Object.fromEntries(details.studentAnswers.map(a => [a.question_id, a]))

  const [feedback,   setFeedback]   = useState(details.teacher_feedback ?? '')
  // Per-question marks: { [question_id]: { id: answer.id, is_correct: bool|null, comment: string } }
  const [marks, setMarks] = useState(() => {
    const s = {}
    details.studentAnswers.forEach(a => {
      s[a.question_id] = { id: a.id, is_correct: a.is_correct ?? null, comment: a.teacher_comment || '' }
    })
    return s
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const toggleMark = (qId, val) => setMarks(prev => ({
    ...prev,
    [qId]: { ...prev[qId], is_correct: prev[qId]?.is_correct === val ? null : val }
  }))
  const setNote = (qId, txt) => setMarks(prev => ({
    ...prev,
    [qId]: { ...prev[qId], comment: txt }
  }))

  // Auto-check answer (returns true/false/null)
  const autoCheck = (q, studentAnswer) => {
    if (!studentAnswer || !q.correct_answer) return null
    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      return studentAnswer.trim() === q.correct_answer.trim()
    }
    if (q.type === 'matching') {
      const isNew = q.options && !Array.isArray(q.options) && q.options?.v === 2
      if (!isNew) return null
      try {
        const studentArr = JSON.parse(studentAnswer)
        const correctArr = JSON.parse(q.correct_answer || '[]')
        const leftLen = (q.options.left || []).length
        return Array.from({length: leftLen}, (_, i) => studentArr[i] === correctArr[i]).every(Boolean)
      } catch { return null }
    }
    return null
  }

  const handleSave = async () => {
    setSaving(true)
    const reviews = Object.entries(marks)
      .filter(([_, m]) => m.id)
      .map(([_, m]) => ({ id: m.id, is_correct: m.is_correct, teacher_comment: m.comment }))
    if (reviews.length) await saveAnswerReviews(reviews)
    await saveExerciseFeedback(details.id, feedback)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const student    = details.profiles
  const exercise   = details.exercises
  const hasAnswers = details.studentAnswers.length > 0

  const typeLabel = (t) =>
    t === 'multiple_choice' ? 'Multiple choice'
    : t === 'fill_blank'    ? 'Fill in the blank'
    : t === 'true_false'    ? 'True / False'
    : t === 'matching'      ? 'Matching'
    : t === 'word_choice'   ? 'Word choice'
    : t === 'listening'     ? 'Listening'
    : t === 'viewing'       ? 'Viewing'
    : t === 'speaking'      ? 'Speaking'
    : 'Written answer'

  return (
    <div className="admin-detail">
      <button className="back-btn" onClick={onBack}>← Back to assignments</button>
      <h2>{exercise?.title}</h2>
      <div className="review-meta-row">
        <span className="admin-email">{student?.name || student?.email}</span>
        <span className="admin-date">
          {details.status === 'submitted'
            ? `Submitted ${new Date(details.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : '⏳ Not submitted yet'}
          {' · '}
          {details.mode === 'homework' ? '🏠 Homework' : '🎓 In class'}
        </span>
      </div>

      {!hasAnswers && (
        <div className="submission-pending-msg" style={{ margin: '0.75rem 0 1.25rem' }}>
          The student hasn't answered this exercise yet. You can still open it to preview the questions.
        </div>
      )}

      {exercise?.estimated_minutes && (
        <div style={{ display: 'flex', gap: '0.4rem', margin: '0.4rem 0 0.75rem' }}>
          <span className="admin-level-chip">⏱ ~{exercise.estimated_minutes} min</span>
        </div>
      )}
      {exercise?.audio_url && (
        <div className="exercise-audio-block" style={{ marginTop: '0.5rem' }}>
          <span className="exercise-context-label">🎧 Audio</span>
          <a href={exercise.audio_url} target="_blank" rel="noopener noreferrer" className="exercise-audio-link">Open audio / video →</a>
        </div>
      )}
      {exercise?.context_text && (
        <div className="exercise-context-text" style={{ marginTop: '0.5rem' }}>
          <p className="exercise-context-label">📖 Reading text</p>
          <div className="exercise-context-passage">{exercise.context_text}</div>
        </div>
      )}
      {exercise?.context_images?.length > 0 && !(questions[0]?.type === 'fill_blank' && parseOverlayPrompt(questions[0].prompt)) && (
        <div className="exercise-context-images" style={{ marginTop: '0.75rem' }}>
          <p className="exercise-context-label">📖 Reference material{details.student_annotations ? ' (student annotations shown)' : ''}</p>
          {exercise.context_images.map((src, i) => {
            const savedAnn = details.student_annotations?.[i]
            return (
              <div key={i} style={{ marginBottom: i < exercise.context_images.length - 1 ? '0.75rem' : 0 }}>
                <AnnotatedImage
                  src={src}
                  alt={`Reference ${i+1}`}
                  circlesEnabled={false}
                  linesEnabled={false}
                  initialCircles={savedAnn?.circles || []}
                  initialLines={savedAnn?.lines || []}
                />
              </div>
            )
          })}
        </div>
      )}

      <div className="review-questions">
        {questions.every(q => q.type === 'listening' || q.type === 'viewing') && questions.length > 0 && (
          <div className="verbal-activity-note">
            {questions[0].type === 'listening' ? '🎧' : '🎥'}
            <span>{questions[0].type === 'listening' ? 'Listening activity — student listened and discussed verbally.' : 'Viewing activity — student watched and discussed verbally.'}</span>
          </div>
        )}
        {questions.map((q, idx) => {
          if (q.type === 'listening' || q.type === 'viewing' || q.type === 'speaking') return null
          const sa          = answerMap[q.id]
          const hasAnswer   = !!sa?.answer?.trim()
          const autoResult  = autoCheck(q, sa?.answer)
          const mark        = marks[q.id]
          // Manual mark overrides auto; auto is fallback for display
          const effectiveMark = (mark?.is_correct != null) ? mark.is_correct : autoResult
          const matchIsNew  = q.type === 'matching' && q.options && !Array.isArray(q.options) && q.options?.v === 2

          return (
            <div key={q.id} className="review-question">
              {/* Header row: Q number, type, auto-mark, manual ✓/✗ buttons */}
              <div className="review-q-header">
                <span className="eq-num">Q{idx + 1}</span>
                <span className="eq-type">{typeLabel(q.type)}</span>
                {hasAnswer && effectiveMark === true  && <span className="demo-mark demo-mark--correct">✓ Correct</span>}
                {hasAnswer && effectiveMark === false && <span className="demo-mark demo-mark--wrong">✗ Wrong</span>}
                {hasAnswer && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.3rem' }}>
                    <button type="button" title="Mark correct" onClick={() => toggleMark(q.id, true)}
                      style={{ padding: '0.15rem 0.5rem', borderRadius: '5px', cursor: 'pointer', fontSize: '0.82rem',
                        border: `1.5px solid ${mark?.is_correct === true ? '#16a34a' : 'var(--border)'}`,
                        background: mark?.is_correct === true ? '#dcfce7' : 'var(--bg-card)',
                        color: mark?.is_correct === true ? '#15803d' : 'var(--text-muted)' }}>✓</button>
                    <button type="button" title="Mark wrong" onClick={() => toggleMark(q.id, false)}
                      style={{ padding: '0.15rem 0.5rem', borderRadius: '5px', cursor: 'pointer', fontSize: '0.82rem',
                        border: `1.5px solid ${mark?.is_correct === false ? '#dc2626' : 'var(--border)'}`,
                        background: mark?.is_correct === false ? '#fee2e2' : 'var(--bg-card)',
                        color: mark?.is_correct === false ? '#dc2626' : 'var(--text-muted)' }}>✗</button>
                  </div>
                )}
              </div>
              {q.type !== 'word_choice' && q.type !== 'fill_blank' && <p className="eq-prompt" dangerouslySetInnerHTML={{ __html: q.prompt }} />}

              {/* Student's answer */}
              <div className="review-answer-row" style={{ display: 'block' }}>
                <span className="review-label">Student answered:</span>
                {q.type === 'word_choice' ? (
                  hasAnswer
                    ? <WordChoiceQuestion template={q.prompt} answer={sa?.answer} onChange={() => {}} disabled={true} />
                    : <div className="review-answer-box review-answer-empty"><em>No answer given</em></div>
                ) : q.type === 'fill_blank' ? (
                  (() => {
                    const overlay = parseOverlayPrompt(q.prompt)
                    if (overlay && exercise?.context_images?.[0]) {
                      // Image-overlay fill-blank: show the student's words placed on the picture
                      return hasAnswer
                        ? <ImageOverlayFill src={exercise.context_images[0]} blanks={overlay.blanks}
                            answers={sa?.answer} onChange={() => {}} disabled={true} />
                        : <div className="review-answer-box review-answer-empty"><em>No answer given</em></div>
                    }
                    return hasAnswer
                      ? <InlineFillBlank prompt={q.prompt} answer={sa?.answer} onChange={() => {}} disabled={true} checked={true}
                          correctAnswers={parseFillBlankCorrect(q.correct_answer ?? '')} />
                      : <div className="review-answer-box review-answer-empty"><em>No answer given</em></div>
                  })()
                ) : q.type === 'matching' && hasAnswer ? (
                  <div className="review-matching-pairs">
                    {(() => { try {
                      const studentAns = JSON.parse(sa.answer)
                      if (matchIsNew) {
                        const left = q.options.left || [], right = q.options.right || []
                        const correctArr = (() => { try { return JSON.parse(q.correct_answer || '[]') } catch { return [] } })()
                        return left.map((lText, li) => {
                          const chosenRi  = studentAns[li] ?? null
                          const isCorrect = chosenRi != null && chosenRi === correctArr[li]
                          const isWrong   = chosenRi != null && chosenRi !== correctArr[li]
                          return (
                            <div key={li} className={`review-match-row ${isCorrect?'match-correct':isWrong?'match-wrong':''}`}>
                              <span><strong>{li+1}.</strong> {lText}</span><span>→</span>
                              <span>{chosenRi != null
                                ? <><strong style={{color:'#2563eb'}}>{LETTERS[chosenRi]}.</strong> {right[chosenRi]}</>
                                : <em style={{color:'var(--text-muted)'}}>not matched</em>}
                              </span>
                            </div>
                          )
                        })
                      }
                      return (q.options||[]).map(p => (
                        <div key={p.left} className={`review-match-row ${studentAns[p.left]===p.right?'match-correct':'match-wrong'}`}>
                          <span>{p.left}</span><span>→</span>
                          <span>{studentAns[p.left]||<em style={{color:'var(--text-dim)'}}>not matched</em>}</span>
                        </div>
                      ))
                    } catch { return <em>Error reading answer</em> } })()}
                  </div>
                ) : (
                  <div className={`review-answer-box ${!hasAnswer?'review-answer-empty':''}`}>
                    {hasAnswer ? sa.answer : <em>No answer given</em>}
                  </div>
                )}

                {/* Correct answer */}
                {q.correct_answer && !['matching','word_choice','fill_blank'].includes(q.type) && (
                  <div className="review-correct-answer">
                    <span className="review-label">Correct answer:</span> {q.correct_answer}
                  </div>
                )}
                {q.type === 'fill_blank' && q.correct_answer && (
                  <div className="review-correct-answer">
                    <span className="review-label">Correct answers:</span>{' '}
                    {parseFillBlankCorrect(q.correct_answer).map((a, i) => (
                      <span key={i}>{i > 0 && ' · '}<strong>{a}</strong></span>
                    ))}
                  </div>
                )}
                {q.type === 'matching' && q.options && (
                  <div className="review-correct-answer">
                    <span className="review-label">Correct pairs:</span>{' '}
                    {matchIsNew ? (() => {
                      const left = q.options.left||[], right = q.options.right||[]
                      const cArr = (() => { try { return JSON.parse(q.correct_answer||'[]') } catch { return [] } })()
                      return left.map((lText,li) => (
                        <span key={li}>{li>0&&' · '}<strong>{li+1}. {lText}</strong> → {right[cArr[li]]??'?'}</span>
                      ))
                    })()
                    : (q.options||[]).map((p,i) => <span key={i}>{i>0&&' · '}<strong>{p.left}</strong> → {p.right}</span>)
                    }
                  </div>
                )}

                {/* Per-question teacher note */}
                {hasAnswer && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <input type="text"
                      placeholder="Note for this question — visible to student after saving…"
                      value={mark?.comment || ''}
                      onChange={e => setNote(q.id, e.target.value)}
                      style={{ width: '100%', fontSize: '0.82rem', padding: '0.28rem 0.5rem',
                        border: '1px solid var(--border)', borderRadius: '5px',
                        background: 'var(--bg-card)', color: 'var(--text)', fontFamily: 'inherit' }} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Overall feedback + Save all ── */}
      <div className="exercise-feedback-section">
        <div className="form-field">
          <label>
            💬 Overall feedback for student
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>
              — visible to student after you save
            </span>
          </label>
          <textarea className="writing-input" rows={4}
            placeholder="e.g. Great effort! Watch your subject-verb agreement — 'he goes', not 'he go'. Ask me about it in the next lesson!"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.75rem' }}>
          <button className="btn-gold" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save review →'}
          </button>
          {saved && <span style={{ color: '#4ade80', fontSize: '0.9rem' }}>✓ Saved — student can see your feedback</span>}
        </div>
      </div>
    </div>
  )
}

// ─── AdminLessonRow ───────────────────────────────────────────
export function AdminLessonRow({ lesson: initialLesson, onUpdate, onOpenLesson = null }) {
  const [editing, setEditing] = useState(false)
  const [lesson,  setLesson]  = useState(initialLesson)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => setLesson(initialLesson), [initialLesson])

  const handleSave = async () => {
    setSaving(true)
    const updates = {
      title:            lesson.title            || null,
      lesson_no:        lesson.lesson_no        || null,
      scheduled_at:     lesson.scheduled_at     || null,
      status:           lesson.status,
      teacher_notes:    lesson.teacher_notes    || null,
      notes_visible:    lesson.notes_visible,
      duration_minutes: lesson.duration_minutes || null,
      completed_at:     lesson.status === 'completed' && !lesson.completed_at
                          ? new Date().toISOString()
                          : lesson.completed_at,
    }
    const ok = await onUpdate(lesson.id, updates)
    setSaving(false)
    if (ok) setEditing(false)
  }

  if (editing) {
    return (
      <div className="admin-lesson-row admin-lesson-row--editing">
        <div className="admin-lesson-edit-grid">
          <div className="form-field">
            <label>Lesson #</label>
            <input type="number" min="1" style={{ width: 80 }}
              value={lesson.lesson_no || ''}
              onChange={e => setLesson(p => ({ ...p, lesson_no: e.target.value ? parseInt(e.target.value) : null }))} />
          </div>
          <div className="form-field">
            <label>Title</label>
            <input type="text" placeholder="e.g. Present Simple"
              value={lesson.title || ''}
              onChange={e => setLesson(p => ({ ...p, title: e.target.value || null }))} />
          </div>
          <div className="form-field">
            <label>Date &amp; time</label>
            <input type="datetime-local"
              value={lesson.scheduled_at ? (() => { const d = new Date(lesson.scheduled_at); const pad = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` })() : ''}
              onChange={e => setLesson(p => ({ ...p, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
          </div>
          <div className="form-field">
            <label>Status</label>
            <select value={lesson.status} onChange={e => setLesson(p => ({ ...p, status: e.target.value }))}>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="form-field">
            <label>Duration</label>
            <select value={lesson.duration_minutes || ''}
              onChange={e => setLesson(p => ({ ...p, duration_minutes: e.target.value ? parseInt(e.target.value) : null }))}>
              <option value="">Not set</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </select>
          </div>
        </div>
        <div className="form-field" style={{ marginTop: '0.5rem' }}>
          <label>Teacher notes</label>
          <textarea className="writing-input" rows={3}
            placeholder="Notes for records or to share with student"
            value={lesson.teacher_notes || ''}
            onChange={e => setLesson(p => ({ ...p, teacher_notes: e.target.value || null }))} />
        </div>
        <label className="admin-lesson-visible-toggle">
          <input type="checkbox" checked={lesson.notes_visible}
            onChange={e => setLesson(p => ({ ...p, notes_visible: e.target.checked }))} />
          Show notes to student
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button className="btn-gold" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
            onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button className="btn-ghost" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
            onClick={() => { setLesson(initialLesson); setEditing(false) }}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-lesson-row">
      <div className="admin-lesson-row-left">
        <span className={`lesson-status-chip lesson-status-chip--${lesson.status}`}>
          {lesson.status === 'completed' ? '✓ Completed' : lesson.status === 'cancelled' ? '✕ Cancelled' : '◷ Upcoming'}
        </span>
        <span className="lesson-title">
          {lesson.lesson_no ? `Lesson ${lesson.lesson_no}` : 'Lesson'}
          {lesson.title ? ` — ${lesson.title}` : ''}
        </span>
        {lesson.scheduled_at && (
          <span className="lesson-date">
            {new Date(lesson.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {lesson.duration_minutes && (
          <span className="lesson-duration-chip">⏱ {lesson.duration_minutes} min</span>
        )}
        {lesson.teacher_notes && (
          <span className="admin-lesson-notes-indicator">
            📝 {lesson.notes_visible ? 'Note visible' : 'Note (hidden)'}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
        {onOpenLesson && (
          <button className="btn-gold" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap' }}
            onClick={onOpenLesson}>Open lesson</button>
        )}
        <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
          onClick={() => setEditing(true)}>Edit</button>
      </div>
    </div>
  )
}

// ─── AdminStudentPlans ────────────────────────────────────────
export function AdminStudentPlans({ student, isManual = false, onOpenPlan }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fn = isManual ? fetchPlansForManualStudentAdmin : fetchPlansForStudentAdmin
    fn(student.id).then(data => { setPlans(data); setLoading(false) })
  }, [student.id, isManual])

  if (loading) return <div className="admin-section"><h3>Lesson Plans</h3><div className="dashboard-loading" style={{padding:'0.5rem 0'}}>Loading…</div></div>
  if (plans.length === 0) return <div className="admin-section"><h3>Lesson Plans (0)</h3><p style={{color:'var(--text-muted)',fontSize:'0.88rem'}}>No lesson plans assigned yet.</p></div>

  return (
    <div className="admin-section">
      <h3>Lesson Plans ({plans.length})</h3>
      <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',marginTop:'0.5rem'}}>
        {plans.map(plan => {
          const exerciseCount = (plan.lesson_stages ?? []).filter(s => s.exercises && (s.section ?? 'lesson') !== 'homework').length
          const hwCount = (plan.lesson_stages ?? []).filter(s => (s.section ?? 'lesson') === 'homework').length
          return (
            <div key={plan.id} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.65rem 0.85rem',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'8px'}}>
              <div style={{flex:1}}>
                <strong style={{fontSize:'0.92rem'}}>{plan.title}</strong>
                <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:'0.15rem'}}>
                  {exerciseCount} exercise{exerciseCount!==1?'s':''}{hwCount>0?` · ${hwCount} homework`:''}{plan.scheduled_at ? ` · ${new Date(plan.scheduled_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}` : ''}
                </div>
              </div>
              <button className="btn-gold" style={{fontSize:'0.82rem',padding:'0.35rem 0.8rem',whiteSpace:'nowrap'}}
                onClick={() => onOpenPlan(plan)}>
                ▶ Open lesson
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── AdminStudentExercises ────────────────────────────────────
export function AdminStudentExercises({ student, onReview, adminUserId = null }) {
  const [assignments,  setAssignments]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [deletingId,   setDeletingId]   = useState(null)
  const [confirmId,    setConfirmId]    = useState(null)

  // inline assign form
  const [allExercises,  setAllExercises]  = useState([])
  const [showAssign,    setShowAssign]    = useState(false)
  const [assignExId,    setAssignExId]    = useState('')
  const [assignMode,    setAssignMode]    = useState('homework')
  const [assignNote,    setAssignNote]    = useState('')
  const [assignSaving,  setAssignSaving]  = useState(false)
  const [assignError,   setAssignError]   = useState(null)

  useEffect(() => {
    fetchStudentAssignmentsAdmin(student.id).then(data => {
      setAssignments(data); setLoading(false)
    })
    fetchAllExercises().then(setAllExercises)
  }, [student.id])

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!assignExId) { setAssignError('Please select an exercise.'); return }
    setAssignSaving(true); setAssignError(null)
    const ok = await assignExercise({ exerciseId: assignExId, studentId: student.id, assignedBy: adminUserId, mode: assignMode, note: assignNote || null })
    setAssignSaving(false)
    if (!ok) { setAssignError('Something went wrong. Please try again.'); return }
    const ex = allExercises.find(e => e.id === assignExId)
    if (student?.email && ex?.title) {
      fetch('/api/send-exercise-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: student.email, name: student.name, exerciseTitle: ex.title, mode: assignMode }),
      }).catch(err => console.error('[send-exercise-email]', err))
    }
    fetchStudentAssignmentsAdmin(student.id).then(setAssignments)
    setShowAssign(false); setAssignExId(''); setAssignNote('')
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    const ok = await deleteAssignment(id)
    setDeletingId(null)
    setConfirmId(null)
    if (ok) setAssignments(prev => prev.filter(a => a.id !== id))
  }

  const completed = assignments.filter(a => a.status === 'submitted')
  const pending   = assignments.filter(a => a.status !== 'submitted')

  const renderRow = (a) => (
    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem', marginBottom: '0.4rem' }}>
      {confirmId === a.id ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', borderRadius: '6px', padding: '0.4rem 0.6rem' }}>
          <span style={{ flex: 1, fontSize: '0.85rem', color: '#b91c1c' }}>Delete "{a.exercises?.title}"?</span>
          <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem', color: '#b91c1c', borderColor: '#fca5a5' }}
            onClick={() => handleDelete(a.id)} disabled={deletingId === a.id}>
            {deletingId === a.id ? '…' : 'Yes, delete'}
          </button>
          <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem' }}
            onClick={() => setConfirmId(null)}>Cancel</button>
        </div>
      ) : (
        <>
          <button className="admin-student-row" style={{ flex: 1, border: 'none', borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }} onClick={() => onReview(a)}>
            <div className="admin-student-info">
              <strong>{a.exercises?.title}</strong>
              <span className="admin-student-email">
                {a.mode === 'homework' ? '🏠 Homework' : '🎓 In class'}
                {a.status === 'submitted'
                  ? ` · Completed ${new Date(a.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                  : ` · Assigned ${new Date(a.assigned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
              </span>
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, flexShrink: 0,
              color: a.status !== 'submitted' ? 'var(--text-muted)'
                : a.feedback_at ? '#16a34a' : '#b91c1c' }}>
              {a.status !== 'submitted' ? '⏳ Pending'
                : a.feedback_at ? '✓ Reviewed' : '📥 Review answers'}
            </span>
          </button>
          <button title="Remove assignment" onClick={() => setConfirmId(a.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', padding: '0.25rem', flexShrink: 0, lineHeight: 1 }}>
            🗑
          </button>
        </>
      )}
    </div>
  )

  return (
    <div className="admin-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
        <h3 style={{ margin: 0 }}>Exercises ({assignments.length})</h3>
        <button className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.2rem 0.65rem', marginLeft: 'auto' }}
          onClick={() => { setShowAssign(p => !p); setAssignError(null) }}>
          {showAssign ? '✕ Cancel' : '+ Assign exercise'}
        </button>
      </div>

      {showAssign && (
        <form onSubmit={handleAssign} style={{ background: 'var(--bg-darker)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: '180px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Exercise</label>
              <select value={assignExId} onChange={e => setAssignExId(e.target.value)} style={{ width: '100%' }}>
                <option value="">— Select exercise —</option>
                {allExercises.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Mode</label>
              <select value={assignMode} onChange={e => setAssignMode(e.target.value)} style={{ width: '100%' }}>
                <option value="homework">🏠 Homework</option>
                <option value="class">🎓 In class</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Note (optional)</label>
            <input type="text" value={assignNote} onChange={e => setAssignNote(e.target.value)}
              placeholder="Any instructions for the student…"
              style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.85rem' }} />
          </div>
          {assignError && <div className="auth-error">{assignError}</div>}
          <button className="btn-gold" type="submit" disabled={assignSaving} style={{ alignSelf: 'flex-end', padding: '0.4rem 1.1rem', fontSize: '0.85rem' }}>
            {assignSaving ? 'Assigning…' : 'Assign →'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="dashboard-loading" style={{ padding: '0.5rem 0' }}>Loading…</div>
      ) : assignments.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No exercises assigned to this student yet.</p>
      ) : (
        <div style={{ marginTop: '0.5rem' }}>
          {completed.map(renderRow)}
          {pending.map(renderRow)}
        </div>
      )}
    </div>
  )
}

// ─── AdminStudentPlanView ─────────────────────────────────────
// Teacher view: all stages fully expanded inline — no navigate-away.
// Student view: compact progress list mirroring what the student sees.
export function AdminStudentPlanView({ plan, studentId, studentName, onBack, adminUserId = null, adminEmail = null }) {
  const [viewMode,          setViewMode]          = useState('teacher') // 'teacher' | 'student'
  const [planAssignments,   setPlanAssignments]   = useState([])
  const [viewingSubmission, setViewingSubmission] = useState(null) // { assignment, questions, answerMap }
  const [loadingViewId,     setLoadingViewId]     = useState(null)
  const [exerciseCache,     setExerciseCache]     = useState({})   // exerciseId → full exercise obj with questions
  const [loadingExercises,  setLoadingExercises]  = useState(false)
  const [demoAnswers,       setDemoAnswers]       = useState({})   // exerciseId → { qId → answer }

  // Fetch full exercise data (with questions) for all stages
  useEffect(() => {
    const ids = [...new Set(
      (plan.lesson_stages ?? []).map(s => s.exercises?.id || s.exercise_id).filter(Boolean)
    )]
    if (!ids.length) return
    setLoadingExercises(true)
    Promise.all(ids.map(id => fetchExerciseWithQuestions(id))).then(results => {
      const cache = {}
      results.forEach(ex => { if (ex) cache[ex.id] = ex })
      setExerciseCache(cache)
      setLoadingExercises(false)
    })
  }, [plan.id])

  // Fetch student progress
  useEffect(() => {
    if (!studentId) return
    const exerciseIds = (plan.lesson_stages ?? []).map(s => s.exercise_id).filter(Boolean)
    fetchStudentPlanAssignments(studentId, plan.id, exerciseIds).then(setPlanAssignments)
  }, [plan.id, studentId])

  const setDemoAnswer = (exerciseId, qId, val) =>
    setDemoAnswers(prev => ({ ...prev, [exerciseId]: { ...(prev[exerciseId] || {}), [qId]: val } }))

  const openSubmission = async (exerciseId) => {
    const asgn = planAssignments.find(a => (a.exercises?.id === exerciseId || a.exercise_id === exerciseId) && a.status === 'submitted')
    if (!asgn) return
    setLoadingViewId(exerciseId)
    const [qs, ans] = await Promise.all([
      fetchQuestionsForReview(exerciseId),
      fetchMyAnswersForAssignment(asgn.id),
    ])
    setLoadingViewId(null)
    const answerMap = Object.fromEntries(ans.map(sa => [sa.question_id, sa]))
    setViewingSubmission({ assignment: { ...asgn, exercises: asgn.exercises || { id: exerciseId, title: '' } }, questions: qs, answerMap })
  }

  const typeLabel = (t) =>
    t === 'multiple_choice' ? 'Multiple choice'
    : t === 'fill_blank'    ? 'Fill in the blank'
    : t === 'true_false'    ? 'True / False'
    : t === 'matching'      ? 'Matching'
    : t === 'word_choice'   ? 'Word choice'
    : t === 'listening'     ? 'Listening'
    : t === 'viewing'       ? 'Viewing'
    : t === 'speaking'      ? 'Speaking'
    : 'Written answer'

  // Render all exercise content inline (teacher view)
  const renderInlineExercise = (exerciseId) => {
    if (loadingExercises) {
      return <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', margin: '0.5rem 0 0' }}>Loading exercise…</p>
    }
    const cached = exerciseCache[exerciseId]
    if (!cached) return null
    const questions = cached.questions ?? []
    const answers   = demoAnswers[exerciseId] || {}
    const setAns    = (qId, val) => setDemoAnswer(exerciseId, qId, val)
    const hasInteractive = questions.some(q => !['listening','viewing','speaking'].includes(q.type))

    return (
      <div style={{ marginTop: '0.75rem', borderTop: '1px dashed #e8e3d8', paddingTop: '0.75rem' }}>
        {cached.description && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>{cached.description}</p>
        )}
        {cached.audio_url && (
          <div style={{ marginBottom: '0.5rem' }}>
            <EmbeddedMedia url={cached.audio_url} label="🎧 Listen" />
          </div>
        )}
        {cached.context_text && (
          <div className="exercise-context-text" style={{ marginBottom: '0.5rem' }}>
            <p className="exercise-context-label">📖 Read this first</p>
            <div className="exercise-context-passage">{cached.context_text}</div>
          </div>
        )}
        {cached.context_images?.length > 0 && !(
          questions.length > 0 && questions[0].type === 'fill_blank' && parseOverlayPrompt(questions[0].prompt)
        ) && (
          <div className="exercise-context-images" style={{ marginBottom: '0.5rem' }}>
            {cached.context_images.map((src, i) => (
              <img key={i} src={src} alt={`Ref ${i + 1}`} className="exercise-context-img" style={{ maxWidth: '100%' }} />
            ))}
          </div>
        )}
        {questions.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>No questions.</p>
        )}
        <div className="exercise-questions" style={{ marginTop: '0.25rem' }}>
          {questions.map((q, idx) => {
            if (q.type === 'listening' || q.type === 'viewing' || q.type === 'speaking') {
              return (
                <div key={q.id} style={{ padding: '0.35rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {q.type === 'listening' ? '🎧 Listening' : q.type === 'viewing' ? '🎥 Viewing' : '🎙️ Speaking'} activity
                </div>
              )
            }
            if (q.type === 'fill_blank') {
              const overlay = parseOverlayPrompt(q.prompt)
              return (
                <div key={q.id} className="exercise-fill-block">
                  {q.hint && <p className="eq-hint" style={{ marginBottom: '0.4rem' }}>💡 {q.hint}</p>}
                  {overlay && cached.context_images?.[0] ? (
                    <ImageOverlayFill src={cached.context_images[0]} blanks={overlay.blanks} words={overlay.words || null}
                      answers={answers[q.id] || null} onChange={val => setAns(q.id, val)} />
                  ) : (
                    <InlineFillBlank prompt={q.prompt} answer={answers[q.id] || null} onChange={val => setAns(q.id, val)} />
                  )}
                </div>
              )
            }
            return (
              <div key={q.id} className="exercise-question">
                <div className="eq-label">
                  <span className="eq-num">Q{idx + 1}</span>
                  <span className="eq-type">{typeLabel(q.type)}</span>
                </div>
                {q.type !== 'word_choice' && q.type !== 'fill_blank' && (
                  <p className="eq-prompt" dangerouslySetInnerHTML={{ __html: q.prompt }} />
                )}
                {q.hint && <p className="eq-hint">Hint: {q.hint}</p>}
                {q.type === 'multiple_choice' && (
                  <div className="options-list">
                    {(q.options || []).map(opt => (
                      <button key={opt} className={`option-btn ${answers[q.id] === opt ? 'selected' : ''}`}
                        onClick={() => setAns(q.id, opt)}>{opt}</button>
                    ))}
                  </div>
                )}
                {q.type === 'true_false' && (
                  <div className="options-list" style={{ flexDirection: 'row', gap: '0.75rem' }}>
                    {['True', 'False'].map(opt => (
                      <button key={opt} className={`option-btn ${answers[q.id] === opt ? 'selected' : ''}`}
                        style={{ flex: 1, textAlign: 'center' }}
                        onClick={() => setAns(q.id, opt)}>
                        {opt === 'True' ? '✓ True' : '✗ False'}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === 'matching' && (
                  <MatchingQuestion pairs={q.options || []} answer={answers[q.id] || null}
                    onChange={val => setAns(q.id, val)} />
                )}
                {q.type === 'free_text' && (
                  <textarea className="writing-input" rows={3}
                    placeholder={q.hint || 'Write answer here…'}
                    value={answers[q.id] || ''} onChange={e => setAns(q.id, e.target.value)} />
                )}
                {q.type === 'word_choice' && (
                  <WordChoiceQuestion template={q.prompt} answer={answers[q.id] || null}
                    onChange={val => setAns(q.id, val)} />
                )}
              </div>
            )
          })}
        </div>
        {hasInteractive && (
          <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem', marginTop: '0.25rem' }}
            onClick={() => setDemoAnswers(prev => ({ ...prev, [exerciseId]: {} }))}>
            ↺ Reset answers
          </button>
        )}
      </div>
    )
  }

  if (viewingSubmission) {
    return (
      <StudentSubmissionReview
        assignment={viewingSubmission.assignment}
        questions={viewingSubmission.questions ?? []}
        answerMap={viewingSubmission.answerMap}
        onBack={() => setViewingSubmission(null)}
        backLabel="← Back to lesson plan"
      />
    )
  }

  const allStages = (plan.lesson_stages ?? [])
    .slice()
    .sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0) || a.order_index - b.order_index)
  const lessonStages   = allStages.filter(s => (s.section ?? 'lesson') !== 'homework')
  const homeworkStages = allStages.filter(s => s.section === 'homework')
  const stageGroups    = lessonStages.reduce((acc, s) => {
    const num = s.stage_number ?? 1
    if (!acc[num]) acc[num] = { number: num, name: s.stage_name, items: [] }
    acc[num].items.push(s)
    return acc
  }, {})

  const exerciseStages = allStages.filter(s => s.exercises)
  const doneCount = exerciseStages.filter(s => {
    const ex = s.exercises
    return planAssignments.some(a => (a.exercises?.id === ex.id || a.exercise_id === ex.id) && a.status === 'submitted')
  }).length
  const totalCount = exerciseStages.length

  const PLAN_STAGE_COLORS = {
    controlled_exercise: '#3b82f6', free_exercise: '#059669',
    lead_in: '#d97706', feedback: '#7c3aed', instruction: '#64748b', clarification: '#dc2626',
  }

  const renderAdminStageItem = (stage, isHomework = false) => {
    const ex     = stage.exercises
    const exId   = ex?.id || stage.exercise_id
    const asgn   = exId ? planAssignments.find(a => a.exercises?.id === exId || a.exercise_id === exId) : null
    const isDone = asgn?.status === 'submitted'
    const def    = STAGE_TYPES.find(t => t.value === stage.stage_type) || { icon: '▸', label: stage.stage_type || 'Activity' }
    const color  = PLAN_STAGE_COLORS[stage.stage_type] || '#94a3b8'

    if (viewMode === 'teacher') {
      return (
        <div key={stage.id} style={{
          padding: '0.85rem 1rem',
          background: isDone ? '#f0fdf4' : (isHomework ? '#fafaf8' : '#fff'),
          borderRadius: '12px',
          border: `1px solid ${isDone ? '#bbf7d0' : '#e8e3d8'}`,
          borderLeft: `4px solid ${color}`,
          marginBottom: '0.65rem',
        }}>
          {/* Stage header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{def.icon}</span>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: isDone ? '#15803d' : 'var(--text)', flex: 1 }}>
              {ex?.title || stage.title || def.label}
            </span>
            {isDone && (
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', flexShrink: 0 }}>✓ Done</span>
            )}
          </div>
          {/* Chips row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
            <span style={{ fontSize: '0.7rem', color, fontWeight: 600, background: `${color}18`, padding: '0.1rem 0.42rem', borderRadius: '20px' }}>
              {def.label}
            </span>
            {stage.duration_minutes && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>⏱ {stage.duration_minutes} min</span>
            )}
            {isDone && asgn?.submitted_at && (
              <span style={{ fontSize: '0.72rem', color: '#16a34a' }}>
                Submitted {new Date(asgn.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          {/* Teacher notes */}
          {stage.teacher_notes && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#78350f', background: '#fffbeb', borderRadius: '6px', padding: '0.35rem 0.6rem', borderLeft: '3px solid #fbbf24' }}
              dangerouslySetInnerHTML={{ __html: '🔒 ' + stage.teacher_notes }} />
          )}
          {/* Inline exercise content */}
          {exId && renderInlineExercise(exId)}
          {/* View student answers button (if completed) */}
          {isDone && exId && (
            <div style={{ marginTop: '0.6rem', borderTop: '1px solid #d1fae5', paddingTop: '0.5rem' }}>
              <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.22rem 0.6rem' }}
                onClick={() => openSubmission(exId)}
                disabled={loadingViewId === exId}>
                {loadingViewId === exId ? '…' : '👁 View student answers'}
              </button>
            </div>
          )}
        </div>
      )
    }

    // Student view — compact progress row
    return (
      <div key={stage.id} style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.7rem',
        padding: '0.65rem 0.85rem',
        background: isDone ? '#f0fdf4' : (isHomework ? '#fafaf8' : '#fff'),
        borderRadius: '10px',
        border: `1px solid ${isDone ? '#bbf7d0' : '#e8e3d8'}`,
        borderLeft: `4px solid ${color}`,
        marginBottom: '0.45rem',
      }}>
        <span style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1, marginTop: '0.1rem' }}>{def.icon}</span>
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
            {isDone && asgn?.submitted_at && (
              <span style={{ fontSize: '0.72rem', color: '#16a34a' }}>
                Submitted {new Date(asgn.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>
        {isDone ? (
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', flexShrink: 0 }}>✓ Done</span>
        ) : exId ? (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0, fontStyle: 'italic' }}>Not started</span>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flow-card dashboard-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.2rem 1.25rem 0.9rem', borderBottom: '1px solid #f0ede6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <button className="back-btn" onClick={onBack} style={{ margin: 0 }}>← Back to student</button>
          <div style={{ display: 'flex', gap: '0.35rem', marginLeft: 'auto' }}>
            <button className="btn-ghost"
              style={{ fontSize: '0.82rem', padding: '0.3rem 0.65rem', ...(viewMode === 'teacher' ? { background: 'var(--gold)', color: '#fff', borderColor: 'var(--gold)' } : {}) }}
              onClick={() => setViewMode('teacher')}>👨‍🏫 Teacher</button>
            <button className="btn-ghost"
              style={{ fontSize: '0.82rem', padding: '0.3rem 0.65rem', ...(viewMode === 'student' ? { background: 'var(--gold)', color: '#fff', borderColor: 'var(--gold)' } : {}) }}
              onClick={() => setViewMode('student')}>👤 Student</button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.3 }}>{plan.title}</h2>
          {studentName && (
            <span className="admin-level-chip" style={{ fontSize: '0.78rem' }}>👤 {studentName}</span>
          )}
        </div>
        {plan.description && (
          <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.87rem', lineHeight: 1.5 }}>{plan.description}</p>
        )}
        {totalCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.6rem' }}>
            <div style={{ flex: 1, height: '6px', background: '#e8e3d8', borderRadius: '9px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '9px', transition: 'width 0.4s ease',
                background: doneCount === totalCount ? '#22c55e' : 'var(--gold)',
                width: `${(doneCount / totalCount) * 100}%` }} />
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0, fontWeight: 600 }}>
              {doneCount}/{totalCount} done
            </span>
          </div>
        )}
        {totalCount === 0 && !studentId && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.4rem 0 0' }}>
            Manual student — no progress tracking available
          </p>
        )}
      </div>

      {/* Teacher metadata — only in teacher view */}
      {viewMode === 'teacher' && (plan.lesson_aim || plan.teaching_point || plan.language_analysis) && (
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #f0ede6', background: '#FFFBF0' }}>
          {plan.lesson_aim && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.82rem' }}>🎯 Lesson aim</strong>
              <div style={{ margin: '0.15rem 0 0', fontSize: '0.85rem' }} dangerouslySetInnerHTML={{ __html: plan.lesson_aim }} />
            </div>
          )}
          {plan.teaching_point && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.82rem' }}>✏️ Teaching point</strong>
              <div style={{ margin: '0.15rem 0 0', fontSize: '0.85rem' }} dangerouslySetInnerHTML={{ __html: plan.teaching_point }} />
            </div>
          )}
          {plan.language_analysis && (
            <div>
              <strong style={{ fontSize: '0.82rem' }}>🔬 Language analysis</strong>
              <div style={{ margin: '0.15rem 0 0', fontSize: '0.85rem' }} dangerouslySetInnerHTML={{ __html: plan.language_analysis }} />
            </div>
          )}
        </div>
      )}

      {/* Lesson stages */}
      <div style={{ padding: '0.9rem 1.25rem' }}>
        {Object.values(stageGroups).length > 0 ? (
          Object.values(stageGroups).map(group => (
            <div key={group.number} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.6rem' }}>
                <div style={{ background: 'var(--gold)', color: '#fff', borderRadius: '50%',
                  width: '22px', height: '22px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                  {group.number}
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {group.name || `Stage ${group.number}`}
                </span>
              </div>
              {group.items.map(s => renderAdminStageItem(s))}
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No lesson stages yet.</p>
        )}
      </div>

      {/* Homework */}
      {homeworkStages.length > 0 && (
        <div style={{ borderTop: '1px solid #f0ede6', padding: '0.75rem 1.25rem 0.9rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
            📚 Homework
          </div>
          {homeworkStages.map(s => renderAdminStageItem(s, true))}
        </div>
      )}
    </div>
  )
}

// ─── AdminStudentLessons ──────────────────────────────────────
export function AdminStudentLessons({ student, adminUserId, isManual = false, onOpenPlan = null }) {
  const [lessons,     setLessons]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [adding,      setAdding]      = useState(false)
  const [newLessonNo,   setNewLessonNo]   = useState('')
  const [newTitle,      setNewTitle]      = useState('')
  const [newDate,       setNewDate]       = useState('')
  const [newDuration,   setNewDuration]   = useState('')
  const [saving,        setSaving]        = useState(false)
  const [editingNotesId,      setEditingNotesId]      = useState(null)
  const [editTeacherNotes,    setEditTeacherNotes]    = useState('')
  const [editPublicNotes,     setEditPublicNotes]     = useState('')
  const [notesSaving,         setNotesSaving]         = useState(false)
  const [confirmDeleteId,     setConfirmDeleteId]     = useState(null)
  const [deletingLessonId,    setDeletingLessonId]    = useState(null)
  const [uploadingId,         setUploadingId]         = useState(null)
  const [allPlans,            setAllPlans]            = useState([])
  const [openingPlanId,       setOpeningPlanId]       = useState(null)

  useEffect(() => {
    Promise.all([
      fetchStudentLessonsAdmin(student.id),
      fetchAllLessonPlans(),
    ]).then(([data, plans]) => {
      setLessons(data)
      setAllPlans(plans)
      setLoading(false)
    })
  }, [student.id])

  const handleAdd = async () => {
    setSaving(true)
    const scheduledIso = newDate ? new Date(newDate).toISOString() : null
    const id = await createLesson({
      studentId:       student.id,
      lessonNo:        newLessonNo ? parseInt(newLessonNo) : null,
      title:           newTitle   || null,
      scheduledAt:     scheduledIso,
      createdBy:       adminUserId,
      durationMinutes: newDuration ? parseInt(newDuration) : null,
    })
    setSaving(false)
    if (id) {
      const newL = {
        id, student_id: student.id,
        lesson_no: newLessonNo ? parseInt(newLessonNo) : null,
        title: newTitle || null, scheduled_at: scheduledIso,
        status: 'scheduled', teacher_notes: null,
        notes_visible: false, student_feedback: null,
        completed_at: null, created_at: new Date().toISOString(),
      }
      setLessons(prev => [...prev, newL].sort((a, b) => (a.lesson_no ?? 999) - (b.lesson_no ?? 999)))
      setAdding(false); setNewLessonNo(''); setNewTitle(''); setNewDate(''); setNewDuration('')
    }
  }

  const handleUpdate = async (lessonId, updates) => {
    const ok = await updateLesson(lessonId, updates)
    if (ok) setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, ...updates } : l))
    return ok
  }

  const handleDeleteLesson = async (id) => {
    setDeletingLessonId(id)
    const ok = await deleteLesson(id)
    setDeletingLessonId(null)
    setConfirmDeleteId(null)
    if (ok) setLessons(prev => prev.filter(l => l.id !== id))
  }

  const handleSaveNotes = async (lessonId) => {
    setNotesSaving(true)
    const ok = await updateLessonNotes(lessonId, {
      teacherNotes:       editTeacherNotes || null,
      teacherNotesPublic: editPublicNotes  || null,
    })
    setNotesSaving(false)
    if (ok) {
      setLessons(prev => prev.map(l => l.id === lessonId
        ? { ...l, teacher_notes: editTeacherNotes || null, teacher_notes_public: editPublicNotes || null }
        : l))
      setEditingNotesId(null)
    }
  }

  const handleUploadWhiteboard = async (lessonId, file) => {
    setUploadingId(lessonId)
    const url = await uploadLessonWhiteboard(lessonId, file)
    setUploadingId(null)
    if (url) {
      setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, whiteboard_pdf_url: url, whiteboard_pdf_name: file.name } : l))
    }
  }

  return (
    <div className="admin-section">
      <div className="admin-lessons-header">
        <h3>Lessons ({lessons.length})</h3>
        <button className="btn-ghost" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
          onClick={() => setAdding(a => !a)}>{adding ? 'Cancel' : '+ Add lesson'}</button>
      </div>

      {adding && (
        <div className="admin-add-lesson-form">
          <div className="admin-lesson-edit-grid">
            <div className="form-field">
              <label>Lesson #</label>
              <input type="number" min="1" style={{ width: 80 }}
                placeholder="1" value={newLessonNo} onChange={e => setNewLessonNo(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Title <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input type="text" placeholder="e.g. Present Simple"
                value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Date &amp; time <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Duration <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <select value={newDuration} onChange={e => setNewDuration(e.target.value)}>
                <option value="">Not set</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
              </select>
            </div>
          </div>
          <button className="btn-gold" style={{ marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            onClick={handleAdd} disabled={saving}>{saving ? 'Adding…' : 'Add lesson'}</button>
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading" style={{ padding: '0.5rem 0' }}>Loading lessons…</div>
      ) : lessons.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No lessons yet — click "+ Add lesson" to create the first one.</p>
      ) : (
        <div className="admin-lesson-list">
          {lessons.map(l => (
            <div key={l.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <AdminLessonRow lesson={l} onUpdate={handleUpdate}
                    onOpenLesson={l.lesson_plan_id && onOpenPlan ? async () => {
                      setOpeningPlanId(l.lesson_plan_id)
                      const { data } = await supabase
                        .from('lesson_plans')
                        .select(`id, title, description, scheduled_at, english_level, lesson_level, lesson_aim, teaching_point, language_analysis, created_at,
                          lesson_stages ( id, order_index, stage_number, stage_name, stage_type, title, duration_minutes, exercise_id, content_text, audio_url, content_images, section, teacher_notes,
                            exercises ( id, title, description, audio_url, context_text, context_images, course ) )`)
                        .eq('id', l.lesson_plan_id)
                        .single()
                      setOpeningPlanId(null)
                      if (data && onOpenPlan) onOpenPlan(data)
                    } : null}
                  />
                </div>
                {confirmDeleteId === l.id ? (
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', background: '#fef2f2', borderRadius: '6px', padding: '0.3rem 0.55rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.78rem', color: '#b91c1c' }}>Delete?</span>
                    <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem', color: '#b91c1c', borderColor: '#fca5a5' }}
                      onClick={() => handleDeleteLesson(l.id)} disabled={deletingLessonId === l.id}>
                      {deletingLessonId === l.id ? '…' : 'Yes'}
                    </button>
                    <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem' }}
                      onClick={() => setConfirmDeleteId(null)}>No</button>
                  </div>
                ) : (
                  <button title="Delete lesson" onClick={() => setConfirmDeleteId(l.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', padding: '0.25rem', lineHeight: 1, flexShrink: 0 }}>
                    🗑
                  </button>
                )}
              </div>
              {editingNotesId === l.id ? (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="form-field">
                    <label style={{ fontSize: '0.8rem' }}>Private notes (admin only)</label>
                    <RichTextEditor value={editTeacherNotes} onChange={v => setEditTeacherNotes(v)}
                      placeholder="Your private notes about this lesson…" minHeight="60px" />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: '0.8rem' }}>Note for student <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(visible on their dashboard)</span></label>
                    <RichTextEditor value={editPublicNotes} onChange={v => setEditPublicNotes(v)}
                      placeholder="e.g. Great work on conditionals today. Review pronunciation for next time." minHeight="60px" />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-gold" style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => handleSaveNotes(l.id)} disabled={notesSaving}>
                      {notesSaving ? 'Saving…' : 'Save notes'}
                    </button>
                    <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => setEditingNotesId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', marginTop: '0.5rem' }}
                  onClick={() => {
                    setEditingNotesId(l.id)
                    setEditTeacherNotes(l.teacher_notes || '')
                    setEditPublicNotes(l.teacher_notes_public || '')
                  }}>
                  📝 {l.teacher_notes || l.teacher_notes_public ? 'Edit notes' : 'Add notes'}
                </button>
              )}
              {/* Whiteboard PDF */}
              <div style={{marginTop:'0.5rem',display:'flex',alignItems:'center',gap:'0.5rem',flexWrap:'wrap'}}>
                <span style={{fontSize:'0.78rem',fontWeight:600,color:'var(--text-muted)'}}>📄 Whiteboard PDF:</span>
                {l.whiteboard_pdf_url ? (
                  <>
                    <a href={l.whiteboard_pdf_url} target="_blank" rel="noreferrer"
                      style={{fontSize:'0.82rem',color:'var(--gold)',textDecoration:'underline'}}>
                      {l.whiteboard_pdf_name || 'View PDF'}
                    </a>
                    <span style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>·</span>
                  </>
                ) : (
                  <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>None uploaded</span>
                )}
                <label style={{cursor:'pointer'}}>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{display:'none'}}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadWhiteboard(l.id, f) }} />
                  <span className="btn-ghost" style={{fontSize:'0.78rem',padding:'0.2rem 0.55rem',cursor:'pointer',display:'inline-block'}}>
                    {uploadingId === l.id ? 'Uploading…' : l.whiteboard_pdf_url ? '↑ Replace' : '↑ Upload'}
                  </span>
                </label>
              </div>
              {/* Link lesson plan */}
              <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>📋 Plan:</span>
                {l.lesson_plan_id ? (
                  <>
                    <span style={{ fontSize: '0.82rem', color: 'var(--gold)', fontWeight: 500 }}>
                      {allPlans.find(p => p.id === l.lesson_plan_id)?.title || (l.lesson_plans?.title) || 'Linked'}
                    </span>
                    <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem' }}
                      onClick={async () => {
                        const ok = await updateLessonPlanLink(l.id, null)
                        if (ok) setLessons(prev => prev.map(x => x.id === l.id ? { ...x, lesson_plan_id: null } : x))
                      }}>
                      Unlink
                    </button>
                  </>
                ) : (
                  <select style={{ fontSize: '0.8rem', padding: '0.2rem 0.4rem', borderRadius: '5px', border: '1px solid var(--border)' }}
                    value="" onChange={async (e) => {
                      const planId = e.target.value
                      if (!planId) return
                      const ok = await updateLessonPlanLink(l.id, planId)
                      if (ok) {
                        setLessons(prev => prev.map(x => x.id === l.id ? { ...x, lesson_plan_id: planId } : x))
                        // Auto-create exercise assignments so student can track progress without separate assign step
                        if (!isManual && student.id && adminUserId) {
                          try {
                            await assignLessonPlan({ planId, studentId: student.id, assignedBy: adminUserId, mode: 'in_class', note: null, scheduledAt: l.scheduled_at || null, skipLessonCreation: true })
                          } catch (err) {
                            console.warn('[AdminStudentLessons] auto-assign failed:', err)
                          }
                        }
                      }
                    }}>
                    <option value="">— Link a plan —</option>
                    {allPlans.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── AdminBooks ───────────────────────────────────────────────
export function AdminBooks({ adminUserId }) {
  const [books,        setBooks]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [newTitle,     setNewTitle]     = useState('')
  const [saving,       setSaving]       = useState(false)
  const [editingId,    setEditingId]    = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editSaving,   setEditSaving]   = useState(false)
  const [deletingId,   setDeletingId]   = useState(null)

  useEffect(() => {
    fetchAllBooks().then(bks => { setBooks(bks); setLoading(false) })
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)
    const bk = await createBook(newTitle.trim(), adminUserId)
    setSaving(false)
    if (bk) { setBooks(p => [...p, bk].sort((a, b) => a.title.localeCompare(b.title))); setNewTitle('') }
  }

  const startEdit = (bk) => { setEditingId(bk.id); setEditingTitle(bk.title) }

  const handleEdit = async (id) => {
    if (!editingTitle.trim()) return
    setEditSaving(true)
    const bk = await updateBook(id, editingTitle.trim())
    setEditSaving(false)
    if (bk) {
      setBooks(p => p.map(b => b.id === id ? bk : b).sort((a, b) => a.title.localeCompare(b.title)))
      setEditingId(null); setEditingTitle('')
    }
  }

  const handleDelete = async (id) => {
    const ok = await deleteBook(id)
    if (ok) { setBooks(p => p.filter(b => b.id !== id)); setDeletingId(null) }
  }

  return (
    <div>
      <div className="admin-exercises-toolbar">
        <h3 style={{ margin: 0 }}>Books ({books.length})</h3>
      </div>

      <form onSubmit={handleCreate} style={{
        display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
        padding: '0.75rem 1rem', background: 'var(--bg-card)',
        borderRadius: '8px', border: '1px solid var(--border)',
      }}>
        <input type="text" placeholder="New book title…" value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.9rem', color: 'var(--text)' }} />
        <button type="submit" className="btn-gold" disabled={saving || !newTitle.trim()}>
          {saving ? 'Adding…' : '+ Add book'}
        </button>
      </form>

      {loading ? <div className="dashboard-loading">Loading…</div> : books.length === 0 ? (
        <div className="dashboard-empty">
          <p>No books yet. Add your first textbook above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {books.map(bk => (
            <div key={bk.id} className="admin-student-row"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {editingId === bk.id ? (
                <>
                  <input type="text" value={editingTitle} autoFocus
                    onChange={e => setEditingTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleEdit(bk.id)
                      if (e.key === 'Escape') { setEditingId(null); setEditingTitle('') }
                    }}
                    style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.9rem', color: 'var(--text)' }} />
                  <button className="btn-gold" style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => handleEdit(bk.id)} disabled={editSaving || !editingTitle.trim()}>
                    {editSaving ? '…' : 'Save'}
                  </button>
                  <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => { setEditingId(null); setEditingTitle('') }}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontWeight: 500 }}>📚 {bk.title}</span>
                  <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => startEdit(bk)}>Rename</button>
                  {deletingId === bk.id ? (
                    <>
                      <button className="btn-ghost"
                        style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', color: '#e05c5c', borderColor: '#e05c5c' }}
                        onClick={() => handleDelete(bk.id)}>Confirm delete</button>
                      <button className="btn-ghost"
                        style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => setDeletingId(null)}>Cancel</button>
                    </>
                  ) : (
                    <button className="btn-ghost"
                      style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', color: '#e05c5c' }}
                      onClick={() => setDeletingId(bk.id)}>Delete</button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── AdminExerciseLibrary ─────────────────────────────────────

export const EX_TYPES = [
  { value: 'multiple_choice',    label: 'Multiple Choice',               emoji: '🔘' },
  { value: 'fill_blank',         label: 'Fill in the Blanks (Typed)',     emoji: '✍️' },
  { value: 'fill_blank_dropdown',label: 'Fill in the Blanks (Word Bank)', emoji: '📋' },
  { value: 'matching',           label: 'Match Words',                    emoji: '🔗' },
  { value: 'ordering',           label: 'Order Sentences / Words',        emoji: '🔢' },
  { value: 'true_false',         label: 'True or False',                  emoji: '✅' },
  { value: 'listening',          label: 'Listening',                      emoji: '🎧' },
  { value: 'speaking',           label: 'Speaking',                       emoji: '🎙️' },
]

export const TYPE_COLORS = {
  multiple_choice:    { bg: '#dbeafe', color: '#1d4ed8' },
  fill_blank:         { bg: '#fce7f3', color: '#9d174d' },
  fill_blank_dropdown:{ bg: '#ede9fe', color: '#6d28d9' },
  matching:           { bg: '#d1fae5', color: '#065f46' },
  ordering:           { bg: '#fef3c7', color: '#92400e' },
  true_false:         { bg: '#dcfce7', color: '#166534' },
  listening:          { bg: '#e0f2fe', color: '#075985' },
  speaking:           { bg: '#fef9c3', color: '#713f12' },
}

export function TypeBadge({ type }) {
  const meta  = EX_TYPES.find(t => t.value === type)
  const style = TYPE_COLORS[type] || { bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{
      display: 'inline-block', borderRadius: '0.9rem', padding: '0.18rem 0.65rem',
      fontSize: '0.78rem', fontWeight: 600,
      background: style.bg, color: style.color,
    }}>
      {meta ? `${meta.emoji} ${meta.label}` : type}
    </span>
  )
}

/* ── individual creation forms ────────────────────────────── */

export function ExFormMultipleChoice({ title, instructions, onChange }) {
  const [prompt,   setPrompt]   = useState('')
  const [options,  setOptions]  = useState(['', '', '', ''])
  const [correct,  setCorrect]  = useState(0)

  useEffect(() => {
    const q = { type: 'multiple_choice', prompt, options, correct_answer: String(correct) }
    onChange({ questions: [q] })
  }, [prompt, options, correct])

  const setOpt = (i, v) => setOptions(p => p.map((o, idx) => idx === i ? v : o))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div className="form-field">
        <label>Prompt / question</label>
        <RichTextEditor value={prompt} onChange={v => setPrompt(v)}
          placeholder="e.g. Which sentence uses the past perfect correctly?" minHeight="72px" />
      </div>
      <div className="form-field">
        <label>Options (select the correct one)</label>
        {['A', 'B', 'C', 'D'].map((letter, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <input type="radio" name="correct" checked={correct === i} onChange={() => setCorrect(i)}
              style={{ accentColor: '#006699', cursor: 'pointer', width: '16px', height: '16px' }} />
            <span style={{ fontWeight: 600, minWidth: '20px', color: 'var(--text-muted)' }}>{letter}</span>
            <input type="text" value={options[i]} onChange={e => setOpt(i, e.target.value)}
              placeholder={`Option ${letter}`}
              style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '6px', padding: '0.45rem 0.7rem', fontSize: '0.9rem', background: 'var(--bg-card)', color: 'var(--text)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ExFormFillBlank({ title, instructions, onChange, dropdown }) {
  const [text,     setText]     = useState('')
  const [wordBank, setWordBank] = useState('')

  useEffect(() => {
    const sentences = text.split('\n').filter(s => s.trim())
    const questions = sentences.map((s, i) => ({
      type: dropdown ? 'fill_blank_dropdown' : 'fill_blank',
      prompt: s.trim(),
      options: dropdown && wordBank ? wordBank.split(',').map(w => w.trim()).filter(Boolean) : null,
      correct_answer: null,
    }))
    onChange({ questions })
  }, [text, wordBank, dropdown])

  const preview = text.split('\n').filter(s => s.trim()).map((s, si) => {
    const parts = s.split('___')
    return (
      <div key={si} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
        {parts.map((p, pi) => (
          <span key={pi}>
            {p}
            {pi < parts.length - 1 && (
              dropdown
                ? <select style={{ margin: '0 0.15rem', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.1rem 0.3rem', background: 'var(--bg-card)', fontSize: '0.85rem' }}>
                    <option value="">Choose…</option>
                    {wordBank.split(',').map(w => w.trim()).filter(Boolean).map(w => <option key={w}>{w}</option>)}
                  </select>
                : <input type="text" placeholder="____" readOnly
                    style={{ width: '80px', margin: '0 0.15rem', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.1rem 0.3rem', background: '#fffef8', fontSize: '0.85rem' }} />
            )}
          </span>
        ))}
      </div>
    )
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div className="form-field">
        <label>Exercise text</label>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.4rem' }}>
          Use <code>___</code> (three underscores) to mark each blank. One sentence per line.
        </p>
        <textarea rows={6} value={text} onChange={e => setText(e.target.value)} className="writing-input"
          placeholder={"She ___ to the market yesterday.\nThey ___ studying when I called."} />
      </div>
      {dropdown && (
        <div className="form-field">
          <label>Word bank (comma-separated)</label>
          <input type="text" value={wordBank} onChange={e => setWordBank(e.target.value)}
            placeholder="went, was, are, had gone, were"
            style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.9rem', background: 'var(--bg-card)', color: 'var(--text)' }} />
        </div>
      )}
      {text.trim() && (
        <div style={{ background: '#fffef8', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.6rem' }}>Preview</p>
          {preview}
        </div>
      )}
    </div>
  )
}

export function ExFormMatching({ onChange }) {
  const [pairs, setPairs] = useState([{ left: '', right: '' }])

  useEffect(() => {
    const validPairs = pairs.filter(p => p.left.trim() && p.right.trim())
    const q = {
      type: 'matching',
      prompt: 'Match each item on the left with its pair on the right.',
      options: validPairs,
      correct_answer: JSON.stringify(Object.fromEntries(validPairs.map(p => [p.left, p.right]))),
    }
    onChange({ questions: validPairs.length ? [q] : [] })
  }, [pairs])

  const setPair = (i, side, v) => setPairs(p => p.map((pr, idx) => idx === i ? { ...pr, [side]: v } : pr))
  const addPair   = () => setPairs(p => [...p, { left: '', right: '' }])
  const removePair = (i) => setPairs(p => p.filter((_, idx) => idx !== i))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div className="form-field" style={{ marginBottom: 0 }}>
        <label>Pairs</label>
      </div>
      {pairs.map((pr, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="text" value={pr.left}  onChange={e => setPair(i, 'left',  e.target.value)}
            placeholder="Left side"
            style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '6px', padding: '0.45rem 0.7rem', fontSize: '0.9rem', background: 'var(--bg-card)', color: 'var(--text)' }} />
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>↔</span>
          <input type="text" value={pr.right} onChange={e => setPair(i, 'right', e.target.value)}
            placeholder="Right side"
            style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '6px', padding: '0.45rem 0.7rem', fontSize: '0.9rem', background: 'var(--bg-card)', color: 'var(--text)' }} />
          {pairs.length > 1 && (
            <button onClick={() => removePair(i)} className="btn-ghost"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem', color: '#e05c5c' }}>✕</button>
          )}
        </div>
      ))}
      <button onClick={addPair} className="btn-ghost"
        style={{ alignSelf: 'flex-start', fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}>
        + Add pair
      </button>
    </div>
  )
}

export function ExFormOrdering({ onChange }) {
  const [mode,     setMode]     = useState('sentences') // 'sentences' | 'words'
  const [text,     setText]     = useState('')

  useEffect(() => {
    if (!text.trim()) { onChange({ questions: [] }); return }
    let items
    if (mode === 'words') {
      items = text.trim().split(/\s+/).filter(Boolean)
    } else {
      items = text.trim().split('\n').map(s => s.trim()).filter(Boolean)
    }
    const shuffled = [...items].sort(() => 0.5 - Math.random())
    const q = {
      type: 'ordering',
      prompt: mode === 'words' ? 'Put the words in the correct order.' : 'Put the sentences in the correct order.',
      options: shuffled,
      correct_answer: JSON.stringify(items),
    }
    onChange({ questions: [q] })
  }, [text, mode])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div className="form-field">
        <label>Mode</label>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {[['sentences', 'Order sentences (one per line)'], ['words', 'Order words in one sentence']].map(([v, lbl]) => (
            <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="radio" name="order-mode" value={v} checked={mode === v} onChange={() => setMode(v)}
                style={{ accentColor: '#006699' }} />
              {lbl}
            </label>
          ))}
        </div>
      </div>
      <div className="form-field">
        <label>{mode === 'words' ? 'Sentence (correct order)' : 'Sentences in correct order (one per line)'}</label>
        <textarea rows={mode === 'words' ? 2 : 5} value={text} onChange={e => setText(e.target.value)}
          className="writing-input"
          placeholder={mode === 'words' ? 'She had already left when I arrived.' : 'First, boil the water.\nThen add the pasta.\nFinally, drain and serve.'} />
      </div>
    </div>
  )
}

export function ExFormTrueFalse({ onChange }) {
  const [statements, setStatements] = useState([{ text: '', answer: 'true' }])

  useEffect(() => {
    const valid = statements.filter(s => s.text.trim())
    const questions = valid.map(s => ({
      type: 'true_false',
      prompt: s.text.trim(),
      options: ['True', 'False'],
      correct_answer: s.answer,
    }))
    onChange({ questions })
  }, [statements])

  const setStmt = (i, field, v) => setStatements(p => p.map((s, idx) => idx === i ? { ...s, [field]: v } : s))
  const addStmt    = () => setStatements(p => [...p, { text: '', answer: 'true' }])
  const removeStmt = (i) => setStatements(p => p.filter((_, idx) => idx !== i))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div className="form-field" style={{ marginBottom: 0 }}>
        <label>Statements</label>
      </div>
      {statements.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: '#fffef8', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
          <span style={{ fontWeight: 600, minWidth: '22px', color: 'var(--text-muted)', paddingTop: '0.1rem' }}>{i + 1}.</span>
          <textarea rows={2} value={s.text} onChange={e => setStmt(i, 'text', e.target.value)}
            placeholder="Enter a statement…"
            style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.9rem', background: 'var(--bg-card)', color: 'var(--text)', resize: 'vertical' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '80px' }}>
            {['true', 'false'].map(v => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input type="radio" name={`tf-${i}`} value={v} checked={s.answer === v} onChange={() => setStmt(i, 'answer', v)}
                  style={{ accentColor: '#006699' }} />
                {v === 'true' ? 'True' : 'False'}
              </label>
            ))}
          </div>
          {statements.length > 1 && (
            <button onClick={() => removeStmt(i)} className="btn-ghost"
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem', color: '#e05c5c' }}>✕</button>
          )}
        </div>
      ))}
      <button onClick={addStmt} className="btn-ghost"
        style={{ alignSelf: 'flex-start', fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}>
        + Add statement
      </button>
    </div>
  )
}

export function ExFormListening({ onChange }) {
  const [audioUrl,  setAudioUrl]  = useState('')
  const [questions, setQuestions] = useState([{ prompt: '', type: 'open', options: ['', '', '', ''], correct: 0 }])

  useEffect(() => {
    const qs = questions.filter(q => q.prompt.trim()).map(q => ({
      type: q.type === 'multiple_choice' ? 'multiple_choice' : 'open',
      prompt: q.prompt.trim(),
      options: q.type === 'multiple_choice' ? q.options.filter(Boolean) : null,
      correct_answer: q.type === 'multiple_choice' ? String(q.correct) : null,
      hint: audioUrl || null,
    }))
    onChange({ questions: qs, audioUrl })
  }, [audioUrl, questions])

  const setQ = (i, field, v) => setQuestions(p => p.map((q, idx) => idx === i ? { ...q, [field]: v } : q))
  const setOpt = (qi, oi, v) => setQuestions(p => p.map((q, idx) => idx === qi
    ? { ...q, options: q.options.map((o, oidx) => oidx === oi ? v : o) } : q))
  const addQ    = () => setQuestions(p => [...p, { prompt: '', type: 'open', options: ['', '', '', ''], correct: 0 }])
  const removeQ = (i) => setQuestions(p => p.filter((_, idx) => idx !== i))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div className="form-field">
        <label>Audio URL</label>
        <input type="url" value={audioUrl} onChange={e => setAudioUrl(e.target.value)}
          placeholder="https://…/audio.mp3"
          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.9rem', background: 'var(--bg-card)', color: 'var(--text)' }} />
      </div>
      <div className="form-field" style={{ marginBottom: 0 }}>
        <label>Questions</label>
      </div>
      {questions.map((q, i) => (
        <div key={i} style={{ background: '#fffef8', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)', paddingTop: '0.1rem', minWidth: '22px' }}>Q{i + 1}</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <textarea rows={2} value={q.prompt} onChange={e => setQ(i, 'prompt', e.target.value)}
                placeholder="Question text…"
                style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.9rem', background: 'var(--bg-card)', color: 'var(--text)', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                {['open', 'multiple_choice'].map(v => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="radio" name={`lq-type-${i}`} value={v} checked={q.type === v} onChange={() => setQ(i, 'type', v)}
                      style={{ accentColor: '#006699' }} />
                    {v === 'open' ? 'Open answer' : 'Multiple choice'}
                  </label>
                ))}
              </div>
              {q.type === 'multiple_choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {['A', 'B', 'C', 'D'].map((ltr, oi) => (
                    <div key={oi} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input type="radio" name={`lq-correct-${i}`} checked={q.correct === oi} onChange={() => setQ(i, 'correct', oi)}
                        style={{ accentColor: '#006699' }} />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', minWidth: '18px' }}>{ltr}</span>
                      <input type="text" value={q.options[oi]} onChange={e => setOpt(i, oi, e.target.value)}
                        placeholder={`Option ${ltr}`}
                        style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '5px', padding: '0.35rem 0.6rem', fontSize: '0.85rem', background: 'var(--bg-card)', color: 'var(--text)' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {questions.length > 1 && (
              <button onClick={() => removeQ(i)} className="btn-ghost"
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem', color: '#e05c5c' }}>✕</button>
            )}
          </div>
        </div>
      ))}
      <button onClick={addQ} className="btn-ghost"
        style={{ alignSelf: 'flex-start', fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}>
        + Add question
      </button>
    </div>
  )
}

/* ── main component ──────────────────────────────────────────── */

export function AdminExerciseLibrary({ adminUserId }) {
  const [exercises,  setExercises]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [view,       setView]       = useState('list')   // 'list' | 'type-select' | 'form'
  const [exType,     setExType]     = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState(null)

  // shared form state
  const [formTitle,        setFormTitle]        = useState('')
  const [formInstructions, setFormInstructions] = useState('')
  const [formQuestions,    setFormQuestions]    = useState([])
  const [formAudioUrl,     setFormAudioUrl]     = useState('')

  const load = () => {
    setLoading(true)
    fetchAllExercises().then(data => { setExercises(data); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const startCreate = () => { setView('type-select') }

  const selectType = (type) => {
    setExType(type)
    setFormTitle('')
    setFormInstructions('')
    setFormQuestions([])
    setFormAudioUrl('')
    setSaveError(null)
    setView('form')
  }

  const handleFormChange = ({ questions, audioUrl }) => {
    if (questions !== undefined) setFormQuestions(questions)
    if (audioUrl  !== undefined) setFormAudioUrl(audioUrl)
  }

  const handleSave = async () => {
    if (!formTitle.trim()) { setSaveError('Title is required.'); return }
    if (formQuestions.length === 0) { setSaveError('Add at least one question before saving.'); return }
    setSaving(true); setSaveError(null)
    const exMeta = {
      title:             formTitle.trim(),
      description:       formInstructions.trim() || null,
      audioUrl:          formAudioUrl || null,
      stageType:         exType === 'listening' ? 'listening' : 'controlled_exercise',
    }
    const id = await createExerciseWithQuestions(exMeta, formQuestions)
    setSaving(false)
    if (!id) { setSaveError('Failed to save exercise. Please try again.'); return }
    load()
    setView('list')
  }

  const handleDelete = async (id) => {
    const ok = await deleteExercise(id)
    if (ok) { setExercises(p => p.filter(e => e.id !== id)); setDeletingId(null) }
  }

  if (loading) return <div className="dashboard-loading" style={{ padding: '2rem' }}>Loading exercises…</div>

  /* ── type selector ── */
  if (view === 'type-select') return (
    <div style={{ marginTop: '1rem' }}>
      <button className="btn-ghost" style={{ fontSize: '0.88rem', marginBottom: '1rem' }}
        onClick={() => setView('list')}>← Back</button>
      <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '1rem' }}>Choose exercise type</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.85rem' }}>
        {EX_TYPES.map(t => (
          <button key={t.value} onClick={() => selectType(t.value)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
              padding: '1.25rem 1rem', background: 'var(--bg-card)',
              border: '1.5px solid var(--border)', borderRadius: '10px',
              cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
              fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#006699'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,102,153,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}>
            <span style={{ fontSize: '2rem' }}>{t.emoji}</span>
            <span style={{ textAlign: 'center', lineHeight: 1.3 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )

  /* ── creation form ── */
  if (view === 'form') {
    const typeMeta = EX_TYPES.find(t => t.value === exType)
    return (
      <div style={{ marginTop: '1rem' }}>
        <button className="btn-ghost" style={{ fontSize: '0.88rem', marginBottom: '1rem' }}
          onClick={() => setView('type-select')}>← Back</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{typeMeta?.emoji}</span>
          <h3 style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>New {typeMeta?.label} exercise</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '700px' }}>
          {/* Shared fields */}
          <div className="form-field">
            <label>Title <span style={{ color: '#e05c5c' }}>*</span></label>
            <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g. Past Simple — Question Forms"
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.9rem', background: 'var(--bg-card)', color: 'var(--text)' }} />
          </div>
          <div className="form-field">
            <label>Instructions <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <textarea rows={2} value={formInstructions} onChange={e => setFormInstructions(e.target.value)}
              placeholder="e.g. Choose the correct answer for each question."
              className="writing-input" />
          </div>

          {/* Type-specific form */}
          {exType === 'multiple_choice'     && <ExFormMultipleChoice onChange={handleFormChange} />}
          {exType === 'fill_blank'          && <ExFormFillBlank onChange={handleFormChange} dropdown={false} />}
          {exType === 'fill_blank_dropdown' && <ExFormFillBlank onChange={handleFormChange} dropdown={true} />}
          {exType === 'matching'            && <ExFormMatching onChange={handleFormChange} />}
          {exType === 'ordering'            && <ExFormOrdering onChange={handleFormChange} />}
          {exType === 'true_false'          && <ExFormTrueFalse onChange={handleFormChange} />}
          {exType === 'listening'           && <ExFormListening onChange={handleFormChange} />}

          {saveError && (
            <div style={{ color: '#e05c5c', fontSize: '0.88rem', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.5rem 0.75rem' }}>
              {saveError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem' }}>
            <button className="btn-gold" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save exercise'}
            </button>
            <button className="btn-ghost" onClick={() => setView('list')} disabled={saving}>Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  /* ── list view ── */
  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem' }}>
          Exercise Library <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.9rem' }}>({exercises.length})</span>
        </h3>
        <button className="btn-gold" onClick={startCreate}>＋ Create exercise</button>
      </div>

      {exercises.length === 0 ? (
        <div className="dashboard-empty">
          <p>No exercises yet. Create your first one above.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
          {exercises.map(ex => {
            const typeHint = ex.stage_type === 'listening' ? 'listening' : null
            const stDef = STAGE_TYPES.find(t => t.value === ex.stage_type) || { icon: '✏️', label: 'Exercise' }
            return (
              <div key={ex.id} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'border-color 0.15s', cursor: 'default' }}>
                {ex.thumbnail && <img src={ex.thumbnail} alt="" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.25rem' }} />}
                <strong style={{ fontSize: '0.92rem' }}>{ex.title}</strong>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <TypeBadge type={typeHint || ex.stage_type || 'controlled_exercise'} />
                  {ex.books?.title && <span className="admin-level-chip">📚 {ex.books.title}</span>}
                  {(ex.unit != null || ex.page != null || ex.section || ex.exercise_no != null) && (
                    <span className="admin-level-chip location-chip">
                      {[
                        ex.unit        != null ? `Unit ${ex.unit}`    : null,
                        ex.page        != null ? `p.${ex.page}`       : null,
                        ex.section     || null,
                        ex.exercise_no != null ? `Ex.${ex.exercise_no}` : null,
                      ].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {ex.estimated_minutes && <span className="admin-level-chip" style={{ color: 'var(--text-muted)' }}>⏱ {ex.estimated_minutes} min</span>}
                  {ex.audio_url && <span className="admin-level-chip" style={{ color: 'var(--text-muted)' }}>🎧 Audio</span>}
                  {ex.context_text && <span className="admin-level-chip" style={{ color: 'var(--text-muted)' }}>📖 Text</span>}
                  {(ex.labels || []).map(lbl => (
                    <span key={lbl.id} className="label-chip" style={{ '--lbl-color': lbl.color }}>{lbl.name}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.4rem' }}>
                  {deletingId === ex.id ? (
                    <>
                      <button className="btn-ghost"
                        style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', color: '#e05c5c', borderColor: '#e05c5c' }}
                        onClick={() => handleDelete(ex.id)}>Confirm delete</button>
                      <button className="btn-ghost"
                        style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => setDeletingId(null)}>Cancel</button>
                    </>
                  ) : (
                    <button className="btn-ghost"
                      style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', color: '#e05c5c' }}
                      onClick={() => setDeletingId(ex.id)}>Delete</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── AdminCalendar ────────────────────────────────────────────
export function AdminCalendar() {
  const [lessons,  setLessons]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [viewMode, setViewMode] = useState('upcoming') // 'upcoming' | 'week'

  useEffect(() => {
    fetchAllUpcomingLessons().then(data => {
      setLessons(data)
      setLoading(false)
    })
  }, [])

  const now    = new Date()
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const week   = new Date(today); week.setDate(week.getDate() + 7)

  const todayLessons    = lessons.filter(l => {
    const d = new Date(l.scheduled_at)
    return d >= today && d < new Date(today.getTime() + 86400000)
  })
  const upcomingLessons = lessons.filter(l => {
    const d = new Date(l.scheduled_at)
    return d >= new Date(today.getTime() + 86400000)
  })

  const fmtDate = (iso) => {
    const d = new Date(iso)
    const isToday   = d.toDateString() === now.toDateString()
    const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString()
    const dayLabel  = isToday ? 'Today' : isTomorrow ? 'Tomorrow'
      : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
    const timeLabel = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return `${dayLabel} · ${timeLabel}`
  }

  const statusColor = (s) => s === 'completed' ? '#4ade80' : s === 'cancelled' ? '#f87171' : '#d4a853'

  const LessonCard = ({ l, highlight }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '0.8rem 1rem', borderRadius: '10px',
      background: highlight ? 'color-mix(in srgb, var(--gold) 8%, var(--bg))' : 'var(--bg)',
      border: `1px solid ${highlight ? 'color-mix(in srgb, var(--gold) 35%, transparent)' : 'var(--border)'}`,
      marginBottom: '0.5rem',
    }}>
      <div style={{ textAlign: 'center', minWidth: '48px' }}>
        <div style={{ fontSize: '1.4rem', lineHeight: 1 }}>
          {highlight ? '⭐' : '📅'}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {l.profiles?.name || l.profiles?.email || 'Unknown student'}
          {l.title && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>— {l.title}</span>}
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {fmtDate(l.scheduled_at)}
          {l.duration_minutes && <span> · {l.duration_minutes} min</span>}
          {l.lesson_no && <span> · Lesson #{l.lesson_no}</span>}
        </div>
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: statusColor(l.status),
        background: 'color-mix(in srgb, currentColor 12%, transparent)',
        borderRadius: '99px', padding: '0.2em 0.65em', flexShrink: 0, border: '1px solid currentColor' }}>
        {l.status}
      </span>
    </div>
  )

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Upcoming lessons</h3>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: 'auto' }}>
          All times are your local time
        </span>
      </div>

      {loading ? (
        <div className="dashboard-loading">Loading calendar…</div>
      ) : lessons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📅</div>
          <p style={{ margin: 0 }}>No upcoming lessons scheduled.<br />Add lessons from a student's profile.</p>
        </div>
      ) : (
        <>
          {todayLessons.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gold)', marginBottom: '0.5rem' }}>
                ⭐ Today — {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              {todayLessons.map(l => <LessonCard key={l.id} l={l} highlight />)}
            </div>
          )}
          {upcomingLessons.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Coming up
              </div>
              {upcomingLessons.map(l => <LessonCard key={l.id} l={l} />)}
            </div>
          )}
          {todayLessons.length === 0 && (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>No lessons today.</p>
          )}
        </>
      )}

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
        💡 Tip: to add or edit lessons, go to <strong>👥 Students</strong> → open a student → Lessons section.
      </p>
    </div>
  )
}

// ─── AdminTests ────────────────────────────────────────────────
export function TestQuestionEditor({ testDef, onBack }) {
  const [questions, setQuestions] = useState(() => getEffectiveQuestions(testDef.id))
  const [editingIdx, setEditingIdx] = useState(null)
  const [saved, setSaved] = useState(false)
  const [hasCustom, setHasCustom] = useState(() => {
    try { return !!localStorage.getItem('tq_' + testDef.id) } catch { return false }
  })

  const save = (newQs) => {
    setQuestions(newQs)
    saveQuestions(testDef.id, newQs)
    setHasCustom(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    if (!window.confirm('Reset all questions to the original defaults?')) return
    resetQuestions(testDef.id)
    const defaultQ = testDef.id === 'hospitality_placement_v1' ? HOSPITALITY_PLACEMENT_QUESTIONS : GENERAL_PLACEMENT_QUESTIONS
    setQuestions([...defaultQ])
    setHasCustom(false)
    setEditingIdx(null)
  }

  const updateQuestion = (idx, updates) => {
    const next = questions.map((q, i) => i === idx ? { ...q, ...updates } : q)
    save(next)
  }

  const LETTERS = ['A', 'B', 'C', 'D']
  const CEFR_COLORS = { A2: '#854F0B', B1: '#3B6D11', B2: '#2b72b5' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button className="back-btn" onClick={onBack}>← Back to Tests</button>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{testDef.label}</h3>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{questions.length} questions</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {saved && <span style={{ fontSize: '0.82rem', color: '#3B6D11', padding: '0.35rem 0' }}>✓ Saved</span>}
          {hasCustom && (
            <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', color: '#e05c5c' }}
              onClick={handleReset}>↺ Reset to defaults</button>
          )}
        </div>
      </div>

      {hasCustom && (
        <div style={{ background: '#E6F1FB', border: '1px solid #a8c8e8', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#2b72b5' }}>
          ✏️ You have custom edits to these questions. Students will see your edited version.
        </div>
      )}

      {/* Question list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {questions.map((q, idx) => {
          const isEditing = editingIdx === idx
          const cefrColor = CEFR_COLORS[q.cefr] || '#888'

          // Build the skill label(s) for the right-hand column
          const TENSE_LABELS = {
            present_simple:'Present simple', present_continuous:'Present continuous',
            going_to_future:'Going to — future', past_simple:'Past simple',
            past_continuous:'Past continuous', past_perfect:'Past perfect',
            present_perfect:'Present perfect', will_future:'Will — predictions',
            present_perfect_continuous:'Present perfect continuous',
          }
          const GRAMMAR_LABELS = {
            subject_verb_agreement:'Subject–verb agreement', going_to_future:'Going to — future plans',
            present_continuous:'Present continuous', past_simple_regular_irregular:'Past simple (reg./irreg.)',
            comparatives_superlatives:'Comparatives & superlatives', modal_can_ability:'Can / can\'t — ability',
            quantifiers_countable_uncountable:'Quantifiers', prepositions_time:'Prepositions of time',
            present_perfect_ever_never:'Present perfect — ever/never', present_perfect_yet_already:'Present perfect — yet/already',
            past_continuous_interrupted:'Past continuous — interrupted', past_perfect_narrative:'Past perfect — sequence',
            used_to_past_habits:'Used to — past habits', will_future_prediction:'Will — predictions',
            first_conditional:'First conditional', second_conditional:'Second conditional',
            modal_should_advice:'Should — advice', modal_might_possibility:'Might — possibility',
            gerund_after_verbs:'Gerund after verbs', infinitive_after_verbs:'Infinitive after verbs',
            passive_past_simple:'Passive — past simple', passive_present_simple:'Passive — present simple',
            reported_speech_backshift:'Reported speech', present_perfect_continuous:'Present perfect continuous',
            third_conditional:'Third conditional', wish_if_only:'Wish / If only',
            defining_relative_clauses:'Defining relative clauses', non_defining_relative_clauses:'Non-defining relative clauses',
            causative_have_get:'Causative — have/get', linkers_contrast:'Linkers — contrast',
            functional_greeting:'Greeting & welcoming guests', functional_email_register:'Formal email register',
          }
          const skillLines = []
          if (q.type === 'text') skillLines.push({ label: 'Writing task', color: '#993C1D', bg: '#FAECE7' })
          if (q.vocab) skillLines.push({ label: 'Vocabulary', color: '#3C3489', bg: '#EEEDFE' })
          if (q.grammarTag && GRAMMAR_LABELS[q.grammarTag]) skillLines.push({ label: GRAMMAR_LABELS[q.grammarTag], color: '#2b72b5', bg: '#E6F1FB' })
          if (q.tenseTag && TENSE_LABELS[q.tenseTag]) skillLines.push({ label: TENSE_LABELS[q.tenseTag], color: '#3B6D11', bg: '#EAF3DE' })

          return (
            <div key={idx} style={{ background: 'var(--bg-card)', border: `1px solid ${isEditing ? '#d4a853' : 'var(--border)'}`, borderRadius: '10px', overflow: 'hidden' }}>
              {/* Question header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.75rem 0.9rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-muted)', minWidth: '28px', flexShrink: 0, paddingTop: '0.1rem' }}>Q{idx + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cefrColor, background: `${cefrColor}18`, padding: '0.12rem 0.45rem', borderRadius: '20px' }}>{q.cefr}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-darker)', padding: '0.12rem 0.45rem', borderRadius: '20px' }}>{q.section}</span>
                    {q.type === 'text' && <span style={{ fontSize: '0.72rem', color: '#993C1D', background: '#FAECE7', padding: '0.12rem 0.45rem', borderRadius: '20px' }}>Writing</span>}
                    {q.vocab && <span style={{ fontSize: '0.72rem', color: '#3C3489', background: '#EEEDFE', padding: '0.12rem 0.45rem', borderRadius: '20px' }}>Vocab</span>}
                  </div>
                  <div style={{ fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--text)' }}
                    dangerouslySetInnerHTML={{ __html: q.prompt }} />
                  {q.type === 'mc' && !isEditing && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
                      {q.options.map((opt, oi) => (
                        <span key={oi} style={{ fontSize: '0.78rem', padding: '0.18rem 0.55rem', borderRadius: '5px',
                          background: oi === q.answer ? '#EAF3DE' : 'var(--bg-darker)',
                          color: oi === q.answer ? '#3B6D11' : 'var(--text-muted)',
                          border: `1px solid ${oi === q.answer ? '#c5dfa3' : 'var(--border)'}`,
                          fontWeight: oi === q.answer ? 700 : 400 }}>
                          {LETTERS[oi]}. {opt}
                        </span>
                      ))}
                    </div>
                  )}
                  {q.type === 'text' && !isEditing && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      Min. {q.minWords} words required
                    </div>
                  )}
                </div>
                {/* Skill labels in the white space */}
                {!isEditing && skillLines.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end', minWidth: '170px', maxWidth: '200px', flexShrink: 0, paddingTop: '0.1rem' }}>
                    {skillLines.map((s, si) => (
                      <span key={si} style={{ fontSize: '0.72rem', fontWeight: 600, color: s.color, background: s.bg, padding: '0.18rem 0.55rem', borderRadius: '20px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        {s.label}
                      </span>
                    ))}
                  </div>
                )}
                <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem', flexShrink: 0 }}
                  onClick={() => setEditingIdx(isEditing ? null : idx)}>
                  {isEditing ? '✕ Cancel' : '✏️ Edit'}
                </button>
              </div>

              {/* Inline editor */}
              {isEditing && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '0.85rem 0.9rem', background: '#FFFBF0' }}>
                  <QuestionEditor
                    question={q}
                    onChange={updates => { updateQuestion(idx, updates); setEditingIdx(null) }}
                    onCancel={() => setEditingIdx(null)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function QuestionEditor({ question, onChange, onCancel }) {
  const [prompt, setPrompt] = useState(question.prompt)
  const [options, setOptions] = useState(question.options ? [...question.options] : [])
  const [answer, setAnswer] = useState(question.answer ?? 0)
  const [minWords, setMinWords] = useState(question.minWords ?? 5)
  const LETTERS = ['A', 'B', 'C', 'D']

  const handleSave = () => {
    const updates = { prompt }
    if (question.type === 'mc') { updates.options = options; updates.answer = answer }
    if (question.type === 'text') { updates.minWords = minWords }
    onChange(updates)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="form-field">
        <label style={{ fontSize: '0.82rem' }}>Question prompt (HTML allowed for <em>italics</em>, <strong>bold</strong>)</label>
        <textarea rows={3} style={{ fontSize: '0.88rem', resize: 'vertical' }}
          value={prompt} onChange={e => setPrompt(e.target.value)} />
      </div>

      {question.type === 'mc' && (
        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Options (click the letter to set the correct answer)</label>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <button type="button"
                style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit',
                  border: `2px solid ${answer === i ? '#3B6D11' : 'var(--border)'}`,
                  background: answer === i ? '#EAF3DE' : 'var(--bg-card)',
                  color: answer === i ? '#3B6D11' : 'var(--text-muted)' }}
                title="Set as correct answer"
                onClick={() => setAnswer(i)}>
                {LETTERS[i]}
              </button>
              <input type="text" style={{ flex: 1 }} value={opt}
                onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n) }} />
              {answer === i && <span style={{ fontSize: '0.75rem', color: '#3B6D11', fontWeight: 600, flexShrink: 0 }}>✓ Correct</span>}
            </div>
          ))}
        </div>
      )}

      {question.type === 'text' && (
        <div className="form-field">
          <label style={{ fontSize: '0.82rem' }}>Minimum words required</label>
          <input type="number" min="1" max="200" style={{ width: '100px' }}
            value={minWords} onChange={e => setMinWords(parseInt(e.target.value) || 1)} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn-gold" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }} onClick={handleSave}>
          ✓ Save change
        </button>
        <button className="btn-ghost" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export function AdminTests({ adminUserId, students = [], manualStudents = [] }) {
  const [assignments, setAssignments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [needsSetup,  setNeedsSetup]  = useState(false)
  const [viewingResult, setViewingResult] = useState(null) // unused, kept for compat
  const [expandedResultId, setExpandedResultId] = useState(null) // inline collapsed result
  const [previewing,    setPreviewing]    = useState(false) // admin preview mode
  const [editingQuestions, setEditingQuestions] = useState(null) // TEST_DEFINITIONS entry
  // Assign form
  const [assigning,     setAssigning]     = useState(false)
  const [assignTestId,  setAssignTestId]  = useState('general_placement_v1')
  const [assignStudentId,   setAssignStudentId]   = useState('')
  const [assignManualId,    setAssignManualId]    = useState('')
  const [assignStudentType, setAssignStudentType] = useState('auth') // 'auth'|'manual'
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignError,  setAssignError]  = useState(null)
  const [deletingId,   setDeletingId]   = useState(null)
  const [previewHtml,  setPreviewHtml]  = useState(null)

  useEffect(() => {
    fetchAllTestAssignments().then(data => {
      if (data === null) setNeedsSetup(true)
      else { setAssignments(data); setNeedsSetup(false) }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (previewing && !previewHtml) {
      const testId = editingQuestions?.id || 'general_placement_v1'
      const htmlFile = testId === 'hospitality_placement_v1'
        ? '/tests/hospitality_placement_v1.html'
        : '/tests/general_placement_v1.html'
      fetch(htmlFile)
        .then(r => r.text())
        .then(html => {
          const currentQ = getEffectiveQuestions(testId)
          const varName = testId === 'hospitality_placement_v1' ? '__eph_questions' : '__ept_questions'
          const injected = `<script>window.${varName} = ${JSON.stringify(currentQ)};</script>\n` + html
          setPreviewHtml(injected)
        })
    }
  }, [previewing])

  const reload = () => fetchAllTestAssignments().then(data => {
    if (data) setAssignments(data)
  })

  const handleAssign = async () => {
    if (!assignTestId || !assignManualId) { setAssignError('Please select a test and a manual student.'); return }
    setAssignSaving(true); setAssignError(null)
    const result = await createTestAssignment({ testId: assignTestId, manualStudentId: assignManualId, assignedBy: adminUserId })
    setAssignSaving(false)
    if (result) {
      setAssigning(false)
      setAssignManualId('')
      reload()
    } else {
      setAssignError('Could not assign — check that the test_assignments table exists in Supabase.')
    }
  }

  const handleDelete = async (id) => {
    const ok = await deleteTestAssignment(id)
    if (ok) setAssignments(prev => prev.filter(a => a.id !== id))
    setDeletingId(null)
  }

  if (editingQuestions) {
    return <TestQuestionEditor testDef={editingQuestions} onBack={() => setEditingQuestions(null)} />
  }

  if (previewing) {
    return (
      <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <button className="back-btn" onClick={() => setPreviewing(false)}>← Back to Tests</button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            👨‍🏫 Admin preview — this is exactly what the student sees
          </span>
        </div>
        {!previewHtml ? (
          <div className="dashboard-loading">Loading test…</div>
        ) : (
          <iframe
            srcDoc={previewHtml}
            title="Test preview"
            style={{ width: '100%', border: '2px dashed #d4a853', borderRadius: '8px', minHeight: '750px', display: 'block' }}
            sandbox="allow-scripts"
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Tests</h3>
        <button className="btn-gold" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', marginLeft: 'auto' }}
          onClick={() => { setAssigning(p => !p); setAssignError(null) }}>
          {assigning ? '✕ Cancel' : '+ Assign test to student'}
        </button>
      </div>

      {/* Available tests */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available tests</h4>
        {TEST_DEFINITIONS.map(t => (
          <div key={t.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{t.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t.desc}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
              <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                onClick={() => setEditingQuestions(t)}>
                📝 View / edit questions
              </button>
              <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                onClick={() => { setEditingQuestions(t); setPreviewHtml(null); setPreviewing(true) }}>
                👁 Preview
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Setup warning */}
      {needsSetup && (
        <div style={{ background: '#FDF6E0', border: '1px solid #e8d99a', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
          <strong>⚠️ Database table needed</strong>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Run this SQL in your Supabase dashboard (SQL Editor) to enable the Tests feature:
          </p>
          <pre style={{ background: '#fff', border: '1px solid #e8d99a', borderRadius: '6px', padding: '0.75rem', margin: '0.75rem 0 0', fontSize: '0.78rem', overflowX: 'auto', userSelect: 'all' }}>{`create table if not exists test_assignments (
  id uuid primary key default gen_random_uuid(),
  test_id text not null default 'general_placement_v1',
  student_id uuid references profiles(id) on delete cascade,
  manual_student_id uuid references manual_students(id) on delete cascade,
  assigned_by uuid not null,
  assigned_at timestamptz default now(),
  status text not null default 'assigned',
  completed_at timestamptz,
  results jsonb
);
alter table test_assignments enable row level security;
create policy "Admin full access" on test_assignments
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Students read own" on test_assignments
  for select using (auth.uid() = student_id);
create policy "Students complete own" on test_assignments
  for update using (auth.uid() = student_id)
  with check (auth.uid() = student_id);`}</pre>
        </div>
      )}

      {/* Assign form */}
      {assigning && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
          <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.92rem' }}>Assign a test</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
            To assign a test to a prospect, use the <strong>Prospects tab</strong>. Use this form for manual students only.
          </p>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Test</label>
              <select value={assignTestId} onChange={e => setAssignTestId(e.target.value)} style={{ width: '100%' }}>
                {TEST_DEFINITIONS.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Manual student</label>
              <select value={assignManualId} onChange={e => setAssignManualId(e.target.value)} style={{ width: '100%' }}>
                <option value="">— Select student —</option>
                {manualStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name || s.email || s.id}</option>
                ))}
              </select>
            </div>
            <button className="btn-gold" style={{ padding: '0.5rem 1.25rem', flexShrink: 0 }}
              disabled={assignSaving} onClick={handleAssign}>
              {assignSaving ? 'Assigning…' : 'Assign'}
            </button>
          </div>
          {assignError && <div className="auth-error" style={{ marginTop: '0.5rem' }}>{assignError}</div>}
        </div>
      )}

      {/* Assignments list */}
      {loading ? (
        <div className="dashboard-loading">Loading…</div>
      ) : assignments.length === 0 && !needsSetup ? (
        <div className="dashboard-empty"><p>No tests assigned yet.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {assignments.map(a => {
            const testDef = TEST_DEFINITIONS.find(t => t.id === a.test_id) || { label: a.test_id }
            const studentName = a.profiles?.name || a.profiles?.email || a.manual_students?.name || a.manual_students?.email || '—'
            const isCompleted = a.status === 'completed'
            const isExpanded = expandedResultId === a.id
            return (
              <div key={a.id} style={{ background: 'var(--bg-card)', border: `1px solid ${isExpanded ? '#a8c8e8' : isCompleted ? '#c5dfa3' : 'var(--border)'}`, borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{testDef.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>👤 {studentName}</span>
                      <span>📅 {new Date(a.assigned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {isCompleted && a.completed_at && (
                        <span style={{ color: '#4a8a1a' }}>✓ Completed {new Date(a.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      )}
                      {isCompleted && a.results && (
                        <span style={{ fontWeight: 600, color: '#2b72b5' }}>
                          {a.results.level} ({a.results.cefr}) — {a.results.mcCorrect}/{a.results.mcTotal} correct
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    {isCompleted && (
                      <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.3rem 0.7rem' }}
                        onClick={() => setExpandedResultId(isExpanded ? null : a.id)}>
                        {isExpanded ? '▲ Collapse' : '📊 View results'}
                      </button>
                    )}
                    {!isCompleted && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.3rem 0.5rem' }}>⏳ Pending</span>
                    )}
                    {deletingId === a.id ? (
                      <>
                        <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem', color: '#e05c5c', borderColor: '#e05c5c' }}
                          onClick={() => handleDelete(a.id)}>Confirm delete</button>
                        <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                          onClick={() => setDeletingId(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.3rem 0.6rem', color: '#e05c5c' }}
                        onClick={() => setDeletingId(a.id)}>Delete</button>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #d4e8f5', padding: '0 0.85rem 0.85rem' }}>
                    <TestResultView assignment={a} onBack={() => setExpandedResultId(null)} backLabel="▲ Collapse results" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── TestResultView (admin diagnostic display) ─────────────────
export function TestResultView({ assignment, onBack, backLabel = '← Back to tests' }) {
  const r = assignment.results
  if (!r) return (
    <div>
      <button className="back-btn" onClick={onBack}>{backLabel}</button>
      <p style={{ color: 'var(--text-muted)' }}>No results data found.</p>
    </div>
  )
  const studentName = assignment.profiles?.name || assignment.profiles?.email || assignment.manual_students?.name || '—'
  const LETTERS = ['A','B','C','D']
  const TENSE_META = {
    present_simple:{label:'Present simple'},present_continuous:{label:'Present continuous'},
    going_to_future:{label:'Going to (future)'},past_simple:{label:'Past simple'},
    past_continuous:{label:'Past continuous'},past_perfect:{label:'Past perfect'},
    present_perfect:{label:'Present perfect'},will_future:{label:'Will (predictions)'},
    present_perfect_continuous:{label:'Present perfect continuous'},
  }
  const GRAMMAR_META = {
    subject_verb_agreement:{label:'Subject–verb agreement'},going_to_future:{label:'Going to — future plans'},
    present_continuous:{label:'Present continuous'},past_simple_regular_irregular:{label:'Past simple (reg./irreg.)'},
    comparatives_superlatives:{label:'Comparatives & superlatives'},modal_can_ability:{label:'Can / can\'t (ability)'},
    quantifiers_countable_uncountable:{label:'Quantifiers'},prepositions_time:{label:'Prepositions of time'},
    present_perfect_ever_never:{label:'Present perfect (ever/never)'},present_perfect_yet_already:{label:'Present perfect (yet/already)'},
    past_continuous_interrupted:{label:'Past continuous (interrupted)'},past_perfect_narrative:{label:'Past perfect (sequence)'},
    used_to_past_habits:{label:'Used to (past habits)'},will_future_prediction:{label:'Will — predictions'},
    first_conditional:{label:'First conditional'},second_conditional:{label:'Second conditional'},
    modal_should_advice:{label:'Should (advice)'},modal_might_possibility:{label:'Might (possibility)'},
    gerund_after_verbs:{label:'Gerund after verbs'},infinitive_after_verbs:{label:'Infinitive after verbs'},
    passive_past_simple:{label:'Passive — past simple'},passive_present_simple:{label:'Passive — present simple'},
    reported_speech_backshift:{label:'Reported speech'},present_perfect_continuous:{label:'Present perfect continuous'},
    third_conditional:{label:'Third conditional'},wish_if_only:{label:'Wish / If only'},
    defining_relative_clauses:{label:'Defining relative clauses'},non_defining_relative_clauses:{label:'Non-defining relative clauses'},
    causative_have_get:{label:'Causative have/get'},linkers_contrast:{label:'Linkers — contrast'},
  }
  const pct = (c,t) => t > 0 ? Math.round(c/t*100) : 0
  const verdictColor = (c,t) => { if(t===0) return '#888'; const p=c/t; if(p>=0.67) return '#3B6D11'; if(p>=0.34) return '#854F0B'; return '#993C1D' }
  const verdictLabel = (c,t) => { if(t===0) return 'n/a'; const p=c/t; if(p>=0.67) return 'Strong'; if(p>=0.34) return 'Developing'; return 'Needs work' }

  const levelColor = r.cefr === 'A2' ? '#854F0B' : r.cefr === 'B1' ? '#3B6D11' : '#2b72b5'

  const BarRow = ({label, correct, total, color}) => (
    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.55rem 0', borderBottom:'1px solid var(--border)' }}>
      <div style={{ minWidth:'180px', fontSize:'0.85rem', fontWeight:500 }}>{label}</div>
      <div style={{ flex:1, background:'var(--bg-darker)', borderRadius:'4px', height:'8px' }}>
        <div style={{ width:`${pct(correct,total)}%`, height:'100%', background:color||'#185FA5', borderRadius:'4px', transition:'width 0.4s' }} />
      </div>
      <div style={{ fontSize:'0.82rem', minWidth:'40px', textAlign:'right', color:'var(--text-muted)' }}>{total>0?`${correct}/${total}`:'—'}</div>
      <div style={{ fontSize:'0.78rem', fontWeight:600, color:verdictColor(correct,total), minWidth:'80px', textAlign:'right' }}>{verdictLabel(correct,total)}</div>
    </div>
  )

  const wrongAnswers = (r.allAnswers || []).filter(a => a.type === 'mc' && a.isCorrect === false)
  const writingAnswers = r.writingAnswers || []

  return (
    <div>
      <button className="back-btn" onClick={onBack}>{backLabel}</button>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:'1rem', marginTop:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <div>
          <h2 style={{ margin:'0 0 0.35rem', fontSize:'1.25rem' }}>Test Results — {studentName}</h2>
          <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
            <span className="admin-level-chip" style={{ background:`${levelColor}18`, color:levelColor, fontWeight:700, fontSize:'0.9rem' }}>
              🏆 {r.level} — CEFR {r.cefr}
            </span>
            <span className="admin-level-chip">{r.mcCorrect} / {r.mcTotal} MC correct</span>
            {r.completedAt && <span className="admin-level-chip">📅 {new Date(assignment.completed_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>}
          </div>
        </div>
      </div>

      {/* Teacher summary */}
      <div style={{ background:'#FFFBF0', border:'1px solid #f0e8c8', borderRadius:'10px', padding:'1rem', marginBottom:'1.25rem' }}>
        <strong style={{ fontSize:'0.85rem' }}>📋 Teacher summary</strong>
        <p style={{ margin:'0.35rem 0 0', fontSize:'0.875rem', lineHeight:1.7, color:'var(--text)' }}>{r.desc}</p>
        {writingAnswers.length > 0 && (
          <p style={{ margin:'0.5rem 0 0', fontSize:'0.82rem', color:'var(--text-muted)' }}>
            Writing tasks attempted: {r.writingAttempted} / {r.writingTotal} — <strong>review manually below.</strong>
          </p>
        )}
      </div>

      {/* CEFR band breakdown */}
      <div className="builder-section" style={{ marginBottom:'1rem' }}>
        <h4 className="builder-section-title">Performance by CEFR band</h4>
        <BarRow label="Elementary (A2)" correct={r.a2.correct} total={r.a2.total} color="#185FA5" />
        <BarRow label="Lower intermediate (B1)" correct={r.b1.correct} total={r.b1.total} color="#3B6D11" />
        <BarRow label="Upper intermediate (B2)" correct={r.b2.correct} total={r.b2.total} color="#854F0B" />
        <BarRow label="Vocabulary" correct={r.vocabCorrect} total={r.vocabTotal} color="#3C3489" />
      </div>

      {/* Tense diagnostic */}
      <div className="builder-section" style={{ marginBottom:'1rem' }}>
        <h4 className="builder-section-title">Tense diagnostic</h4>
        {Object.entries(r.tenseMap || {}).map(([tag, sc]) => {
          const meta = TENSE_META[tag]
          return meta ? <BarRow key={tag} label={meta.label} correct={sc.c} total={sc.t} color="#185FA5" /> : null
        })}
        {Object.keys(r.tenseMap || {}).length === 0 && <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>No tense data.</p>}
      </div>

      {/* Grammar diagnostic */}
      <div className="builder-section" style={{ marginBottom:'1rem' }}>
        <h4 className="builder-section-title">Grammar diagnostic</h4>
        {Object.entries(r.grammarMap || {}).map(([tag, sc]) => {
          const meta = GRAMMAR_META[tag]
          return meta ? <BarRow key={tag} label={meta.label} correct={sc.c} total={sc.t} color="#3B6D11" /> : null
        })}
        {Object.keys(r.grammarMap || {}).length === 0 && <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>No grammar data.</p>}
      </div>

      {/* Wrong answers */}
      {wrongAnswers.length > 0 && (
        <div className="builder-section" style={{ marginBottom:'1rem' }}>
          <h4 className="builder-section-title">Incorrect MC answers ({wrongAnswers.length})</h4>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {wrongAnswers.map((a,i) => (
              <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', padding:'0.65rem 0.85rem', fontSize:'0.85rem' }}>
                <div style={{ display:'flex', gap:'0.5rem', alignItems:'flex-start', marginBottom:'0.4rem' }}>
                  <span style={{ background:'#FAECE7', color:'#993C1D', fontWeight:700, fontSize:'0.75rem', padding:'0.15rem 0.55rem', borderRadius:'20px', whiteSpace:'nowrap', flexShrink:0 }}>Q{a.qNum}</span>
                  <span style={{ color:'var(--text)', lineHeight:1.5 }}>{a.prompt}</span>
                </div>
                <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', fontSize:'0.82rem' }}>
                  <span style={{ color:'#E24B4A' }}>✗ Answered: {a.givenLabel || '(no answer)'}</span>
                  <span style={{ color:'#3B6D11', fontWeight:600 }}>✓ Correct: {a.correctLabel}</span>
                </div>
                {(a.tenseTag || a.grammarTag || a.vocab) && (
                  <div style={{ color:'var(--text-muted)', fontSize:'0.75rem', marginTop:'0.25rem' }}>
                    Tests: {[
                      a.tenseTag   ? TENSE_META[a.tenseTag]?.label   : null,
                      a.grammarTag ? GRAMMAR_META[a.grammarTag]?.label : null,
                      a.vocab ? 'Vocabulary' : null,
                    ].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Writing answers */}
      {writingAnswers.length > 0 && (
        <div className="builder-section" style={{ marginBottom:'1rem' }}>
          <h4 className="builder-section-title">Writing tasks — review manually</h4>
          {writingAnswers.map((wa, i) => (
            <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', padding:'0.75rem', marginBottom:'0.5rem' }}>
              <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:'0.35rem' }}>
                Writing task {i+1}{wa.tag ? ` (${wa.tag})` : ''} · {wa.words} words
              </div>
              <div style={{ fontSize:'0.9rem', lineHeight:1.6, color: wa.answer ? 'var(--text)' : 'var(--text-muted)', fontStyle: wa.answer ? 'normal' : 'italic' }}>
                {wa.answer || '(no answer provided)'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── AdminPanel ───────────────────────────────────────────────
// ─── AdminCourses ─────────────────────────────────────────────
export const COURSE_COLORS = [
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Gold',    value: '#d4a853' },
  { label: 'Green',   value: '#10b981' },
  { label: 'Purple',  value: '#8b5cf6' },
  { label: 'Red',     value: '#ef4444' },
  { label: 'Teal',    value: '#006699' },
  { label: 'Orange',  value: '#f97316' },
  { label: 'Pink',    value: '#ec4899' },
  { label: 'Indigo',  value: '#4f46e5' },
  { label: 'Cyan',    value: '#06b6d4' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Slate',   value: '#475569' },
]

export function AdminCourses() {
  const [courses, setCourses]       = useState(null) // null = loading
  const [saving,  setSaving]        = useState(false)
  const [saved,   setSaved]         = useState(false)
  const [editingCourse, setEditingCourse] = useState(null) // index or 'new'
  const [draft, setDraft]           = useState(null) // course being edited
  const [heroPhoto,     setHeroPhoto]     = useState(null)
  const [heroUploading, setHeroUploading] = useState(false)
  const [heroSaved,     setHeroSaved]     = useState(false)
  const heroInputRef = useRef(null)

  useEffect(() => {
    fetchSiteSetting('courses').then(data => {
      setCourses(Array.isArray(data) && data.length > 0 ? data : COURSES_DATA)
    })
    fetchSiteSetting('hero_photo').then(v => { if (v) setHeroPhoto(v) })
  }, [])

  const handleHeroUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    e.target.value = ''
    setHeroUploading(true)
    try {
      const compressed = await compressImage(file, 800)
      const ok = await saveSiteSetting('hero_photo', compressed)
      if (ok) { setHeroPhoto(compressed); setHeroSaved(true); setTimeout(() => setHeroSaved(false), 2500) }
    } catch {}
    setHeroUploading(false)
  }

  const saveAll = async (updated) => {
    setSaving(true)
    const ok = await saveSiteSetting('courses', updated)
    setSaving(false)
    if (ok) { setCourses(updated); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  const startNew = () => {
    setDraft({ name: '', tag: '', color: '#3b82f6', desc: '', schedule: '6 weeks · 2 lessons/week · 90 min/lesson', modules: [{ title: '', lessons: [''] }] })
    setEditingCourse('new')
  }

  const startEdit = (i) => {
    setDraft(JSON.parse(JSON.stringify(courses[i])))
    setEditingCourse(i)
  }

  const deleteCourse = async (i) => {
    if (!window.confirm(`Delete "${courses[i].name}"?`)) return
    const updated = courses.filter((_, j) => j !== i)
    await saveAll(updated)
  }

  const moveCourse = async (i, dir) => {
    const updated = [...courses]
    const j = i + dir
    if (j < 0 || j >= updated.length) return
    ;[updated[i], updated[j]] = [updated[j], updated[i]]
    await saveAll(updated)
  }

  const saveDraft = async () => {
    if (!draft.name.trim()) return
    const updated = editingCourse === 'new'
      ? [...(courses || []), draft]
      : (courses || []).map((c, i) => i === editingCourse ? draft : c)
    await saveAll(updated)
    setEditingCourse(null); setDraft(null)
  }

  const updateDraft = (field, val) => setDraft(d => ({ ...d, [field]: val }))

  const updateModule = (mi, field, val) => setDraft(d => {
    const mods = [...d.modules]
    mods[mi] = { ...mods[mi], [field]: val }
    return { ...d, modules: mods }
  })

  const addModule = () => setDraft(d => ({ ...d, modules: [...d.modules, { title: '', lessons: [''] }] }))

  const removeModule = (mi) => setDraft(d => ({ ...d, modules: d.modules.filter((_, i) => i !== mi) }))

  const updateLesson = (mi, li, val) => setDraft(d => {
    const mods = [...d.modules]
    const lessons = [...mods[mi].lessons]
    lessons[li] = val
    mods[mi] = { ...mods[mi], lessons }
    return { ...d, modules: mods }
  })

  const addLesson = (mi) => setDraft(d => {
    const mods = [...d.modules]
    mods[mi] = { ...mods[mi], lessons: [...mods[mi].lessons, ''] }
    return { ...d, modules: mods }
  })

  const removeLesson = (mi, li) => setDraft(d => {
    const mods = [...d.modules]
    mods[mi] = { ...mods[mi], lessons: mods[mi].lessons.filter((_, i) => i !== li) }
    return { ...d, modules: mods }
  })

  if (courses === null) return <div className="dashboard-loading">Loading…</div>

  // ── Edit / New form ─────────────────────────────────────────
  if (editingCourse !== null && draft) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <button className="back-btn" style={{ margin: 0 }} onClick={() => { setEditingCourse(null); setDraft(null) }}>← Back to courses</button>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            {editingCourse === 'new' ? 'New course' : `Edit: ${courses[editingCourse]?.name}`}
          </h3>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            {saving ? <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Saving…</span>
              : saved ? <span style={{ fontSize: '0.85rem', color: '#3B6D11' }}>✓ Saved</span> : null}
            <button className="btn-gold" style={{ padding: '0.45rem 1.25rem' }}
              disabled={saving || !draft.name.trim()} onClick={saveDraft}>
              Save course
            </button>
          </div>
        </div>

        {/* Course details */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
          <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.92rem' }}>Course details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-field">
              <label>Course name *</label>
              <input type="text" placeholder="e.g. Elementary English" value={draft.name} onChange={e => updateDraft('name', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Level tag</label>
              <input type="text" placeholder="e.g. A1 → A2" value={draft.tag} onChange={e => updateDraft('tag', e.target.value)} />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea rows={3} placeholder="Short description shown on the card…" value={draft.desc} onChange={e => updateDraft('desc', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-field">
              <label>Schedule</label>
              <input type="text" placeholder="e.g. 6 weeks · 2 lessons/week · 90 min/lesson" value={draft.schedule} onChange={e => updateDraft('schedule', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Card colour</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {COURSE_COLORS.map(c => (
                  <button key={c.value} type="button" title={c.label}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', border: `3px solid ${draft.color === c.value ? '#1a2030' : 'transparent'}`, background: c.value, cursor: 'pointer' }}
                    onClick={() => updateDraft('color', c.value)} />
                ))}
                <input type="color" value={draft.color} onChange={e => updateDraft('color', e.target.value)}
                  title="Custom colour" style={{ width: '28px', height: '28px', padding: 0, border: '1px solid var(--border)', borderRadius: '50%', cursor: 'pointer' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Modules */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.92rem' }}>Modules</h4>
            <button className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.28rem 0.65rem' }} onClick={addModule}>+ Add module</button>
          </div>

          {draft.modules.map((mod, mi) => (
            <div key={mi} style={{ background: '#F8F5EE', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-muted)', flexShrink: 0 }}>Module {mi + 1}</span>
                <input type="text" style={{ flex: 1 }} placeholder="Module title e.g. Module 1 — Getting Started (Lessons 1–2)"
                  value={mod.title} onChange={e => updateModule(mi, 'title', e.target.value)} />
                {draft.modules.length > 1 && (
                  <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.22rem 0.5rem', color: '#e05c5c', flexShrink: 0 }}
                    onClick={() => removeModule(mi)}>✕ Remove</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {mod.lessons.map((lesson, li) => (
                  <div key={li} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: '20px' }}>{li + 1}.</span>
                    <input type="text" style={{ flex: 1, fontSize: '0.85rem' }}
                      placeholder={`Lesson ${li + 1} description…`}
                      value={lesson} onChange={e => updateLesson(mi, li, e.target.value)} />
                    {mod.lessons.length > 1 && (
                      <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', padding: '0.1rem 0.3rem' }}
                        onClick={() => removeLesson(mi, li)}>✕</button>
                    )}
                  </div>
                ))}
                <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.22rem 0.55rem', marginTop: '0.2rem', alignSelf: 'flex-start' }}
                  onClick={() => addLesson(mi)}>+ Add lesson</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Course list ─────────────────────────────────────────────
  return (
    <div style={{ marginTop: '1rem' }}>

      {/* ── Teacher photo ── */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f5ee', borderRadius: '10px', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.75rem' }}>📸 Teacher photo — shown on the homepage</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {heroPhoto ? (
            <img src={heroPhoto} alt="Teacher" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--border)' }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: '8px', background: 'linear-gradient(135deg,#dbeafe,#eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '2px dashed var(--border)' }}>👨‍🏫</div>
          )}
          <div>
            <input ref={heroInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleHeroUpload} />
            <button className="btn-gold" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
              disabled={heroUploading} onClick={() => heroInputRef.current?.click()}>
              {heroUploading ? 'Uploading…' : heroPhoto ? '🔄 Replace photo' : '⬆ Upload photo'}
            </button>
            {heroSaved && <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: '#3B6D11' }}>✓ Saved — live on homepage</span>}
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Recommended: portrait photo, at least 400×500px</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Courses <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({courses.length})</span></h3>
        {saved && <span style={{ fontSize: '0.85rem', color: '#3B6D11' }}>✓ Saved</span>}
        <button className="btn-gold" style={{ marginLeft: 'auto', fontSize: '0.85rem', padding: '0.4rem 1rem' }} onClick={startNew}>
          + Add New Course Info Card
        </button>
      </div>

      <div style={{ background: '#FFF8E7', border: '1.5px dashed #e8c96a', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{ fontSize: '0.78rem', color: '#a07a10', fontWeight: 600, margin: '0 0 0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          🌐 Live — changes here update the public website immediately
        </p>
        {courses.map((c, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e8d99a', borderLeft: `4px solid ${c.color}`, borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', gap: '0.75rem' }}>
                <span style={{ color: c.color, fontWeight: 600 }}>{c.tag}</span>
                <span>{c.modules.length} module{c.modules.length !== 1 ? 's' : ''}</span>
                <span>{c.schedule}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60ch' }}>{c.desc}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
              <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.22rem 0.45rem' }} disabled={i === 0} onClick={() => moveCourse(i, -1)}>▲</button>
              <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.22rem 0.45rem' }} disabled={i === courses.length - 1} onClick={() => moveCourse(i, 1)}>▼</button>
              <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.3rem 0.7rem' }} onClick={() => startEdit(i)}>Edit</button>
              <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.3rem 0.7rem', color: '#e05c5c' }} onClick={() => deleteCourse(i)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: '0.85rem', fontSize: '0.78rem', color: '#a07a10' }}>
        Use ▲▼ to reorder. Changes save immediately to the live website.
      </p>
    </div>
  )
}

// ─── AdminLevels ──────────────────────────────────────────────
export function AdminLevels() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [courseError, setCourseError] = useState(null)
  const [newName, setNewName]     = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName]   = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [allBooks, setAllBooks]   = useState([])
  const [booksLoading, setBooksLoading] = useState(false)
  const [selectedBookId, setSelectedBookId] = useState({})

  const loadBooks = () => {
    setBooksLoading(true)
    fetchAllBooks().then(bks => { setAllBooks(bks); setBooksLoading(false) })
  }

  const refresh = async () => {
    setLoading(true)
    setCourseError(null)
    try {
      let fetched = await fetchAllCourses()

      // One-time migration: if Supabase empty but localStorage has courses, import them
      if (fetched.length === 0) {
        try {
          const stored = localStorage.getItem('admin_courses_v1') || localStorage.getItem('admin_levels_v1')
          if (stored) {
            const local = JSON.parse(stored)
            if (local.length > 0) {
              for (const c of local) {
                try { await createCourse({ name: c.name, linkedBookIds: c.linked_book_ids || [] }) } catch {}
              }
              fetched = await fetchAllCourses()
              localStorage.removeItem('admin_courses_v1')
              localStorage.removeItem('admin_levels_v1')
            }
          }
        } catch {}
      }

      setCourses(fetched)
      setAdminCoursesCache(fetched)
    } catch (e) {
      setCourseError('Could not load courses: ' + (e.message || e))
    }
    setLoading(false)
  }

  useEffect(() => { refresh(); loadBooks() }, [])

  const handleAdd = async () => {
    if (!newName.trim() || saving) return
    setSaving(true); setCourseError(null)
    try {
      await createCourse({ name: newName.trim(), linkedBookIds: [] })
      setNewName('')
      await refresh()
    } catch (e) { setCourseError('Failed to add course: ' + (e.message || e)) }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (saving) return
    setSaving(true); setCourseError(null)
    try { await deleteCourseRecord(id); await refresh() }
    catch (e) { setCourseError('Failed to delete: ' + (e.message || e)) }
    setSaving(false)
  }

  const startEdit = (c) => { setEditingId(c.id); setEditName(c.name) }

  const handleSaveEdit = async (id) => {
    if (saving) return
    setSaving(true); setCourseError(null)
    const course = courses.find(c => c.id === id)
    try {
      await updateCourseRecord(id, { name: editName, linkedBookIds: course?.linked_book_ids || [] })
      setEditingId(null)
      await refresh()
    } catch (e) { setCourseError('Failed to update: ' + (e.message || e)) }
    setSaving(false)
  }

  const handleLinkBook = async (cid) => {
    const bid = selectedBookId[cid]
    if (!bid || saving) return
    const course = courses.find(c => c.id === cid)
    const linked = course?.linked_book_ids || []
    if (linked.includes(bid)) return
    setSaving(true); setCourseError(null)
    try {
      await updateCourseRecord(cid, { name: course.name, linkedBookIds: [...linked, bid] })
      setSelectedBookId(prev => ({ ...prev, [cid]: '' }))
      await refresh()
    } catch (e) { setCourseError('Failed to link book: ' + (e.message || e)) }
    setSaving(false)
  }

  const handleUnlinkBook = async (cid, bid) => {
    if (saving) return
    const course = courses.find(c => c.id === cid)
    const linked = (course?.linked_book_ids || []).filter(id => id !== bid)
    setSaving(true); setCourseError(null)
    try {
      await updateCourseRecord(cid, { name: course.name, linkedBookIds: linked })
      await refresh()
    } catch (e) { setCourseError('Failed to unlink book: ' + (e.message || e)) }
    setSaving(false)
  }

  const downloadBackup = () => {
    const data = JSON.stringify(courses, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `courses-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Courses</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {saving && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Saving…</span>}
          {courses.length > 0 && (
            <button className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }} onClick={downloadBackup}>
              ⬇ Download backup
            </button>
          )}
        </div>
      </div>
      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        Courses are now saved to the cloud and work across all devices.
      </p>

      {courseError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#dc2626' }}>
          {courseError}
        </div>
      )}

      {/* Add new course */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem' }}>+ Add course</h4>
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <input type="text" placeholder="e.g. Elementary English"
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              style={{ width: '100%' }} />
          </div>
          <button className="btn-gold" style={{ padding: '0.5rem 1.25rem', flexShrink: 0 }}
            disabled={!newName.trim() || saving} onClick={handleAdd}>
            Add course
          </button>
        </div>
      </div>

      {/* Course list */}
      {loading ? (
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Loading courses…</p>
      ) : courses.length === 0 ? (
        <div className="dashboard-empty"><p>No courses yet. Add your first course above.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {courses.map(c => {
            const linkedIds = c.linked_book_ids || []
            const linkedBooks = linkedIds.map(id => allBooks.find(b => b.id === id)).filter(Boolean)
            const unlinkableBooks = allBooks.filter(b => !linkedIds.includes(b.id))
            const isExpanded = expandedId === c.id
            return (
              <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                {/* Course header row */}
                {editingId === c.id ? (
                  <div style={{ padding: '0.65rem 0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveEdit(c.id)}
                      style={{ flex: 1 }} autoFocus />
                    <button className="btn-gold" style={{ fontSize: '0.82rem', padding: '0.32rem 0.75rem' }} disabled={saving} onClick={() => handleSaveEdit(c.id)}>Save</button>
                    <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.32rem 0.75rem' }} onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ padding: '0.6rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</span>
                    <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.22rem 0.6rem' }}
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                      📚 Books {linkedBooks.length > 0 ? `(${linkedBooks.length})` : ''} {isExpanded ? '▲' : '▼'}
                    </button>
                    <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.22rem 0.6rem' }} onClick={() => startEdit(c)}>Edit</button>
                    <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.22rem 0.6rem', color: '#e05c5c' }} disabled={saving} onClick={() => handleDelete(c.id)}>Delete</button>
                  </div>
                )}

                {/* Books section (expandable) */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '0.85rem', background: 'rgba(0,0,0,0.02)' }}>

                    {/* Linked books */}
                    {linkedBooks.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
                        {linkedBooks.map(b => (
                          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.45rem 0.75rem' }}>
                            <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem' }}>📚 {b.title}</span>
                            <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: '#e05c5c' }}
                              disabled={saving} onClick={() => handleUnlinkBook(c.id, b.id)}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Link book from Books tab */}
                    {booksLoading ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Loading books…</p>
                    ) : allBooks.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                          No books found. Add books in the <strong>📖 Books</strong> tab first.
                        </p>
                        <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', flexShrink: 0 }}
                          onClick={loadBooks}>↺ Refresh</button>
                      </div>
                    ) : unlinkableBooks.length === 0 ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>All books are linked to this course.</p>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select value={selectedBookId[c.id] || ''}
                          onChange={e => setSelectedBookId(prev => ({ ...prev, [c.id]: e.target.value }))}
                          style={{ flex: 1, fontSize: '0.85rem', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                          <option value="">— Select a book —</option>
                          {unlinkableBooks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                        </select>
                        <button className="btn-gold" style={{ fontSize: '0.82rem', padding: '0.32rem 0.85rem', flexShrink: 0 }}
                          disabled={!selectedBookId[c.id] || saving} onClick={() => handleLinkBook(c.id)}>
                          Link book
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const ALL_ADMIN_TABS = [
  { key: 'calendar',  label: '📅 Calendar' },
  { key: 'prospects', label: '🔍 Prospects', badge: 'prospect' },
  { key: 'students',  label: '👥 Students',  badge: 'pending' },
  { key: 'stages',    label: '📝 Exercise Library' },
  { key: 'plans',     label: '🗂 Lesson Plans' },
  { key: 'books',     label: '📖 Books' },
  { key: 'referrals', label: '🎁 Referrals' },
  { key: 'levels',    label: '🎓 Courses' },
  { key: 'tests',     label: '📋 Tests' },
]

export const ADMIN_COLOR_SCHEMES = [
  { name: 'Oxford Blue',  tabBarBg: '#2563eb', activeTabBg: '#eff6ff', activeTabColor: '#1e3a8a', inactiveTabColor: 'rgba(255,255,255,0.85)' },
  { name: 'Reading Room', tabBarBg: '#2d6a4f', activeTabBg: '#eaf5ee', activeTabColor: '#1a3d2b', inactiveTabColor: 'rgba(255,255,255,0.75)' },
  { name: 'Chancellor',   tabBarBg: '#5c3d8f', activeTabBg: '#ede8f8', activeTabColor: '#2d1a5c', inactiveTabColor: 'rgba(255,255,255,0.78)' },
  { name: 'Chalkboard',   tabBarBg: '#4a5568', activeTabBg: '#f0f2f5', activeTabColor: '#1a202c', inactiveTabColor: 'rgba(255,255,255,0.72)' },
  { name: 'Grammar',      tabBarBg: '#0d9488', activeTabBg: '#e0f7f4', activeTabColor: '#064e38', inactiveTabColor: 'rgba(255,255,255,0.80)' },
  { name: 'Rhetoric',     tabBarBg: '#9d174d', activeTabBg: '#fce4ec', activeTabColor: '#6b0d2d', inactiveTabColor: 'rgba(255,255,255,0.82)' },
  { name: 'Phonetics',    tabBarBg: '#db2777', activeTabBg: '#fce7f3', activeTabColor: '#831843', inactiveTabColor: 'rgba(255,255,255,0.88)' },
  { name: 'Etymology',    tabBarBg: '#a21caf', activeTabBg: '#fdf4ff', activeTabColor: '#4a044e', inactiveTabColor: 'rgba(255,255,255,0.88)' },
  { name: 'Cambridge Blue',    tabBarBg: '#0369a1', activeTabBg: '#e0f2fe', activeTabColor: '#0c4a6e', inactiveTabColor: 'rgba(255,255,255,0.85)' },
  { name: 'Parchment',    tabBarBg: '#7d5a4a', activeTabBg: '#f5ede8', activeTabColor: '#3d1f12', inactiveTabColor: 'rgba(255,255,255,0.80)' },
  { name: 'Study Hall',   tabBarBg: '#4f6480', activeTabBg: '#e8edf5', activeTabColor: '#1e2d3d', inactiveTabColor: 'rgba(255,255,255,0.78)' },
  { name: 'Spring Blossom',  tabBarBg: '#9a4a60', activeTabBg: '#fce8ef', activeTabColor: '#5c1a2e', inactiveTabColor: 'rgba(255,255,255,0.82)' },
  { name: 'Summer Solstice', tabBarBg: '#a84820', activeTabBg: '#fff0ea', activeTabColor: '#5c1a08', inactiveTabColor: 'rgba(255,255,255,0.82)' },
  { name: 'Autumn Harvest',  tabBarBg: '#925a1a', activeTabBg: '#fef3e2', activeTabColor: '#4a2800', inactiveTabColor: 'rgba(255,255,255,0.82)' },
  { name: 'Winter Frost',    tabBarBg: '#1e4a6e', activeTabBg: '#e8f4f8', activeTabColor: '#0c1f2e', inactiveTabColor: 'rgba(255,255,255,0.80)' },
]

export const DEFAULT_ADMIN_THEME = ADMIN_COLOR_SCHEMES[0]

export function AdminPanel({ user, onSignOut }) {
  const [adminEmail,    setAdminEmail]    = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loginError,    setLoginError]    = useState(null)
  const [loginLoading,  setLoginLoading]  = useState(false)
  const [showSettings,  setShowSettings]  = useState(false)
  const [adminTheme,    setAdminTheme]    = useState(() => {
    try {
      const s = localStorage.getItem('admin_theme')
      return s ? { ...DEFAULT_ADMIN_THEME, ...JSON.parse(s) } : DEFAULT_ADMIN_THEME
    } catch { return DEFAULT_ADMIN_THEME }
  })

  const updateTheme = (key, val) => {
    const next = { ...adminTheme, [key]: val }
    setAdminTheme(next)
    try { localStorage.setItem('admin_theme', JSON.stringify(next)) } catch {}
  }
  const resetTheme = () => {
    setAdminTheme(DEFAULT_ADMIN_THEME)
    try { localStorage.removeItem('admin_theme') } catch {}
  }

  const [tabOrder, setTabOrder] = useState(() => {
    try {
      const s = localStorage.getItem('admin_tab_order')
      if (s) {
        const stored = JSON.parse(s)
        // merge: keep stored order, add any new tabs not yet saved
        const allKeys = ALL_ADMIN_TABS.map(t => t.key)
        const merged = [...stored.filter(k => allKeys.includes(k)), ...allKeys.filter(k => !stored.includes(k))]
        return merged
      }
    } catch {}
    return ALL_ADMIN_TABS.map(t => t.key)
  })

  const moveTab = (idx, dir) => {
    const next = [...tabOrder]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setTabOrder(next)
    try { localStorage.setItem('admin_tab_order', JSON.stringify(next)) } catch {}
  }

  const resetTabOrder = () => {
    const def = ALL_ADMIN_TABS.map(t => t.key)
    setTabOrder(def)
    try { localStorage.removeItem('admin_tab_order') } catch {}
  }

  const orderedTabs = tabOrder.map(key => ALL_ADMIN_TABS.find(t => t.key === key)).filter(Boolean)
  const [students,      setStudents]      = useState([])
  const [dataLoading,   setDataLoading]   = useState(false)
  const [selected,               setSelected]               = useState(null)
  const [reviewingFromStudent,   setReviewingFromStudent]   = useState(null) // assignment details for inline review
  const [adminTab,               setAdminTab]               = useState('stages')
  const [accessLevel,   setAccessLevel]   = useState('pending')
  const [accessSaving,  setAccessSaving]  = useState(false)
  const [accessSaved,   setAccessSaved]   = useState(false)
  const [engLevel,      setEngLevel]      = useState('')
  const [engLevelSaving, setEngLevelSaving] = useState(false)
  const [engLevelSaved,  setEngLevelSaved]  = useState(false)

  // Manual students
  const [manualStudents,      setManualStudents]      = useState([])
  const [selectedManual,      setSelectedManual]      = useState(null)
  const [editManualLevel,     setEditManualLevel]     = useState('')
  const [editManualLevelSaving, setEditManualLevelSaving] = useState(false)
  const [editManualLevelSaved,  setEditManualLevelSaved]  = useState(false)
  const [adminOpenPlan,       setAdminOpenPlan]       = useState(null) // plan opened from student profile

  // Add student form
  const [showAddStudentForm, setShowAddStudentForm] = useState(false)
  const [newStudentName,     setNewStudentName]     = useState('')
  const [newStudentEmail,    setNewStudentEmail]    = useState('')
  const [newStudentLevel,    setNewStudentLevel]    = useState('')
  const [newStudentNotes,    setNewStudentNotes]    = useState('')
  const [addStudentSaving,   setAddStudentSaving]   = useState(false)
  const [addStudentError,    setAddStudentError]    = useState(null)

  const isAdmin      = user?.email === ADMIN_EMAIL
  const pendingCount = students.filter(s => s.access_level === 'pending').length

  // Referrals state
  const [allReferrals,        setAllReferrals]        = useState([])
  const [referralsLoading,    setReferralsLoading]    = useState(false)

  // Prospects state
  const [prospects,           setProspects]           = useState([])
  const [prospectsLoading,    setProspectsLoading]    = useState(false)
  const [prospectCount,       setProspectCount]       = useState(0)
  // Unreviewed submissions per student (studentId → count of submitted & not-yet-reviewed)
  const [unreviewed,          setUnreviewed]          = useState({})
  // Student archive
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState(null) // student id awaiting confirm
  const [showStudentArchive,   setShowStudentArchive]   = useState(false)
  const [archivedStudents,     setArchivedStudents]     = useState({ auth: [], manual: [] })
  const [studentArchiveLoading, setStudentArchiveLoading] = useState(false)
  const [archivedProspects,   setArchivedProspects]   = useState([])
  const [showArchived,        setShowArchived]        = useState(false)
  const [archivedLoading,     setArchivedLoading]     = useState(false)
  const [confirmConvertId,    setConfirmConvertId]    = useState(null) // prospect id awaiting convert confirm
  const [convertingSaving,    setConvertingSaving]    = useState(false)
  // Students tab: assign test
  const [assigningTestToStudent, setAssigningTestToStudent] = useState(null) // student obj
  const [studentTestId,       setStudentTestId]       = useState('general_placement_v1')
  const [studentTestSaving,   setStudentTestSaving]   = useState(false)
  const [studentTestLinks,    setStudentTestLinks]    = useState({}) // studentId → assignmentId
  const [studentTestSent,     setStudentTestSent]     = useState({}) // studentId → true
  const [copiedStudentId,     setCopiedStudentId]     = useState(null)

  // Prospects tab: assign test
  const [assigningTestToProspect, setAssigningTestToProspect] = useState(null) // prospect obj
  const [prospectTestId,      setProspectTestId]      = useState('general_placement_v1')
  const [prospectTestSaving,  setProspectTestSaving]  = useState(false)
  const [prospectTestLinks,   setProspectTestLinks]   = useState({}) // prospectId → assignmentId
  const [prospectTestSent,    setProspectTestSent]    = useState({}) // prospectId → true
  const [copiedProspectId,    setCopiedProspectId]    = useState(null)

  useEffect(() => {
    if (!isAdmin || !supabase) return
    setDataLoading(true)
    Promise.all([fetchStudentsAdmin(), fetchManualStudents()]).then(([authData, manualData]) => {
      setStudents(authData)
      setManualStudents(manualData)
      setDataLoading(false)
    })
    // Load initial prospect count for badge
    fetchAllProspects().then(data => {
      setProspects(data)
      setProspectCount(data.filter(p => p.status === 'new').length)
    })
    refreshUnreviewed()
  }, [isAdmin])

  // Count submitted-but-not-reviewed exercises per student (for the "needs review" badges)
  const refreshUnreviewed = () => {
    fetchAllAssignmentsAdmin().then(asgns => {
      const map = {}
      asgns.forEach(a => {
        if (a.status === 'submitted' && !a.feedback_at) map[a.student_id] = (map[a.student_id] || 0) + 1
      })
      setUnreviewed(map)
    })
  }
  const unreviewedTotal = Object.values(unreviewed).reduce((a, b) => a + b, 0)

  // Load referrals when Referrals tab is opened
  useEffect(() => {
    if (adminTab !== 'referrals' || !isAdmin || !supabase) return
    setReferralsLoading(true)
    fetchAllReferrals().then(data => {
      setAllReferrals(data)
      setReferralsLoading(false)
    })
  }, [adminTab, isAdmin])

  // Load prospects when Prospects tab is opened
  useEffect(() => {
    if (adminTab !== 'prospects' || !isAdmin) return
    setProspectsLoading(true)
    fetchAllProspects().then(data => {
      setProspects(data)
      setProspectCount(data.filter(p => p.status === 'new').length)
      setProspectsLoading(false)
    })
  }, [adminTab, isAdmin])

  const handleToggleDiscount = async (ref) => {
    const newVal = !ref.discount_applied
    // Optimistic update
    setAllReferrals(prev => prev.map(r => r.id === ref.id ? { ...r, discount_applied: newVal } : r))
    await markDiscountApplied(ref.id, newVal)
  }

  // Lock the browser back button while inside the admin panel so the admin
  // never accidentally navigates away from /admin.
  useEffect(() => {
    if (!isAdmin) return
    window.history.replaceState({ adminPage: true }, '', '/admin')
    const handlePop = () => {
      window.history.pushState({ adminPage: true }, '', '/admin')
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [isAdmin])

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
    setLoginLoading(false)
    if (error) { setLoginError(error.message); return }
    if (data.user?.email !== ADMIN_EMAIL) {
      await supabase.auth.signOut()
      setLoginError('This account does not have admin access.')
    }
  }

  const handleConvertProspect = async (prospect) => {
    // 1. Send Supabase invitation email
    let userId = null
    try {
      const res = await fetch('/api/invite-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: prospect.email, name: prospect.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invite failed')
      userId = data.userId
    } catch (err) {
      alert('Could not send invitation: ' + err.message)
      return
    }

    // 2. Transfer any existing test assignments from manual_student to real student
    const existingMs = await findManualStudentByEmail(prospect.email)
    if (existingMs && userId) {
      await transferTestAssignments(existingMs.id, userId)
    }

    // 3. Mark prospect as converted and remove from list
    await updateProspectStatus(prospect.id, 'converted')
    setProspects(prev => prev.filter(p => p.id !== prospect.id))
    setProspectCount(prev => Math.max(0, prev - (prospect.status === 'new' ? 1 : 0)))

    alert(`Invitation sent to ${prospect.email}. They will receive an email to set their password.`)
  }

  const handleAssignTestToProspect = async (prospect) => {
    setProspectTestSaving(true)
    // Find or create a manual_student for this prospect
    let ms = await findManualStudentByEmail(prospect.email)
    if (!ms) {
      ms = await createManualStudent({ name: prospect.name, email: prospect.email, createdBy: user.id })
    }
    if (!ms) { setProspectTestSaving(false); return }
    const assignment = await createTestAssignment({
      testId: prospectTestId,
      manualStudentId: ms.id,
      assignedBy: user.id,
    })
    if (assignment) {
      setProspectTestLinks(prev => ({ ...prev, [prospect.id]: assignment.id }))
      setAssigningTestToProspect(null)
      // Auto-send email to prospect with test link
      const testLink = `${window.location.origin}/?t=${assignment.id}`
      const testDef = TEST_DEFINITIONS.find(t => t.id === prospectTestId)
      try {
        const emailRes = await fetch('/api/send-test-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: prospect.email,
            name: prospect.name,
            testName: testDef?.label || 'English Diagnostic Test',
            testLink,
          }),
        })
        if (emailRes.ok) {
          setProspectTestSent(prev => ({ ...prev, [prospect.id]: true }))
        }
      } catch (err) {
        console.error('[handleAssignTestToProspect] email send failed:', err)
        // Non-fatal — assignment is already created
      }
    }
    setProspectTestSaving(false)
  }

  const copyTestLink = (assignmentId, prospectId) => {
    const url = `${window.location.origin}/?t=${assignmentId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedProspectId(prospectId)
      setTimeout(() => setCopiedProspectId(null), 2000)
    })
  }

  const handleProspectStatusChange = async (prospect, newStatus) => {
    const ok = await updateProspectStatus(prospect.id, newStatus)
    if (ok) {
      setProspects(prev => {
        const updated = prev.map(p => p.id === prospect.id ? { ...p, status: newStatus } : p)
        setProspectCount(updated.filter(p => p.status === 'new').length)
        return updated
      })
    }
  }

  const handleArchiveProspect = async (prospect) => {
    const ok = await updateProspectStatus(prospect.id, 'archived')
    if (ok) {
      setProspects(prev => {
        const updated = prev.filter(p => p.id !== prospect.id)
        setProspectCount(updated.filter(p => p.status === 'new').length)
        return updated
      })
    }
  }

  const handleConvertToStudent = async (prospect) => {
    setConvertingSaving(true)
    const ms = await createManualStudent({ name: prospect.name, email: prospect.email, createdBy: user.id })
    if (ms) {
      await updateProspectStatus(prospect.id, 'enrolled')
      setProspects(prev => prev.map(p => p.id === prospect.id ? { ...p, status: 'enrolled' } : p))
      setManualStudents(prev => [...prev, ms])
    }
    setConvertingSaving(false)
    setConfirmConvertId(null)
  }

  const handleAssignTestToStudent = async (student, isManual = false) => {
    setStudentTestSaving(true)
    const assignment = await createTestAssignment({
      testId: studentTestId,
      ...(isManual ? { manualStudentId: student.id } : { studentId: student.id }),
      assignedBy: user.id,
    })
    if (assignment) {
      setStudentTestLinks(prev => ({ ...prev, [student.id]: assignment.id }))
      setAssigningTestToStudent(null)
      const testLink = `${window.location.origin}/?t=${assignment.id}`
      const testDef = TEST_DEFINITIONS.find(t => t.id === studentTestId)
      if (student.email) {
        try {
          const emailRes = await fetch('/api/send-test-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: student.email,
              name: student.name || 'Student',
              testName: testDef?.label || 'English Diagnostic Test',
              testLink,
            }),
          })
          if (emailRes.ok) setStudentTestSent(prev => ({ ...prev, [student.id]: true }))
        } catch {}
      }
    }
    setStudentTestSaving(false)
  }

  const copyStudentTestLink = (studentId) => {
    const url = `${window.location.origin}/?t=${studentTestLinks[studentId]}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedStudentId(studentId)
      setTimeout(() => setCopiedStudentId(null), 2000)
    })
  }

  const openStudent = (s) => {
    setSelected(s)
    setAccessLevel(s.access_level || 'pending')
    setAccessSaved(false)
    setEngLevel(s.english_level || '')
    setEngLevelSaved(false)
  }

  const handleEngLevelSave = async () => {
    setEngLevelSaving(true)
    const ok = await updateStudentEnglishLevel(selected.id, engLevel || null)
    setEngLevelSaving(false)
    if (ok) {
      const updated = { ...selected, english_level: engLevel || null }
      setSelected(updated)
      setStudents(prev => prev.map(s => s.id === selected.id ? { ...s, english_level: engLevel || null } : s))
      setEngLevelSaved(true)
      setTimeout(() => setEngLevelSaved(false), 2500)
    }
  }

  const handleAccessSave = async (levelOverride) => {
    const lvl = levelOverride ?? accessLevel
    setAccessSaving(true)
    const ok = await updateStudentAccessLevel(selected.id, lvl)
    setAccessSaving(false)
    if (ok) {
      const updated = { ...selected, access_level: lvl }
      setSelected(updated)
      setAccessLevel(lvl)
      setStudents(prev => prev.map(s => s.id === selected.id ? { ...s, access_level: lvl } : s))
      setAccessSaved(true)
      setTimeout(() => setAccessSaved(false), 2500)
    }
  }

  const openStudentReview = async (asgn) => {
    const details = await fetchAssignmentDetails(asgn.id)
    if (details) setReviewingFromStudent(details)
  }

  const openManualStudent = (s) => {
    setSelectedManual(s)
    setEditManualLevel(s.english_level || '')
    setEditManualLevelSaved(false)
  }

  // ── Student archive (soft delete) ──
  const refreshStudentArchive = () => {
    setStudentArchiveLoading(true)
    fetchArchivedStudentsAll().then(data => { setArchivedStudents(data); setStudentArchiveLoading(false) })
  }
  const archiveStudent = async (s, isManual) => {
    const ok = isManual ? await setManualStudentArchived(s.id, true) : await setStudentArchived(s.id, true)
    if (!ok) {
      alert('Could not archive this student. The "Student Archive" feature needs a one-time database setup — please run the archive SQL in Supabase, then try again.')
      return
    }
    setConfirmDeleteStudent(null)
    if (isManual) setManualStudents(prev => prev.filter(x => x.id !== s.id))
    else          setStudents(prev => prev.filter(x => x.id !== s.id))
    setArchivedStudents(prev => isManual
      ? { ...prev, manual: [s, ...prev.manual] }
      : { ...prev, auth: [s, ...prev.auth] })
  }
  const restoreStudent = async (s, isManual) => {
    const ok = isManual ? await setManualStudentArchived(s.id, false) : await setStudentArchived(s.id, false)
    if (!ok) { alert('Could not restore this student. Please try again.'); return }
    setArchivedStudents(prev => isManual
      ? { ...prev, manual: prev.manual.filter(x => x.id !== s.id) }
      : { ...prev, auth: prev.auth.filter(x => x.id !== s.id) })
    if (isManual) setManualStudents(prev => [s, ...prev])
    else          setStudents(prev => [s, ...prev])
  }
  const renderDeleteControl = (s, isManual) => (
    confirmDeleteStudent === s.id ? (
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
        <span style={{ fontSize: '0.76rem', color: '#b91c1c', fontWeight: 600 }}>Archive?</span>
        <button className="btn-ghost" style={{ fontSize: '0.74rem', padding: '0.18rem 0.5rem', color: '#b91c1c', borderColor: '#fca5a5' }}
          onClick={e => { e.stopPropagation(); archiveStudent(s, isManual) }}>Confirm</button>
        <button className="btn-ghost" style={{ fontSize: '0.74rem', padding: '0.18rem 0.5rem' }}
          onClick={e => { e.stopPropagation(); setConfirmDeleteStudent(null) }}>Cancel</button>
      </div>
    ) : (
      <button title="Delete student (move to archive)"
        onClick={e => { e.stopPropagation(); setConfirmDeleteStudent(s.id) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', flexShrink: 0, padding: '0.2rem 0.35rem', lineHeight: 1 }}>🗑</button>
    )
  )

  const handleManualLevelSave = async () => {
    setEditManualLevelSaving(true)
    const { error } = await supabase.from('manual_students')
      .update({ english_level: editManualLevel || null })
      .eq('id', selectedManual.id)
    setEditManualLevelSaving(false)
    if (!error) {
      setManualStudents(prev => prev.map(s =>
        s.id === selectedManual.id ? { ...s, english_level: editManualLevel || null } : s))
      setSelectedManual(prev => ({ ...prev, english_level: editManualLevel || null }))
      setEditManualLevelSaved(true)
      setTimeout(() => setEditManualLevelSaved(false), 2500)
    }
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()
    if (!newStudentName.trim()) return
    setAddStudentSaving(true)
    setAddStudentError(null)
    const created = await createManualStudent({
      name: newStudentName, email: newStudentEmail,
      englishLevel: newStudentLevel, notes: newStudentNotes,
      createdBy: user.id,
    })
    setAddStudentSaving(false)
    if (created) {
      setManualStudents(prev => [created, ...prev])
      setShowAddStudentForm(false)
      setNewStudentName(''); setNewStudentEmail('')
      setNewStudentLevel(''); setNewStudentNotes('')
    } else {
      setAddStudentError('Could not save — check the console for details.')
    }
  }

  if (!supabase) {
    return (
      <div className="flow-card text-center">
        <span className="confirmation-icon">⚠️</span>
        <h2>Database not connected</h2>
        <p className="flow-sub">Set up Supabase environment variables to enable the admin panel.</p>
      </div>
    )
  }

  // Not logged in as admin → login form
  if (!isAdmin) {
    return (
      <div className="flow-card">
        <h2>Admin access</h2>
        <p className="flow-sub">Sign in with Dogukan's account to access the admin panel.</p>
        <form onSubmit={handleAdminLogin} className="booking-form" style={{ marginTop: '1.5rem' }}>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
          </div>
          {loginError && <div className="auth-error">{loginError}</div>}
          <button type="submit" className="btn-gold btn-full btn-lg" disabled={loginLoading}>
            {loginLoading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>
      </div>
    )
  }

  // Exercise review from student profile
  if (reviewingFromStudent) {
    return (
      <div className="flow-card admin-detail">
        <AdminExerciseReview
          details={reviewingFromStudent}
          onBack={() => { setReviewingFromStudent(null); refreshUnreviewed() }}
        />
      </div>
    )
  }

  // Manual student detail view
  if (selectedManual) {
    return (
      <div className="flow-card admin-detail">
        {adminOpenPlan ? (
          <AdminStudentPlanView
            plan={adminOpenPlan.plan}
            studentId={adminOpenPlan.studentId}
            studentName={adminOpenPlan.studentName}
            adminUserId={user?.id}
            adminEmail={ADMIN_EMAIL}
            onBack={() => { setAdminOpenPlan(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          />
        ) : (
          <>
            <button className="back-btn" onClick={() => setSelectedManual(null)}>← Back to students</button>
            <div className="admin-detail-header">
              <div>
                <h2 style={{ marginBottom: '0.2rem' }}>{selectedManual.name}</h2>
                {selectedManual.email && <p className="admin-email">{selectedManual.email}</p>}
                <p className="admin-date">Added {new Date(selectedManual.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <span className="admin-level-chip" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Manual student</span>
            </div>

            <div className="admin-section">
              <h3>English level</h3>
              <div className="admin-access-row">
                <select className="admin-access-select" value={editManualLevel}
                  onChange={e => setEditManualLevel(e.target.value)}>
                  <option value="">Not set</option>
                  <option value="elementary">Elementary</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                <button className="btn-gold" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                  onClick={handleManualLevelSave}
                  disabled={editManualLevelSaving || editManualLevel === (selectedManual.english_level || '')}>
                  {editManualLevelSaving ? 'Saving…' : 'Save'}
                </button>
                {editManualLevelSaved && <span style={{ color: '#4ade80', fontSize: '0.9rem' }}>✓ Saved</span>}
              </div>
            </div>

            {selectedManual.notes && (
              <div className="admin-section">
                <h3>Notes</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.65' }}>{selectedManual.notes}</p>
              </div>
            )}

            {/* Lesson plans for this manual student (full plan rows with all actions) */}
            <div className="admin-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <AdminLessonPlans
                adminUserId={user.id}
                studentScope={{ id: selectedManual.id, name: selectedManual.name || selectedManual.email, email: selectedManual.email, isManual: true }}
              />
            </div>
          </>
        )}
      </div>
    )
  }

  // Student detail view
  if (selected) {
    const sub    = selected.questionnaire_submissions?.[0]
    const result = sub?.placement_results?.[0]
    return (
      <div className="flow-card admin-detail">
        <button className="back-btn" onClick={() => setSelected(null)}>← Back to students</button>

        <div className="admin-detail-header">
          <div>
            <h2 style={{ marginBottom: '0.2rem' }}>{selected.name || 'Student'}</h2>
            <p className="admin-email">{selected.email}</p>
            <p className="admin-date">Joined {new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <AccessBadge level={selected.access_level} />
        </div>

        {/* ── Prospect banner ── */}
        {selected.access_level === 'prospect' && (
          <div style={{ background: '#FDF6E0', border: '1px solid #e8d99a', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>🎓 Prospect status</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>This student can only see their diagnostic test. Activate them to give full access.</div>
            </div>
            <button className="btn-gold" style={{ flexShrink: 0, padding: '0.5rem 1.25rem' }}
              disabled={accessSaving}
              onClick={() => handleAccessSave('approved')}>
              {accessSaving ? 'Saving…' : '✓ Activate as student'}
            </button>
          </div>
        )}

        {/* ── Access level management ── */}
        <div className="admin-section">
          <h3>Access level</h3>
          <div className="admin-access-row">
            <select className="admin-access-select" value={accessLevel}
              onChange={e => setAccessLevel(e.target.value)}>
              <option value="pending">Pending approval</option>
              <option value="test_approved">Placement test access</option>
              <option value="trial">Trial access</option>
              <option value="pay_per_lesson">Pay per lesson</option>
              <option value="bundle_12">Bundle — 12 lessons</option>
            </select>
            <button className="btn-gold" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              onClick={() => handleAccessSave()}
              disabled={accessSaving || accessLevel === selected.access_level}>
              {accessSaving ? 'Saving…' : 'Save'}
            </button>
            {accessSaved && <span style={{ color: '#4ade80', fontSize: '0.9rem' }}>✓ Saved</span>}
          </div>
          {selected.access_level === 'pending' && (
            <button className="btn-gold" style={{ marginTop: '0.6rem', fontSize: '0.85rem' }}
              onClick={() => handleAccessSave('test_approved')} disabled={accessSaving}>
              ✓ Approve for placement test
            </button>
          )}
          {selected.access_level === 'test_approved' && result && (
            <button className="btn-gold" style={{ marginTop: '0.6rem', fontSize: '0.85rem' }}
              onClick={() => handleAccessSave('trial')} disabled={accessSaving}>
              ✓ Approve free lesson
            </button>
          )}
        </div>

        {/* ── English level ── */}
        <div className="admin-section">
          <h3>English level</h3>
          <div className="admin-access-row">
            <select className="admin-access-select" value={engLevel}
              onChange={e => setEngLevel(e.target.value)}>
              <option value="">Not set</option>
              <option value="elementary">Elementary</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <button className="btn-gold" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              onClick={handleEngLevelSave}
              disabled={engLevelSaving || engLevel === (selected.english_level || '')}>
              {engLevelSaving ? 'Saving…' : 'Save'}
            </button>
            {engLevelSaved && <span style={{ color: '#4ade80', fontSize: '0.9rem' }}>✓ Saved</span>}
          </div>
        </div>

        {/* ── Placement result ── */}
        {result ? (
          <div className="admin-section">
            <h3>Placement test</h3>
            <div className="admin-scores">
              <span className="admin-level-badge">{result.cefr_level}</span>
              <span>Overall: <strong>{result.overall_score}%</strong></span>
              {result.writing_reviewed
                ? <span className="reviewed-badge">✓ Writing reviewed</span>
                : <span className="pending-badge">Writing pending</span>}
            </div>
            {result.grammar_score != null && (
              <div style={{ marginTop: '0.6rem', fontSize: '0.88rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span>Grammar: <strong>{result.grammar_score}%</strong></span>
                <span>Vocabulary: <strong>{result.vocabulary_score}%</strong></span>
                <span>Tenses: <strong>{result.reading_score}%</strong></span>
              </div>
            )}
            {result.writing_answer && result.writing_answer.trim() && (
              <details style={{ marginTop: '0.75rem' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.88rem', color: 'var(--gold)', fontWeight: 600 }}>
                  Writing answers ↓
                </summary>
                <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.84rem', background: 'var(--surface-2, #f8f8f8)', borderRadius: '6px', padding: '0.75rem', color: 'var(--text)' }}>
                  {result.writing_answer}
                </pre>
              </details>
            )}
          </div>
        ) : sub ? (
          <div className="admin-section">
            <p className="flow-sub" style={{ fontSize: '0.88rem' }}>
              Questionnaire answered — no placement test taken yet.
            </p>
          </div>
        ) : (
          <div className="admin-section">
            <p className="flow-sub" style={{ fontSize: '0.88rem' }}>No questionnaire completed yet.</p>
          </div>
        )}

        {/* ── Exercise assignments ── */}
        {!adminOpenPlan && (
          <AdminStudentExercises student={selected} onReview={openStudentReview} adminUserId={user?.id} />
        )}

        {/* ── Assigned lesson plans (full plan rows: Teach / Assign / View / Edit / Duplicate / Delete) ── */}
        {!adminOpenPlan && (
          <div className="admin-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <AdminLessonPlans
              adminUserId={user.id}
              studentScope={{ id: selected.id, name: selected.name || selected.email, email: selected.email, isManual: false }}
            />
          </div>
        )}

        {/* ── Lessons (single entry point — plan opens from within a lesson) ── */}
        {adminOpenPlan ? (
          <AdminStudentPlanView
            plan={adminOpenPlan.plan}
            studentId={adminOpenPlan.studentId}
            studentName={adminOpenPlan.studentName}
            adminUserId={user?.id}
            adminEmail={ADMIN_EMAIL}
            onBack={() => { setAdminOpenPlan(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          />
        ) : (
          <AdminStudentLessons
            student={selected}
            adminUserId={user.id}
            onOpenPlan={(p) => { setAdminOpenPlan({ plan: p, studentId: selected.id, studentName: selected.name || selected.email }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          />
        )}
      </div>
    )
  }

  // Student list view
  const pendingStudents = students.filter(s => s.access_level === 'pending')
  const activeStudents  = students.filter(s => s.access_level !== 'pending')

  return (
    <div className="flow-card admin-panel">
      {/* Dynamic theme injection */}
      <style>{`
        .admin-tabs { background: ${adminTheme.tabBarBg} !important; }
        .admin-tab  { color: ${adminTheme.inactiveTabColor} !important; }
        .admin-tab.active { background: ${adminTheme.activeTabBg} !important; color: ${adminTheme.activeTabColor} !important; }
        .admin-tab--homepage { background: rgba(180,220,130,0.18) !important; }
        .admin-tab--homepage.active { background: #eaf5d8 !important; color: #2a5010 !important; }
        .admin-create-btn { background: ${adminTheme.tabBarBg} !important; border-color: ${adminTheme.tabBarBg} !important; color: #fff !important; }
        .admin-create-btn:hover { filter: brightness(1.12) !important; }
      `}</style>

      <div className="admin-header">
        <div>
          <h2>Admin panel</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Gear icon with attached dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              title="Appearance settings"
              onClick={() => setShowSettings(p => !p)}
              style={{
                background: showSettings ? '#FFFBF0' : 'none',
                border: `1px solid ${showSettings ? '#e8d99a' : 'var(--border)'}`,
                borderBottom: showSettings ? '1px solid #FFFBF0' : `1px solid var(--border)`,
                borderRadius: showSettings ? '7px 7px 0 0' : '7px',
                cursor: 'pointer', fontSize: '1.1rem', padding: '0.3rem 0.55rem',
                lineHeight: 1, transition: 'background 0.15s',
                position: 'relative', zIndex: 11,
              }}>
              ⚙️
            </button>

            {showSettings && (
              <div style={{
                position: 'absolute', top: '100%', right: 0,
                background: '#FFFBF0', border: '1px solid #e8d99a',
                borderRadius: '10px 0 10px 10px',
                padding: '1rem 1.25rem', zIndex: 10,
                width: '420px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <strong style={{ fontSize: '0.92rem' }}>Tab bar colour scheme</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {ADMIN_COLOR_SCHEMES.map((scheme, si) => {
                    const isActive = adminTheme.tabBarBg === scheme.tabBarBg
                    return (
                      <button key={si} type="button"
                        onClick={() => { setAdminTheme(scheme); try { localStorage.setItem('admin_theme', JSON.stringify(scheme)) } catch {} }}
                        style={{
                          border: `2px solid ${isActive ? '#1a2030' : 'transparent'}`,
                          borderRadius: '10px', cursor: 'pointer', padding: '0', overflow: 'hidden',
                          background: 'none', outline: 'none', flexShrink: 0,
                          boxShadow: isActive ? '0 0 0 1px #1a2030' : '0 1px 4px rgba(0,0,0,0.15)',
                        }}>
                        {/* Mini tab bar preview */}
                        <div style={{ background: scheme.tabBarBg, padding: '5px 8px 0', display: 'flex', gap: '3px', width: '110px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '4px 4px 0 0', padding: '3px 7px', fontSize: '9px', color: 'rgba(255,255,255,0.75)' }}>Tab</div>
                          <div style={{ background: scheme.activeTabBg, borderRadius: '4px 4px 0 0', padding: '3px 7px', fontSize: '9px', color: scheme.activeTabColor, fontWeight: 700 }}>Active</div>
                          <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '4px 4px 0 0', padding: '3px 7px', fontSize: '9px', color: 'rgba(255,255,255,0.75)' }}>Tab</div>
                        </div>
                        <div style={{ background: '#fff', padding: '4px 8px', fontSize: '10px', fontWeight: isActive ? 700 : 400, color: '#1a2030', textAlign: 'center', fontFamily: 'inherit' }}>
                          {scheme.name} {isActive && '✓'}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  Click a scheme to apply it instantly. Your choice is saved to the browser.
                </p>

                {/* Tab order */}
                <div style={{ borderTop: '1px solid #e8d99a', marginTop: '0.85rem', paddingTop: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.6rem' }}>
                    <strong style={{ fontSize: '0.85rem' }}>Tab order</strong>
                    <button className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.18rem 0.5rem', marginLeft: 'auto' }}
                      onClick={resetTabOrder}>↺ Reset order</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {orderedTabs.map((tab, idx) => (
                      <div key={tab.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', border: '1px solid #e8d99a', borderRadius: '6px', padding: '0.28rem 0.6rem', fontSize: '0.82rem' }}>
                        <span style={{ flex: 1 }}>{tab.label}</span>
                        <button type="button" disabled={idx === 0}
                          onClick={() => moveTab(idx, -1)}
                          style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, fontSize: '0.75rem', padding: '0.1rem 0.3rem' }}>▲</button>
                        <button type="button" disabled={idx === orderedTabs.length - 1}
                          onClick={() => moveTab(idx, 1)}
                          style={{ background: 'none', border: 'none', cursor: idx === orderedTabs.length - 1 ? 'default' : 'pointer', opacity: idx === orderedTabs.length - 1 ? 0.3 : 1, fontSize: '0.75rem', padding: '0.1rem 0.3rem' }}>▼</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button className="btn-ghost" onClick={onSignOut}>Sign out</button>
        </div>
      </div>

      {/* Tab bar — order controlled by settings */}
      <div className="admin-tabs">
        {orderedTabs.map(tab => (
          <button key={tab.key} className={`admin-tab ${adminTab === tab.key ? 'active' : ''}`}
            onClick={() => setAdminTab(tab.key)}>
            {tab.label}
            {tab.badge === 'prospect' && prospectCount > 0 && <span className="admin-tab-badge">{prospectCount}</span>}
            {tab.badge === 'pending'  && pendingCount  > 0 && <span className="admin-tab-badge">{pendingCount}</span>}
            {tab.key === 'students' && unreviewedTotal > 0 && (
              <span className="admin-tab-badge" title="Exercises waiting to be reviewed"
                style={{ background: '#e05c5c' }}>{unreviewedTotal}</span>
            )}
          </button>
        ))}
        <button className={`admin-tab admin-tab--homepage ${adminTab === 'courses' ? 'active' : ''}`}
          onClick={() => setAdminTab('courses')}>
          🌐 Edit Home Page
        </button>
      </div>

      {/* Calendar tab */}
      {adminTab === 'calendar' && <AdminCalendar />}

      {/* Lesson Stages tab */}
      {adminTab === 'stages' && <AdminLessonStages adminUserId={user?.id} />}

      {/* Lesson Plans tab */}
      {adminTab === 'plans' && <AdminLessonPlans adminUserId={user?.id} />}

      {/* Books tab */}
      {adminTab === 'books' && <AdminBooks adminUserId={user?.id} />}


      {/* Referrals tab */}
      {adminTab === 'referrals' && (
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.85rem' }}>Referral activity</h3>
          {referralsLoading ? (
            <div className="dashboard-loading">Loading referrals…</div>
          ) : allReferrals.length === 0 ? (
            <p className="dashboard-empty-small">No referrals yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e8e3d8', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Referred by</th>
                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Referred email</th>
                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Discount</th>
                  </tr>
                </thead>
                <tbody>
                  {allReferrals.map(ref => (
                    <tr key={ref.id} style={{ borderBottom: '1px solid #f0ece4' }}>
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        <strong>{ref.referrer?.name || '—'}</strong>
                        {ref.referrer?.email && (
                          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ref.referrer.email}</span>
                        )}
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)' }}>{ref.referred_email}</td>
                      <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(ref.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        <button
                          className={ref.discount_applied ? 'btn-gold' : 'btn-ghost'}
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem', whiteSpace: 'nowrap' }}
                          onClick={() => handleToggleDiscount(ref)}
                        >
                          {ref.discount_applied ? 'Discount given ✓' : 'Mark discount given'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Courses tab */}
      {adminTab === 'courses' && <AdminCourses />}

      {/* Levels tab */}
      {adminTab === 'levels' && <AdminLevels />}

      {/* Tests tab */}
      {adminTab === 'tests' && <AdminTests adminUserId={user?.id} students={students} manualStudents={manualStudents} />}

      {/* Prospects tab */}
      {adminTab === 'prospects' && (
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.85rem' }}>Prospects</h3>
          {prospectsLoading ? (
            <div className="dashboard-loading">Loading prospects…</div>
          ) : prospects.length === 0 && !showArchived ? (
            <p className="dashboard-empty-small">No prospects yet. They'll appear here when someone fills in the consultation booking form.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {prospects.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e8e3d8', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Name</th>
                      <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Phone</th>
                      <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospects.map(p => {
                      const statusColors = {
                        new:       { bg: '#dbeafe', color: '#1d4ed8' },
                        contacted: { bg: '#fef9c3', color: '#92400e' },
                        enrolled:  { bg: '#dcfce7', color: '#166534' },
                        declined:  { bg: '#e5e7eb', color: '#6b7280' },
                      }
                      const sc = statusColors[p.status] || { bg: '#e5e7eb', color: '#6b7280' }
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f0ece4' }}>
                          <td style={{ padding: '0.55rem 0.75rem' }}><strong>{p.name}</strong></td>
                          <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)' }}>{p.email}</td>
                          <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)' }}>{p.phone || '—'}</td>
                          <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '0.55rem 0.75rem' }}>
                            <span style={{ display: 'inline-block', borderRadius: '0.9rem', padding: '0.18rem 0.6rem', fontSize: '0.78rem', fontWeight: 600, background: sc.bg, color: sc.color }}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.55rem 0.75rem' }}>
                            {confirmConvertId === p.id ? (
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Convert to student?</span>
                                <button className="btn-gold" style={{ fontSize: '0.78rem', padding: '0.22rem 0.65rem', background: '#16a34a', borderColor: '#16a34a' }}
                                  disabled={convertingSaving} onClick={() => handleConvertToStudent(p)}>
                                  {convertingSaving ? '…' : 'Confirm'}
                                </button>
                                <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.22rem 0.55rem' }}
                                  onClick={() => setConfirmConvertId(null)}>Cancel</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {p.status !== 'contacted' && p.status !== 'enrolled' && (
                                  <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.22rem 0.55rem' }}
                                    onClick={() => handleProspectStatusChange(p, 'contacted')}>
                                    Mark contacted
                                  </button>
                                )}
                                {p.status !== 'declined' && p.status !== 'enrolled' && (
                                  <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.22rem 0.55rem', color: '#9ca3af' }}
                                    onClick={() => handleProspectStatusChange(p, 'declined')}>
                                    Decline
                                  </button>
                                )}
                                {p.status !== 'enrolled' && (
                                  <button style={{ fontSize: '0.78rem', padding: '0.22rem 0.65rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                    onClick={() => setConfirmConvertId(p.id)}>
                                    Convert to Student
                                  </button>
                                )}
                                <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.22rem 0.55rem' }}
                                  onClick={() => handleConvertProspect(p)}>
                                  ✉️ Invite as student
                                </button>
                                <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.22rem 0.55rem', color: '#9ca3af' }}
                                  onClick={() => handleArchiveProspect(p)}>
                                  Archive
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {/* Archived prospects section */}
              {showArchived && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Archived prospects</h4>
                  {archivedLoading ? (
                    <div className="dashboard-loading">Loading…</div>
                  ) : archivedProspects.length === 0 ? (
                    <p className="dashboard-empty-small">No archived prospects.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', opacity: 0.75 }}>
                      <tbody>
                        {archivedProspects.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f0ece4' }}>
                            <td style={{ padding: '0.45rem 0.75rem' }}><strong>{p.name}</strong></td>
                            <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-muted)' }}>{p.email}</td>
                            <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem' }}>
                              <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                                onClick={() => handleProspectStatusChange({ id: p.id }, 'new').then(() => {
                                  setArchivedProspects(prev => prev.filter(x => x.id !== p.id))
                                  setProspects(prev => [{ ...p, status: 'new' }, ...prev])
                                })}>
                                Restore
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Archived button — bottom right */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
              onClick={() => {
                const next = !showArchived
                setShowArchived(next)
                if (next && archivedProspects.length === 0) {
                  setArchivedLoading(true)
                  fetchArchivedProspects().then(data => { setArchivedProspects(data); setArchivedLoading(false) })
                }
              }}>
              🗃 {showArchived ? 'Hide Archived' : 'Archived'}
            </button>
          </div>
        </div>
      )}

      {/* Students tab */}
      {adminTab === 'students' && (
        <div>
          {/* Add student button / form */}
          {!showAddStudentForm ? (
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-gold" style={{ fontSize: '0.88rem', padding: '0.55rem 1.1rem' }}
                onClick={() => setShowAddStudentForm(true)}>
                + Add student
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddStudent} className="admin-add-lesson-form" style={{ marginBottom: '1.25rem' }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 600, fontSize: '0.95rem' }}>New student</p>
              <div className="booking-form" style={{ gap: '0.75rem' }}>
                <div className="form-field">
                  <label>Name <span className="required-star">*</span></label>
                  <input type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)}
                    placeholder="e.g. Maria García" autoFocus required />
                </div>
                <div className="form-field">
                  <label>Email <span className="optional">(optional)</span></label>
                  <input type="email" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)}
                    placeholder="e.g. maria@example.com" />
                </div>
                <div className="form-field">
                  <label>English level <span className="optional">(optional)</span></label>
                  <select value={newStudentLevel} onChange={e => setNewStudentLevel(e.target.value)}>
                    <option value="">Not set</option>
                    <option value="elementary">Elementary</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Notes <span className="optional">(optional)</span></label>
                  <textarea value={newStudentNotes} onChange={e => setNewStudentNotes(e.target.value)}
                    placeholder="Any notes about this student…" rows={2} />
                </div>
                {addStudentError && <div className="auth-error">{addStudentError}</div>}
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button type="submit" className="btn-gold" style={{ fontSize: '0.88rem' }}
                    disabled={addStudentSaving || !newStudentName.trim()}>
                    {addStudentSaving ? 'Saving…' : 'Save student'}
                  </button>
                  <button type="button" className="btn-ghost" style={{ fontSize: '0.88rem' }}
                    onClick={() => { setShowAddStudentForm(false); setAddStudentError(null) }}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {dataLoading ? (
            <div className="dashboard-loading">Loading students…</div>
          ) : (
            <div className="admin-list">
              {/* Inline assign-test picker */}
              {(() => {
                const renderAssignTestInline = (s, isManual) => {
                  if (assigningTestToStudent?.id !== s.id) return null
                  return (
                    <div key={s.id + '_test'} style={{ background: '#EEF4F8', border: '1px solid #c5d8e8', borderRadius: '8px', padding: '0.65rem 0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Assign test to {s.name}:</span>
                      <select value={studentTestId} onChange={e => setStudentTestId(e.target.value)}
                        style={{ fontSize: '0.82rem', padding: '0.25rem 0.5rem', borderRadius: '5px', border: '1px solid var(--border)' }}>
                        {TEST_DEFINITIONS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                      <button className="btn-gold" style={{ fontSize: '0.82rem', padding: '0.28rem 0.7rem' }}
                        disabled={studentTestSaving} onClick={() => handleAssignTestToStudent(s, isManual)}>
                        {studentTestSaving ? '…' : 'Assign'}
                      </button>
                      <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.28rem 0.6rem' }}
                        onClick={() => setAssigningTestToStudent(null)}>Cancel</button>
                    </div>
                  )
                }

                const renderTestStatus = (s) => {
                  if (studentTestLinks[s.id]) {
                    return studentTestSent[s.id]
                      ? <span style={{ fontSize: '0.75rem', color: '#3B6D11', fontWeight: 600 }}>✉️ Test sent</span>
                      : <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: copiedStudentId === s.id ? '#3B6D11' : 'var(--gold)' }}
                          onClick={e => { e.stopPropagation(); copyStudentTestLink(s.id) }}>
                          {copiedStudentId === s.id ? '✓ Copied!' : '🔗 Test link'}
                        </button>
                  }
                  return (
                    <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', flexShrink: 0 }}
                      onClick={e => { e.stopPropagation(); setAssigningTestToStudent(s); setStudentTestId('general_placement_v1') }}>
                      📋 Assign Test
                    </button>
                  )
                }

                return (
                  <>
                    {/* Pending section */}
                    {pendingStudents.length > 0 && (
                      <>
                        <p className="admin-section-label">⏳ Awaiting approval ({pendingStudents.length})</p>
                        {pendingStudents.map(s => (
                          <React.Fragment key={s.id}>
                            {renderAssignTestInline(s, false)}
                            <div className="admin-student-row admin-student-row--pending" role="button"
                              style={{ cursor: 'pointer' }} onClick={() => openStudent(s)}>
                              <div className="admin-student-info">
                                <strong>{s.name || 'Unknown'}</strong>
                                <span className="admin-student-email">{s.email}</span>
                              </div>
                              <div className="admin-student-meta">
                                <AccessBadge level="pending" />
                                {s.english_level && <span className="admin-level-chip eng-level-chip">{s.english_level}</span>}
                                {renderTestStatus(s)}
                                <span className="admin-date-chip">{new Date(s.created_at).toLocaleDateString('en-GB')}</span>
                              </div>
                              <span className="admin-arrow">›</span>
                            </div>
                          </React.Fragment>
                        ))}
                      </>
                    )}

                    {/* Active auth students */}
                    {activeStudents.length > 0 && (
                      <>
                        <p className="admin-section-label" style={{ marginTop: pendingStudents.length > 0 ? '1.25rem' : 0 }}>
                          Registered students ({activeStudents.length})
                        </p>
                        {activeStudents.map(s => {
                          const result = s.questionnaire_submissions?.[0]?.placement_results?.[0]
                          return (
                            <React.Fragment key={s.id}>
                              {renderAssignTestInline(s, false)}
                              <div className="admin-student-row" role="button"
                                style={{ cursor: 'pointer' }} onClick={() => openStudent(s)}>
                                <div className="admin-student-info">
                                  <strong>{s.name || 'Unknown'}</strong>
                                  {s.access_level === 'prospect' && (
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#854F0B', background: '#FAEEDA', padding: '0.12rem 0.45rem', borderRadius: '20px', marginLeft: '0.4rem' }}>
                                      Prospect
                                    </span>
                                  )}
                                  <span className="admin-student-email">{s.email}</span>
                                </div>
                                <div className="admin-student-meta">
                                  <AccessBadge level={s.access_level} />
                                  {unreviewed[s.id] > 0 && (
                                    <span className="admin-level-chip" title="Completed exercises waiting to be reviewed"
                                      style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700, border: '1px solid #fca5a5' }}>
                                      📥 {unreviewed[s.id]} to review
                                    </span>
                                  )}
                                  {s.english_level && <span className="admin-level-chip eng-level-chip">{s.english_level}</span>}
                                  {result && <span className="admin-level-chip">{result.cefr_level} · {result.overall_score}%</span>}
                                  {result && !result.writing_reviewed && <span className="admin-review-chip">Writing to review</span>}
                                  {renderTestStatus(s)}
                                  <span className="admin-date-chip">{new Date(s.created_at).toLocaleDateString('en-GB')}</span>
                                </div>
                                {renderDeleteControl(s, false)}
                                <span className="admin-arrow">›</span>
                              </div>
                            </React.Fragment>
                          )
                        })}
                      </>
                    )}

                    {/* Manual students */}
                    {manualStudents.length > 0 && (
                      <>
                        <p className="admin-section-label" style={{ marginTop: '1.25rem' }}>
                          Manual students ({manualStudents.length})
                        </p>
                        {manualStudents.map(s => (
                          <React.Fragment key={s.id}>
                            {renderAssignTestInline(s, true)}
                            <div className="admin-student-row" role="button"
                              style={{ cursor: 'pointer' }} onClick={() => openManualStudent(s)}>
                              <div className="admin-student-info">
                                <strong>{s.name}</strong>
                                <span className="admin-student-email">{s.email || 'No email'}</span>
                              </div>
                              <div className="admin-student-meta">
                                {s.english_level && <span className="admin-level-chip eng-level-chip">{s.english_level}</span>}
                                <span className="admin-level-chip" style={{ opacity: 0.65 }}>Manual</span>
                                {renderTestStatus(s)}
                                <span className="admin-date-chip">{new Date(s.created_at).toLocaleDateString('en-GB')}</span>
                              </div>
                              {renderDeleteControl(s, true)}
                              <span className="admin-arrow">›</span>
                            </div>
                          </React.Fragment>
                        ))}
                      </>
                    )}

                    {students.length === 0 && manualStudents.length === 0 && (
                      <div className="dashboard-empty">
                        <p>No students yet.</p>
                        <p className="flow-sub" style={{ fontSize: '0.88rem' }}>Students who sign up will appear here, or add one manually above.</p>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          {/* Student Archive — bottom right */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
              onClick={() => { const next = !showStudentArchive; setShowStudentArchive(next); if (next) refreshStudentArchive() }}>
              🗃 {showStudentArchive ? 'Hide Student Archive' : 'Student Archive'}
            </button>
          </div>
          {showStudentArchive && (
            <div style={{ marginTop: '0.85rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>🗃 Student Archive</h4>
              {studentArchiveLoading ? (
                <div className="dashboard-loading" style={{ padding: '0.5rem 0' }}>Loading…</div>
              ) : (archivedStudents.auth.length + archivedStudents.manual.length) === 0 ? (
                <p className="dashboard-empty-small" style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No archived students.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {[...archivedStudents.auth.map(s => ({ s, isManual: false })),
                    ...archivedStudents.manual.map(s => ({ s, isManual: true }))].map(({ s, isManual }) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-darker)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.55rem 0.8rem', opacity: 0.85 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: '0.9rem' }}>{s.name || 'Unknown'}</strong>
                        {isManual && <span className="admin-level-chip" style={{ marginLeft: '0.4rem', opacity: 0.65, fontSize: '0.7rem' }}>Manual</span>}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.email || 'No email'}</div>
                      </div>
                      <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.25rem 0.7rem', color: 'var(--gold)', borderColor: 'var(--gold)' }}
                        onClick={() => restoreStudent(s, isManual)}>
                        ↩ Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
