import { useState, useEffect, useRef, useMemo } from 'react'
import './App.css'
import { supabase, saveQuestionnaire, savePlacementResult, linkGuestData,
  fetchMyExercises, fetchQuestionsForStudent, fetchQuestionsForReview,
  fetchMyAnswersForAssignment, submitExerciseAnswers,
  fetchAllExercises, fetchStudentProfiles, assignExercise,
  fetchAllAssignmentsAdmin, fetchStudentAssignmentsAdmin, fetchAssignmentDetails,
  saveAnswerReviews, saveExerciseFeedback,
  createExerciseWithQuestions, fetchExerciseWithQuestions, updateExerciseWithQuestions, deleteExercise,
  fetchAllLabels, createLabel, deleteLabel, setExerciseLabels,
  fetchAllBooks, createBook, deleteBook, updateBook,
  fetchAllLessonPlans, createLessonPlan, updateLessonPlan, deleteLessonPlan, duplicateLessonPlan,
  createLessonPlanWithStages, updateLessonPlanWithStages, assignLessonPlan,
  fetchMyProfile, updateMyName,
  updateStudentAccessLevel, updateStudentEnglishLevel,
  fetchStudentsAdmin, fetchManualStudents, createManualStudent,
  fetchStudentLessons, createLesson, updateLesson, fetchMyLessons, submitLessonFeedback,
  fetchNextLesson, fetchBadgeDefinitions, fetchStudentBadges, checkAndAwardBadges,
  updateLessonNotes, fetchStudentLessonsAdmin,
  fetchMyVocabulary, addVocabularyWord, deleteVocabularyWord,
  fetchMyReferralCode, fetchMyReferrals, lookupReferralCode, logReferral,
  markDiscountApplied, fetchAllReferrals,
  createProspect, fetchAllProspects, updateProspectStatus,
} from './lib/supabase'
import { ABOUT, HOW_IT_WORKS_STEPS, PRICING_PLANS, COURSES_DATA, WHATSAPP_NUMBER, TESTIMONIALS, FAQ_ITEMS } from './content'

// ─── Constants ───────────────────────────────────────────────
const CALENDLY_CONSULTATION = 'https://calendly.com/dogukan-cy/free-english-course-consultation-50-mins'
const CALENDLY_FIRST_LESSON = 'https://calendly.com/dogukan-cy/30min'
const ADMIN_EMAIL           = 'dogukan.cy@gmail.com'

// ─── Demo exercise ───────────────────────────────────────────
const DEMO_EXERCISE = {
  title: 'Try a sample exercise',
  passage: `The internet has transformed the way we communicate, work, and learn. Despite its many benefits, researchers have raised concerns about the effect of constant connectivity on mental health. A 2023 study found that adults who limited their social media use to 30 minutes per day reported significantly lower levels of anxiety and loneliness after just three weeks.`,
  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      text: 'What did the 2023 study find?',
      options: [
        'Social media causes permanent mental health damage',
        'Limiting social media to 30 minutes daily reduced anxiety',
        'The internet has no effect on mental health',
        'Adults should avoid the internet entirely',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'fill_blank',
      text: 'Researchers raised concerns about the effect of constant ________ on mental health.',
      correct: 'connectivity',
    },
    {
      id: 'q3',
      type: 'true_false',
      text: 'The study lasted three weeks.',
      correct: true,
    },
  ],
}

// ─── Label colour swatches ────────────────────────────────────
const LABEL_COLORS = [
  { value: '#d4a853', label: 'Gold'   },
  { value: '#60a5fa', label: 'Blue'   },
  { value: '#4ade80', label: 'Green'  },
  { value: '#f87171', label: 'Red'    },
  { value: '#c084fc', label: 'Purple' },
  { value: '#fb923c', label: 'Orange' },
]

// ─── Questionnaire questions ──────────────────────────────────
const Q_QUESTIONS = [
  {
    field: 'level',
    label: 'How would you describe your current level of English?',
    options: [
      { value: 'beginner',          label: 'Complete beginner — I know almost nothing' },
      { value: 'elementary',        label: 'I know some basics (greetings, simple phrases)' },
      { value: 'intermediate',      label: 'I can get by but I make a lot of mistakes' },
      { value: 'upper-intermediate',label: 'Fairly confident — I want to polish and improve' },
      { value: 'advanced',          label: 'Advanced — working on fluency and nuance' },
      { value: 'unsure',            label: "I'm not sure — help me find out" },
    ],
  },
  {
    field: 'goal',
    label: 'Why do you want to improve your English?',
    options: [
      { value: 'work',       label: 'Work or career advancement' },
      { value: 'abroad',     label: 'Moving to or living in an English-speaking country' },
      { value: 'travel',     label: 'Travel and getting around' },
      { value: 'exams',      label: 'A specific exam (IELTS, TOEFL, Cambridge, etc.)' },
      { value: 'confidence', label: 'General confidence in everyday situations' },
      { value: 'other',      label: 'Something else' },
    ],
  },
  {
    field: 'challenge',
    label: "What's your biggest challenge with English right now?",
    options: [
      { value: 'speaking',   label: 'Speaking — I freeze or lose confidence' },
      { value: 'grammar',    label: "Grammar — I make mistakes I can't explain" },
      { value: 'vocabulary', label: "Vocabulary — I don't know enough words" },
      { value: 'listening',  label: 'Listening — native speakers are too fast' },
      { value: 'writing',    label: 'Writing — emails, messages, formal texts' },
      { value: 'all',        label: 'All of the above / not sure yet' },
    ],
  },
  {
    field: 'background',
    label: 'Have you taken an English course before?',
    options: [
      { value: 'certified',  label: 'Yes — I completed a course' },
      { value: 'studied',    label: "Yes — I took a course but didn't complete it" },
      { value: 'self-taught',label: 'I never took an English course before' },
      { value: 'first-time', label: 'This will be my first time studying seriously' },
    ],
  },
  {
    field: 'time',
    label: 'How much time per week can you realistically commit?',
    options: [
      { value: '1-2h',     label: '1–2 hours' },
      { value: '3-4h',     label: '3–4 hours' },
      { value: '5h+',      label: '5 hours or more' },
      { value: 'flexible', label: "I'm flexible — not sure yet" },
    ],
  },
  {
    field: 'content',
    label: 'What kind of English content interests you most?',
    options: [
      { value: 'business',     label: 'Business, meetings and professional communication' },
      { value: 'conversation', label: 'Everyday conversation and social situations' },
      { value: 'culture',      label: 'Culture, news and current events' },
      { value: 'travel',       label: 'Travel and getting around' },
      { value: 'academic',     label: 'Academic writing or exam preparation' },
      { value: 'mixed',        label: 'A mix of everything' },
    ],
  },
]

// ─── Placement test questions ─────────────────────────────────
const READING_PASSAGE = `Remote work has transformed the modern workplace in ways few anticipated. While many employees celebrate the flexibility and elimination of commutes, managers face new challenges in maintaining team cohesion and monitoring productivity. Studies suggest that remote workers often put in longer hours than their office-based counterparts, blurring the boundary between professional and personal life. However, companies that have embraced remote work report lower overhead costs and access to a broader talent pool, unconstrained by geography.`

const TEST_QUESTIONS = [
  {
    id: 1, type: 'multiple-choice', category: 'Grammar',
    question: 'Choose the correct form: "She ___ to the gym every morning before work."',
    options: ['go', 'goes', 'going', 'gone'], correct: 'goes',
  },
  {
    id: 2, type: 'multiple-choice', category: 'Grammar',
    question: 'Which sentence is grammatically correct?',
    options: [
      'If I would have more time, I would study more.',
      'If I had more time, I would study more.',
      'If I have had more time, I would study more.',
      'If I would had more time, I would study more.',
    ], correct: 'If I had more time, I would study more.',
  },
  {
    id: 3, type: 'multiple-choice', category: 'Grammar',
    question: 'Choose the correct passive sentence:',
    options: [
      'The report was written by him yesterday.',
      'The report was wrote by him yesterday.',
      'The report has wrote by him yesterday.',
      'The report were written by him yesterday.',
    ], correct: 'The report was written by him yesterday.',
  },
  {
    id: 4, type: 'fill-blank', category: 'Grammar',
    question: 'Complete the sentence: "I wish I ___ speak French — it would help so much at work."',
    hint: '(could / can / would / will)',
    placeholder: 'Type the missing word...',
  },
  {
    id: 5, type: 'fill-blank', category: 'Grammar',
    question: 'Complete using the correct tense: "By the time they arrived at the party, most people _______."',
    hint: 'Use: already + leave',
    placeholder: 'e.g. had already left',
  },
  {
    id: 6, type: 'multiple-choice', category: 'Vocabulary',
    question: 'What does "eloquent" mean?',
    options: [
      'Able to express ideas clearly and persuasively',
      'Speaking very loudly',
      'Confused and uncertain',
      'Formal and cold in manner',
    ], correct: 'Able to express ideas clearly and persuasively',
  },
  {
    id: 7, type: 'multiple-choice', category: 'Vocabulary',
    question: "Choose the best word: \"The government's decision was met with widespread ___ from the public.\"",
    options: ['criticism', 'critic', 'critical', 'criticise'],
    correct: 'criticism',
  },
  {
    id: 8, type: 'fill-blank', category: 'Vocabulary',
    question: 'Fill in the blank: "She was so ___ in her work that she didn\'t notice the hours passing."',
    hint: '(absorbed / absorbing / absorb / absorption)',
    placeholder: 'Type the missing word...',
  },
  {
    id: 9, type: 'reading', category: 'Reading',
    passage: READING_PASSAGE,
    question: 'According to the passage, what is one advantage companies gain from remote work?',
    options: [
      'Employees work fewer hours',
      'Access to talent from any location',
      'Easier monitoring of productivity',
      'Stronger team relationships',
    ], correct: 'Access to talent from any location',
  },
  {
    id: 10, type: 'reading', category: 'Reading',
    passage: READING_PASSAGE,
    question: 'What concern does the passage raise about remote workers?',
    options: [
      'They are less productive than office workers',
      'They often struggle with technology',
      'The line between work and personal life can become unclear',
      'They feel more isolated and unmotivated',
    ], correct: 'The line between work and personal life can become unclear',
  },
  {
    id: 11, type: 'reading', category: 'Reading',
    passage: READING_PASSAGE,
    question: 'The word "cohesion" in the passage most closely means:',
    options: [
      'Competition between team members',
      'A sense of unity and connection',
      'Strict rules and procedures',
      'Regular communication schedules',
    ], correct: 'A sense of unity and connection',
  },
  {
    id: 12, type: 'writing', category: 'Writing',
    question: 'Write 3–5 sentences about a place you have visited or would like to visit. Try to use varied vocabulary and at least one complex sentence.',
    placeholder: 'Write your answer here (minimum 3 sentences)...',
  },
]

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const initPage = () => {
    const path = window.location.pathname
    if (path.startsWith('/admin'))     return 'admin'
    if (path.startsWith('/dashboard')) return 'dashboard'
    if (path.startsWith('/settings'))  return 'settings'
    if (path.startsWith('/signin'))    return 'signin'
    return 'landing'
  }

  const [page, setPage] = useState(initPage)
  const [pageHistory, setPageHistory] = useState([])
  const [completedPath, setCompletedPath] = useState(null) // 'questionnaire' | 'consultation'
  const [studentData, setStudentData] = useState({})
  const [testAnswers, setTestAnswers] = useState({})
  const [results, setResults] = useState(null)
  const [submissionId, setSubmissionId] = useState(null)
  const [user, setUser] = useState(null)

  // Listen for Supabase auth state changes
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const goTo = (p) => {
    setPageHistory(prev => [...prev, page])
    setPage(p)
    window.scrollTo(0, 0)
    if (p === 'admin')          window.history.pushState({}, '', '/admin')
    else if (p === 'dashboard') window.history.pushState({}, '', '/dashboard')
    else if (p === 'settings')  window.history.pushState({}, '', '/settings')
    else if (p === 'signin')    window.history.pushState({}, '', '/signin')
    else if (p === 'landing')   window.history.pushState({}, '', '/')
  }

  const goBack = () => {
    if (pageHistory.length === 0) return  // nowhere to go, stay put
    const prev = pageHistory[pageHistory.length - 1]
    // Never send a logged-in user back to the marketing/landing page — looks like logout
    if (user && prev === 'landing') return
    setPageHistory(h => h.slice(0, -1))
    setPage(prev)
    window.scrollTo(0, 0)
  }

  const handleSignOut = async () => {
    await supabase?.auth.signOut()
    setUser(null)
    goTo('landing')
  }

  if (page !== 'landing') {
    return (
      <div className="flow-wrapper">
        <div className="flow-header">
          {page === 'admin' ? (
            <span className="flow-header-logo">Admin Panel — English with Dogukan</span>
          ) : (
            <button className="back-link" onClick={goBack}>
              ← English with Dogukan
            </button>
          )}
          {user && page !== 'admin' && (
            <button className="back-link"
              onClick={() => goTo(user.email === ADMIN_EMAIL ? 'admin' : 'dashboard')}>
              My account →
            </button>
          )}
        </div>
        <div className="flow-content">
          {page === 'start' && (
            <Start
              onQuestionnaire={() => goTo('questionnaire')}
              onConsultation={() => goTo('consultation')}
            />
          )}
          {page === 'questionnaire' && (
            <Questionnaire
              onSubmit={async (data) => {
                setStudentData(data)
                setCompletedPath('questionnaire')
                sendQuestionnaireNotification(data)
                const sid = await saveQuestionnaire(data, user?.id ?? null)
                setSubmissionId(sid)
                goTo('pretest')
              }}
              onBack={() => goTo('start')}
            />
          )}
          {page === 'consultation' && (
            <ConsultationScreen
              onContinue={() => { setCompletedPath('consultation'); goTo('pretest') }}
              onBack={() => goTo('landing')}
            />
          )}
          {page === 'pretest' && (
            <PreTest
              completedPath={completedPath}
              studentName={studentData.name}
              onTakeTest={() => goTo('test')}
              onSkip={() => {
                if (completedPath === 'questionnaire') {
                  user ? (window.open(CALENDLY_FIRST_LESSON, '_blank'), goTo('landing')) : goTo('auth')
                } else {
                  goTo('landing')
                }
              }}
            />
          )}
          {page === 'test' && (
            <PlacementTest
              onSubmit={(answers) => { setTestAnswers(answers); goTo('grading') }}
              onBack={() => goTo('pretest')}
            />
          )}
          {page === 'grading' && (
            <Grading
              answers={testAnswers}
              onDone={async (r) => {
                setResults(r)
                await savePlacementResult(r, submissionId, user?.id ?? null)
                goTo('results')
              }}
            />
          )}
          {page === 'results' && (
            <Results
              results={results}
              completedPath={completedPath}
              user={user}
              onBookLesson={() => {
                if (user) { window.open(CALENDLY_FIRST_LESSON, '_blank'); goTo('dashboard') }
                else goTo('auth')
              }}
              onDone={() => goTo('landing')}
            />
          )}
          {page === 'auth' && (
            <AuthPage
              studentData={studentData}
              defaultMode="signup"
              onSuccess={async (newUser) => {
                try {
                  if (studentData.email) await linkGuestData(studentData.email, newUser.id)
                } catch (e) {
                  console.error('[onSuccess] linkGuestData failed:', e)
                }
                window.open(CALENDLY_FIRST_LESSON, '_blank')
                goTo(newUser.email === ADMIN_EMAIL ? 'admin' : 'dashboard')
              }}
              onBack={() => goTo(results ? 'results' : 'landing')}
            />
          )}
          {page === 'signin' && (
            <AuthPage
              studentData={{}}
              defaultMode="login"
              onSuccess={(newUser) => {
                goTo(newUser.email === ADMIN_EMAIL ? 'admin' : 'dashboard')
              }}
              onBack={() => goTo('landing')}
            />
          )}
          {page === 'dashboard' && (
            <StudentDashboard user={user} onSignOut={handleSignOut}
              onBook={() => window.open(CALENDLY_FIRST_LESSON, '_blank')}
              onSettings={() => goTo('settings')} />
          )}
          {page === 'settings' && (
            <AccountSettings user={user} onBack={() => goTo('dashboard')} onSignOut={handleSignOut} />
          )}
          {page === 'admin' && (
            <AdminPanel user={user} onSignOut={handleSignOut} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="site">
      <Navbar onBook={() => goTo('consultation')} user={user}
        onAccount={() => goTo(user?.email === ADMIN_EMAIL ? 'admin' : 'dashboard')}
        onSignIn={() => goTo('signin')} />
      <Hero onBook={() => goTo('consultation')} />
      <HowItWorks />
      <Courses />
      <AboutMe />
      <DemoExercise onBook={() => goTo('consultation')} />
      <Testimonials />
      <FAQ />
      <BookingCTA onBook={() => goTo('consultation')} />
      <Pricing onBook={() => goTo('consultation')} />
      <Footer />
      {WHATSAPP_NUMBER && <WhatsAppButton number={WHATSAPP_NUMBER} />}
    </div>
  )
}

// ─── Questionnaire notification ──────────────────────────────
async function sendQuestionnaireNotification(data) {
  const endpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT
  if (!endpoint || endpoint === 'your_formspree_endpoint_here') return
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `New student enquiry: ${data.name}`,
        Name: data.name,
        Email: data.email,
        'Current level': data.level,
        'Main goal': data.goal,
        'Biggest challenge': data.challenge,
        'Study background': data.background,
        'Time per week': data.time,
        'Content preference': data.content,
      }),
    })
  } catch {
    // Silent — never block the student flow
  }
}

// ─── Photo → Exercise AI helpers ─────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Compress an image file to a JPEG data-URI (max 1200px wide, 78% quality). */
function compressImage(file, maxWidth = 1200) {
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
async function ocrImage(file) {
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
async function detectImageBlanks(dataUrl) {
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
function parseOverlayPrompt(prompt) {
  try {
    const p = JSON.parse(prompt || '')
    if (p && p.overlay === true && Array.isArray(p.blanks)) return p
  } catch {}
  return null
}

/**
 * Parse raw OCR text into question objects for ExerciseBuilder.
 * Looks for numbered lines like "1 I ___ to school." or "1. She ___ happy."
 */
function parseOcrIntoQuestions(rawText, type) {
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
function FlowSteps({ current }) {
  const steps = ['Free consultation', 'Placement test', 'First lesson']
  return (
    <div className="flow-steps">
      {steps.map((s, i) => {
        const n = i + 1
        const state = n < current ? 'done' : n === current ? 'active' : 'idle'
        return (
          <div key={s} className={`flow-step flow-step--${state}`}>
            <span className="flow-step-num">{state === 'done' ? '✓' : n}</span>
            <span className="flow-step-label">{s}</span>
            {i < steps.length - 1 && <span className="flow-step-sep">›</span>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────
function Navbar({ onBook, user, onAccount, onSignIn }) {
  return (
    <nav className="navbar">
      <div className="nav-inner">
        <span className="nav-logo">
          English with <span className="gold">Dogukan</span>
        </span>
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#courses">Courses</a>
          <a href="#pricing">Pricing</a>
          <a href="#about">About Me</a>
          {user ? (
            <button className="btn-outline" onClick={onAccount}>My account</button>
          ) : (
            <>
              <button className="btn-ghost nav-signin" onClick={onSignIn}>Sign in</button>
              <button className="btn-gold" onClick={onBook}>Book free lesson</button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────
function Hero({ onBook }) {
  return (
    <section className="hero-section">
      <div className="hero-inner">
        <div className="hero-text">
          <div className="hero-badge">CELTA-Certified English Tutor</div>
          <h1>
            Speak English with confidence.<br />
            <span className="gold">One-to-one lessons</span> <span className="gold">built around you.</span>
          </h1>
          <p className="hero-sub">
            Personalised lessons. Real conversations. No wasted time on things you already know.
            Start with a free first lesson — no commitment.
          </p>
          <div className="hero-actions">
            <button className="btn-gold btn-lg" onClick={onBook}>
              Get started — it's free
            </button>
            <a href="#how-it-works" className="btn-ghost btn-lg">
              See how it works
            </a>
          </div>
        </div>
        <div className="hero-card">
          <div className="hero-teacher-card">
            <div className="hero-teacher-photo">
              <img src="/hero.png" alt="Dogukan — English teacher" />
            </div>
            <div className="hero-teacher-info">
              <p className="hero-teacher-name">Hi, I'm Dogukan 👋</p>
              <p className="hero-teacher-bio">
                CELTA-certified English teacher from International House, London.
                I specialise in one-to-one lessons built around your goals — whether that's
                everyday conversation, exam prep, or professional English.
              </p>
              <div className="hero-teacher-creds">
                <span>🎓 CELTA — IH London</span>
                <span>📚 Oxford &amp; Cambridge</span>
                <span>🌍 Students from 20+ countries</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────
function HowItWorks() {
  const steps = HOW_IT_WORKS_STEPS
  return (
    <section className="section" id="how-it-works">
      <div className="container">
        <div className="section-label">The process</div>
        <h2 className="section-title">How it works</h2>
        <div className="steps-grid">
          {steps.map((s) => (
            <div key={s.num} className="step-card">
              <div className="step-number">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// COURSES_DATA is imported from ./content.js

function Courses() {
  const [openModules, setOpenModules] = useState({})
  const toggle = (ci, mi) => {
    const key = `${ci}-${mi}`
    setOpenModules(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <section className="section section-alt" id="courses">
      <div className="container">
        <div className="section-label">What you'll learn</div>
        <h2 className="section-title">Courses</h2>
        <div className="courses-grid">
          {COURSES_DATA.map((c, ci) => (
            <div key={c.name} className="course-card">
              <div className="course-tag" style={{ color: c.color }}>{c.tag}</div>
              <h3 className="course-name">{c.name}</h3>
              <p className="course-desc">{c.desc}</p>
              <div className="course-schedule">
                <span className="check" style={{ color: c.color }}>✓</span> {c.schedule}
              </div>
              <div className="course-modules">
                {c.modules.map((mod, mi) => {
                  const isOpen = openModules[`${ci}-${mi}`]
                  return (
                    <div key={mi} className="course-module">
                      <button
                        className="module-toggle"
                        onClick={() => toggle(ci, mi)}
                        aria-expanded={isOpen}
                      >
                        <span>{mod.title}</span>
                        <span className="module-chevron">{isOpen ? '▲' : '▼'}</span>
                      </button>
                      {isOpen && (
                        <ul className="module-lessons">
                          {mod.lessons.map((l, li) => (
                            <li key={li}>{l}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials ─────────────────────────────────────────────
function Testimonials() {
  return (
    <section className="testimonials-section" id="testimonials">
      <div className="section-container">
        <p className="section-eyebrow">Student results</p>
        <h2 className="section-title">Real progress. Real people.</h2>
        <p className="section-sub">Every lesson is built around you — here's what that looks like in practice.</p>
        <div className="testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="testimonial-card">
              <p className="testimonial-quote">"{t.quote}"</p>
              <div className="testimonial-footer">
                <span className="testimonial-emoji">{t.emoji}</span>
                <div>
                  <p className="testimonial-name">{t.name} · {t.country}</p>
                  <p className="testimonial-outcome">{t.outcome}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState(null)
  return (
    <section className="faq-section" id="faq">
      <div className="section-container" style={{ maxWidth: '740px' }}>
        <p className="section-eyebrow">Got questions?</p>
        <h2 className="section-title">Frequently asked</h2>
        <div className="faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className={`faq-item ${open === i ? 'open' : ''}`}>
              <button className="faq-question" onClick={() => setOpen(open === i ? null : i)}>
                <span>{item.q}</span>
                <span className="faq-chevron">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <p className="faq-answer">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────
function Pricing({ onBook }) {
  const plans = PRICING_PLANS
  return (
    <section className="section section-alt" id="pricing">
      <div className="container">
        <div className="section-label">Simple pricing</div>
        <h2 className="section-title">Pricing</h2>
        <div className="pricing-grid">
          {plans.map((p) => (
            <div key={p.name} className={`pricing-card ${p.featured ? 'pricing-featured' : ''}`}>
              {p.featured && <div className="pricing-badge">Best value</div>}
              <h3>{p.name}</h3>
              <div className="pricing-price">
                <span className="price-amount">{p.price}</span>
                <span className="price-per"> / {p.per}</span>
              </div>
              <p className="pricing-desc">{p.desc}</p>
              <ul className="pricing-features">
                {p.features.map((f) => (
                  <li key={f}><span className="check gold">✓</span> {f}</li>
                ))}
              </ul>
              <button
                className={p.featured ? 'btn-gold btn-full' : 'btn-outline btn-full'}
                onClick={onBook}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
        <p className="section-note">* Placeholder pricing — Dogukan to confirm final numbers.</p>
      </div>
    </section>
  )
}

// ─── About Me ─────────────────────────────────────────────────
const CREDENTIAL_ICONS = ['🎓', '📚']

function AboutMe() {
  return (
    <section className="section" id="about">
      <div className="container">
        <div className="section-label">The teacher</div>
        <h2 className="section-title">About Me</h2>
        <div className="about-inner">
          <div className="about-photo-wrap">
            <div className="about-photo-placeholder">
              <span className="about-photo-icon">👤</span>
              <span className="about-photo-label">Photo coming soon</span>
            </div>
          </div>
          <div className="about-bio">
            {ABOUT.paragraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            <div className="about-credentials">
              {ABOUT.credentials.map((cred, i) => (
                <div key={i} className="credential-badge">
                  <span className="credential-icon gold">{CREDENTIAL_ICONS[i] ?? '✓'}</span>
                  {cred}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── DemoExercise ─────────────────────────────────────────────
function DemoExercise({ onBook }) {
  const [answers, setAnswers]   = useState({})
  const [revealed, setRevealed] = useState(false)

  const setAnswer = (id, val) => {
    if (revealed) return
    setAnswers(prev => ({ ...prev, [id]: val }))
  }

  const allAnswered = DEMO_EXERCISE.questions.every(q => {
    const a = answers[q.id]
    return a !== undefined && a !== ''
  })

  const score = revealed ? DEMO_EXERCISE.questions.reduce((n, q) => {
    const a = answers[q.id]
    if (q.type === 'multiple_choice') return n + (a === q.correct ? 1 : 0)
    if (q.type === 'true_false')      return n + (a === q.correct ? 1 : 0)
    if (q.type === 'fill_blank')      return n + (
      typeof a === 'string' && a.trim().toLowerCase() === q.correct.toLowerCase() ? 1 : 0
    )
    return n
  }, 0) : 0

  const isCorrect = (q) => {
    const a = answers[q.id]
    if (q.type === 'multiple_choice') return a === q.correct
    if (q.type === 'true_false')      return a === q.correct
    if (q.type === 'fill_blank')
      return typeof a === 'string' && a.trim().toLowerCase() === q.correct.toLowerCase()
    return false
  }

  return (
    <section className="demo-section" id="try-it">
      <div className="section-container">
        <p className="section-eyebrow">See how it works</p>
        <h2 className="section-title">Try a real exercise</h2>
        <p className="section-sub">This is exactly what you'll see in your student portal after signing up.</p>

        <div className="demo-card">
          <div className="demo-passage">
            <p className="demo-passage-label">📄 Reading passage</p>
            <p className="demo-passage-text">{DEMO_EXERCISE.passage}</p>
          </div>

          <div className="demo-questions">
            {DEMO_EXERCISE.questions.map((q, qi) => (
              <div key={q.id} className={`demo-question ${revealed ? (isCorrect(q) ? 'demo-q--correct' : 'demo-q--wrong') : ''}`}>
                <p className="demo-q-text"><strong>Q{qi + 1}.</strong> {q.text}</p>

                {q.type === 'multiple_choice' && (
                  <div className="demo-options">
                    {q.options.map((opt, oi) => (
                      <button key={oi}
                        className={`demo-option ${answers[q.id] === oi ? 'selected' : ''} ${revealed && oi === q.correct ? 'correct' : ''} ${revealed && answers[q.id] === oi && oi !== q.correct ? 'wrong' : ''}`}
                        onClick={() => setAnswer(q.id, oi)}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === 'true_false' && (
                  <div className="demo-tf">
                    {[true, false].map(val => (
                      <button key={String(val)}
                        className={`demo-tf-btn ${answers[q.id] === val ? 'selected' : ''} ${revealed && val === q.correct ? 'correct' : ''} ${revealed && answers[q.id] === val && val !== q.correct ? 'wrong' : ''}`}
                        onClick={() => setAnswer(q.id, val)}>
                        {val ? 'True' : 'False'}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === 'fill_blank' && (
                  <input className={`demo-fill-input ${revealed ? (isCorrect(q) ? 'correct' : 'wrong') : ''}`}
                    type="text" placeholder="Type your answer…"
                    value={answers[q.id] || ''}
                    onChange={e => setAnswer(q.id, e.target.value)}
                    disabled={revealed} />
                )}

                {revealed && (
                  <p className="demo-feedback">
                    {isCorrect(q) ? '✅ Correct!' : `❌ The answer is: ${
                      q.type === 'multiple_choice' ? q.options[q.correct]
                      : q.type === 'true_false'    ? (q.correct ? 'True' : 'False')
                      : q.correct
                    }`}
                  </p>
                )}
              </div>
            ))}
          </div>

          {!revealed ? (
            <button className="btn-gold btn-full btn-lg" disabled={!allAnswered}
              onClick={() => setRevealed(true)}>
              Check my answers →
            </button>
          ) : (
            <div className="demo-result">
              <p className="demo-score">You scored <strong>{score}/{DEMO_EXERCISE.questions.length}</strong></p>
              <p className="demo-result-sub">In your real lessons, Dogukan reviews every answer with you — and builds the next exercise around what you found difficult.</p>
              <button className="btn-gold btn-full btn-lg" onClick={onBook}>
                Book my free consultation →
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Booking CTA ──────────────────────────────────────────────
function BookingCTA({ onBook }) {
  return (
    <section className="section cta-section text-center">
      <div className="container">
        <h2>Ready to start speaking with confidence?</h2>
        <p className="cta-sub">
          Tell Dogukan about yourself and book your free first lesson. No commitment, no pressure.
        </p>
        <button className="btn-gold btn-lg" onClick={onBook}>
          Get started — it's free →
        </button>
      </div>
    </section>
  )
}

// ─── WhatsApp floating button ─────────────────────────────────
function WhatsAppButton({ number }) {
  const clean = number.replace(/\D/g, '')
  const href  = `https://wa.me/${clean}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-btn"
      aria-label="Chat on WhatsApp"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  )
}

// ─── Footer ───────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <span className="nav-logo">
          English with <span className="gold">Dogukan</span>
        </span>
        <p>CELTA-certified English tutor · Personalised one-to-one lessons</p>
      </div>
    </footer>
  )
}

// ─── Start ────────────────────────────────────────────────────
function Start({ onQuestionnaire, onConsultation }) {
  return (
    <div className="flow-card">
      <FlowSteps current={1} />
      <h2>Let's understand what you need</h2>
      <p className="flow-sub">
        Before I design your trial lesson, I need to know a little about you. You can either answer
        a few questions (shouldn't take more than 3 minutes) or book a free consultation call with me.
      </p>
      <div className="path-options">
        <button className="path-card" onClick={onQuestionnaire}>
          <span className="path-icon">📋</span>
          <div>
            <strong>Answer a few questions</strong>
            <p>3 minutes. I'll review your answers and design your trial lesson around them.</p>
          </div>
          <span className="path-arrow">→</span>
        </button>
        <button className="path-card" onClick={onConsultation}>
          <span className="path-icon">📞</span>
          <div>
            <strong>Book a free consultation call</strong>
            <p>Prefer to talk? Book a short call and Dogukan will ask you these questions himself.</p>
          </div>
          <span className="path-arrow">→</span>
        </button>
      </div>
    </div>
  )
}

// ─── Questionnaire ────────────────────────────────────────────
function Questionnaire({ onSubmit, onBack }) {
  const [form, setForm] = useState({
    name: '', email: '', nativeLanguage: '',
    level: '', goal: '', challenge: '', background: '', time: '', content: '',
  })
  const [errors, setErrors] = useState({})

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Please enter your name'
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Please enter a valid email'
    Q_QUESTIONS.forEach((q) => {
      if (!form[q.field]) e[q.field] = 'Please select an option'
    })
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      const firstErr = document.querySelector('.field-error')
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    onSubmit(form)
  }

  return (
    <div className="flow-card">
      <FlowSteps current={1} />
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2>About you</h2>
      <p className="flow-sub">
        A few quick questions so I can design your trial lesson around your exact needs.
      </p>
      <form onSubmit={handleSubmit} className="booking-form">
        <div className="form-field">
          <label>Your name *</label>
          <input
            type="text" placeholder="e.g. Maria"
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            className={errors.name ? 'input-error' : ''}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="form-field">
          <label>Email address *</label>
          <input
            type="email" placeholder="e.g. maria@email.com"
            value={form.email}
            onChange={(e) => set('email')(e.target.value)}
            className={errors.email ? 'input-error' : ''}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="form-field">
          <label>What is your native language?</label>
          <input
            type="text" placeholder="e.g. Spanish"
            value={form.nativeLanguage}
            onChange={(e) => set('nativeLanguage')(e.target.value)}
          />
        </div>

        {Q_QUESTIONS.map((q) => (
          <div key={q.field} className="form-field">
            <label>{q.label}</label>
            <div className="radio-group">
              {q.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`radio-option ${form[q.field] === opt.value ? 'selected' : ''}`}
                  onClick={() => set(q.field)(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {errors[q.field] && <span className="field-error">{errors[q.field]}</span>}
          </div>
        ))}

        <button type="submit" className="btn-gold btn-full btn-lg">
          Continue →
        </button>
      </form>
    </div>
  )
}

// ─── ConsultationScreen ───────────────────────────────────────
function ConsultationScreen({ onContinue, onBack }) {
  const [opened, setOpened] = useState(false)
  const [captureName, setCaptureName] = useState('')
  const [captureEmail, setCaptureEmail] = useState('')
  const [captureSubmitted, setCaptureSubmitted] = useState(false)
  const [captureSaving, setCaptureSaving] = useState(false)

  const handleOpen = () => {
    window.open(CALENDLY_CONSULTATION, '_blank')
    setOpened(true)
  }

  const handleCaptureSubmit = async (e) => {
    e.preventDefault()
    if (!captureName.trim() || !captureEmail.trim()) return
    setCaptureSaving(true)
    await createProspect({ name: captureName.trim(), email: captureEmail.trim() })
    setCaptureSaving(false)
    setCaptureSubmitted(true)
    handleOpen()
  }

  return (
    <div className="flow-card">
      <FlowSteps current={1} />
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2>Book your free consultation</h2>
      <p className="flow-sub">
        Pick a time that works for you — it's completely free. Dogukan will ask you about your goals
        and design your first lesson around you.
      </p>

      {!opened ? (
        <form onSubmit={handleCaptureSubmit} className="booking-form" style={{ marginTop: '1.25rem' }}>
          <div className="form-field">
            <label>Your name <span className="required-star">*</span></label>
            <input type="text" value={captureName} onChange={e => setCaptureName(e.target.value)}
              placeholder="e.g. Maria García" required autoFocus />
          </div>
          <div className="form-field">
            <label>Your email <span className="required-star">*</span></label>
            <input type="email" value={captureEmail} onChange={e => setCaptureEmail(e.target.value)}
              placeholder="e.g. maria@example.com" required />
          </div>
          <button type="submit" className="btn-gold btn-full btn-lg"
            disabled={captureSaving || !captureName.trim() || !captureEmail.trim()}>
            {captureSaving ? 'Saving…' : 'Choose a time →'}
          </button>
        </form>
      ) : (
        <div className="consultation-booked">
          <div className="booked-check">✓</div>
          <h3>Scheduling page opened!</h3>
          <p>Once you've picked a time, come back here and continue.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button className="btn-gold btn-full btn-lg" onClick={onContinue}>
              I've booked my call — continue →
            </button>
            <button className="btn-ghost btn-full" onClick={handleOpen}>
              Open scheduling page again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PreTest ──────────────────────────────────────────────────
function PreTest({ completedPath, studentName, onTakeTest, onSkip }) {
  const isQuestionnaire = completedPath === 'questionnaire'

  const handleBookLesson = () => {
    window.open(CALENDLY_FIRST_LESSON, '_blank')
    onSkip()
  }

  return (
    <div className="flow-card pretest-card">
      <FlowSteps current={2} />
      <div className="pretest-heading">
        <span className="confirmation-icon">✅</span>
        <h2>
          {isQuestionnaire
            ? (studentName ? `Thanks, ${studentName}!` : "You're all set!")
            : 'Your consultation is booked!'}
        </h2>
        <p className="flow-sub">
          {isQuestionnaire
            ? 'Dogukan has everything he needs. What would you like to do next?'
            : 'Dogukan will design your lesson from your consultation. You can also take a quick placement test in the meantime — completely optional.'}
        </p>
      </div>
      <div className="next-steps-grid">
        <div className="next-step-card next-step-primary">
          <div className="next-step-icon">📝</div>
          <span className="next-step-tag">Recommended</span>
          <h3>Take the placement test</h3>
          <p>12 questions, about 10 minutes. Covers grammar, vocabulary, reading and writing. Helps Dogukan plan your first lesson even better.</p>
          <button className="btn-gold btn-full" onClick={onTakeTest}>
            Take the test →
          </button>
        </div>
        <div className="next-step-card">
          <div className="next-step-icon">{isQuestionnaire ? '📅' : '✓'}</div>
          <h3>{isQuestionnaire ? 'Book my first lesson now' : "I'm all done"}</h3>
          <p>
            {isQuestionnaire
              ? 'Skip the test and go straight to booking your free 60-minute first lesson with Dogukan.'
              : "No test needed — Dogukan will assess your level naturally during your consultation call."}
          </p>
          <button className="btn-outline btn-full" onClick={isQuestionnaire ? handleBookLesson : onSkip}>
            {isQuestionnaire ? 'Book my lesson →' : 'Back to home'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PlacementTest ────────────────────────────────────────────
function PlacementTest({ onSubmit, onBack }) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const total = TEST_QUESTIONS.length
  const q = TEST_QUESTIONS[current]
  const progress = (current / total) * 100
  const isLast = current === total - 1
  const canProceed = answers[q.id] !== undefined && String(answers[q.id]).trim() !== ''

  const handleAnswer = (val) => setAnswers((a) => ({ ...a, [q.id]: val }))

  const handleNext = () => {
    if (isLast) onSubmit(answers)
    else setCurrent((c) => c + 1)
  }

  const handleBack = () => {
    if (current > 0) setCurrent((c) => c - 1)
    else onBack()
  }

  return (
    <div className="flow-card test-card">
      <FlowSteps current={2} />
      <div className="test-header">
        <div className="test-progress-label">
          <span>{q.category}</span>
          <span>Question {current + 1} of {total}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {q.passage && (
        <div className="passage-box">
          <div className="passage-label">Read the passage</div>
          <p>{q.passage}</p>
        </div>
      )}

      <div className="test-question">
        <p className="question-text">{q.question}</p>
        {q.hint && <p className="question-hint">{q.hint}</p>}
      </div>

      {(q.type === 'multiple-choice' || q.type === 'reading') && (
        <div className="options-list">
          {q.options.map((opt) => (
            <button
              key={opt}
              className={`option-btn ${answers[q.id] === opt ? 'selected' : ''}`}
              onClick={() => handleAnswer(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {q.type === 'fill-blank' && (
        <input
          type="text" className="fill-input"
          placeholder={q.placeholder}
          value={answers[q.id] || ''}
          onChange={(e) => handleAnswer(e.target.value)}
        />
      )}
      {q.type === 'writing' && (
        <textarea
          className="writing-input"
          placeholder={q.placeholder}
          value={answers[q.id] || ''}
          onChange={(e) => handleAnswer(e.target.value)}
          rows={6}
        />
      )}

      <div className="test-nav">
        <button className="btn-ghost" onClick={handleBack}>← Back</button>
        <button className="btn-gold" onClick={handleNext} disabled={!canProceed}>
          {isLast ? 'Submit test →' : 'Next →'}
        </button>
      </div>
    </div>
  )
}

// ─── Grading ──────────────────────────────────────────────────
function Grading({ answers, onDone }) {
  useEffect(() => {
    const timer = setTimeout(() => onDone(gradeTestLocally(answers)), 1500)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flow-card text-center">
      <div className="grading-spinner" />
      <h2>Calculating your results…</h2>
      <p className="flow-sub">
        Reviewing your answers across grammar, vocabulary and reading.
      </p>
    </div>
  )
}

function gradeTestLocally(answers) {
  // Accepted answers for fill-in-the-blank questions (case-insensitive)
  const FILL_ACCEPTED = {
    4: ['could'],
    5: ['had already left'],
    8: ['absorbed'],
  }

  let grammar = 0, vocab = 0, reading = 0
  const writingAnswer = String(answers[12] || '').trim()

  TEST_QUESTIONS.forEach((q) => {
    if (q.type === 'writing') return
    const given = String(answers[q.id] || '').trim().toLowerCase()
    let correct = false
    if (q.type === 'multiple-choice' || q.type === 'reading') {
      correct = given === q.correct.toLowerCase()
    } else if (q.type === 'fill-blank') {
      correct = (FILL_ACCEPTED[q.id] || []).some((a) => a.toLowerCase() === given)
    }
    if (q.category === 'Grammar') grammar += correct ? 1 : 0
    else if (q.category === 'Vocabulary') vocab += correct ? 1 : 0
    else if (q.category === 'Reading') reading += correct ? 1 : 0
  })

  // Grammar: Q1–Q5 (5 questions), Vocabulary: Q6–Q8 (3), Reading: Q9–Q11 (3)
  const gs = Math.round((grammar / 5) * 100)
  const vs = Math.round((vocab / 3) * 100)
  const rs = Math.round((reading / 3) * 100)
  const overall = Math.round((gs + vs + rs) / 3)

  let level, levelName
  if (overall < 25)      { level = 'A1'; levelName = 'Beginner' }
  else if (overall < 40) { level = 'A2'; levelName = 'Elementary' }
  else if (overall < 58) { level = 'B1'; levelName = 'Pre-Intermediate' }
  else if (overall < 73) { level = 'B2'; levelName = 'Upper Intermediate' }
  else if (overall < 88) { level = 'C1'; levelName = 'Advanced' }
  else                   { level = 'C2'; levelName = 'Proficiency' }

  const allScores = [
    { label: 'Grammar',    score: gs },
    { label: 'Vocabulary', score: vs },
    { label: 'Reading',    score: rs },
  ]
  const STRENGTHS = {
    Grammar:    'Good command of grammar structures',
    Vocabulary: 'Strong vocabulary range',
    Reading:    'Excellent reading comprehension',
  }
  const IMPROVEMENTS = {
    Grammar:    'Grammar structures need more practice',
    Vocabulary: 'Build a wider vocabulary range',
    Reading:    'Practise reading longer texts',
  }

  const strengths = allScores.filter((s) => s.score >= 60).map((s) => STRENGTHS[s.label])
  const areas_to_improve = allScores.filter((s) => s.score < 60).map((s) => IMPROVEMENTS[s.label])
  if (!strengths.length) strengths.push('Motivated to learn — a great foundation to build on')
  if (!areas_to_improve.length) areas_to_improve.push('Keep challenging yourself with advanced material')

  const MESSAGES = {
    A1: "You're at the very start of your English journey — every lesson will make a real difference.",
    A2: "You have a foundation to build on. With focused practice, you'll progress quickly.",
    B1: "You're at a solid intermediate level. You can communicate in many situations and you're ready to grow.",
    B2: "You have strong English skills. Let's polish and take you to the next level.",
    C1: "Excellent — you're at an advanced level. Dogukan will focus on fluency and nuance.",
    C2: "Outstanding English. Your results show near-native proficiency.",
  }

  const preview = writingAnswer.length > 120 ? writingAnswer.slice(0, 120) + '…' : writingAnswer
  return {
    level,
    level_name: levelName,
    grammar_score: gs,
    vocabulary_score: vs,
    reading_score: rs,
    writing_answer: writingAnswer,
    overall_score: overall,
    strengths,
    areas_to_improve,
    teacher_notes: `${level} (${overall}% on grammar/vocab/reading). Writing pending review: "${preview}"`,
    recommended_course: levelName,
    encouraging_message: MESSAGES[level],
  }
}

// ─── Results ──────────────────────────────────────────────────
function Results({ results, completedPath, user, onBookLesson, onDone }) {
  if (!results) return null

  const levelColors = {
    A1: '#94a3b8', A2: '#60a5fa',
    B1: '#3b82f6', B2: '#6366f1',
    C1: '#d4a853', C2: '#f59e0b',
  }
  const color = levelColors[results.level] || '#d4a853'

  const ScoreBar = ({ label, score }) => (
    <div className="score-row">
      <div className="score-label-row">
        <span>{label}</span>
        <span className="score-num">{score}%</span>
      </div>
      <div className="score-track">
        <div className="score-fill" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  )

  return (
    <div className="flow-card">
      <FlowSteps current={3} />
      <div className="results-header text-center">
        <div className="result-level-badge" style={{ borderColor: color, color }}>
          {results.level}
        </div>
        <h2>{results.level_name}</h2>
        <p className="flow-sub">{results.encouraging_message}</p>
      </div>

      <div className="results-scores">
        <h3>Your scores</h3>
        <ScoreBar label="Grammar" score={results.grammar_score} />
        <ScoreBar label="Vocabulary" score={results.vocabulary_score} />
        <ScoreBar label="Reading" score={results.reading_score} />
        <div className="writing-pending">
          <span className="writing-pending-label">Writing</span>
          <span className="writing-pending-note">Dogukan will review your written answer before your first lesson</span>
        </div>
        <div className="overall-score">
          Overall score: <strong>{results.overall_score}%</strong>
        </div>
      </div>

      <div className="results-feedback">
        <div className="feedback-col">
          <h3>✓ Strengths</h3>
          <ul>
            {(results.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
        <div className="feedback-col">
          <h3>→ Areas to improve</h3>
          <ul>
            {(results.areas_to_improve || []).map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      </div>

      {results.teacher_notes && (
        <div className="teacher-notes">
          <h3>Dogukan's notes</h3>
          <p>{results.teacher_notes}</p>
        </div>
      )}

      <div className="results-recommendation">
        Recommended course: <strong>{results.recommended_course}</strong>
      </div>

      {completedPath === 'questionnaire' ? (
        <>
          <button
            className="btn-gold btn-full btn-lg"
            style={{ marginBottom: '0.75rem' }}
            onClick={onBookLesson}
          >
            {user ? 'Book your free first lesson →' : 'Create account & book your lesson →'}
          </button>
          <button className="btn-ghost btn-full" onClick={onDone}>
            Back to home
          </button>
        </>
      ) : (
        <>
          <div className="consultation-note">
            Your results will be shared with Dogukan before your consultation call.
          </div>
          <button className="btn-ghost btn-full" onClick={onDone}>
            Back to home
          </button>
        </>
      )}
    </div>
  )
}

// ─── AuthPage ─────────────────────────────────────────────────
function AuthPage({ studentData, onSuccess, onBack, defaultMode = 'signup' }) {
  const [mode, setMode] = useState(defaultMode) // 'signup' | 'login'
  const [name, setName] = useState(studentData?.name || '')
  const [email, setEmail] = useState(studentData?.email || '')
  const [password, setPassword] = useState('')
  const [referralCodeInput, setReferralCodeInput] = useState('')
  const [referralApplied, setReferralApplied] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email, password,
          options: { data: { name } },
        })
        if (err) throw err
        if (data.user) {
          // Process referral code if provided
          if (referralCodeInput.trim()) {
            const referrer = await lookupReferralCode(referralCodeInput)
            if (referrer && referrer.id !== data.user.id) {
              await logReferral({ referrerId: referrer.id, referredEmail: email, referredId: data.user.id })
              setReferralApplied(true)
            }
          }
          onSuccess(data.user)
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        if (data.user) onSuccess(data.user)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!supabase) {
    return (
      <div className="flow-card text-center">
        <span className="confirmation-icon">⚠️</span>
        <h2>Database not connected</h2>
        <p className="flow-sub">
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your environment variables to enable accounts.
        </p>
        <button className="btn-ghost btn-full" onClick={onBack}>← Back</button>
      </div>
    )
  }

  return (
    <div className="flow-card">
      <FlowSteps current={3} />
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2>{mode === 'signup' ? 'Create your account' : 'Sign in'}</h2>
      <p className="flow-sub">
        {mode === 'signup'
          ? 'Your test results will be saved and you can book your free first lesson.'
          : 'Welcome back — sign in to access your lessons and results.'}
      </p>

      <form onSubmit={handleSubmit} className="booking-form">
        {mode === 'signup' && (
          <div className="form-field">
            <label>Your name</label>
            <input type="text" placeholder="e.g. Maria" value={name}
              onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="form-field">
          <label>Email address</label>
          <input type="email" placeholder="e.g. maria@email.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-field">
          <label>Password {mode === 'signup' && <span className="field-hint">(at least 6 characters)</span>}</label>
          <input type="password" placeholder="••••••••" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        {mode === 'signup' && (
          <div className="form-field">
            <label>Referral code <span className="optional">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. DOG4F2"
              value={referralCodeInput}
              onChange={e => setReferralCodeInput(e.target.value.toUpperCase())}
              maxLength={8}
              style={{ textTransform: 'uppercase' }}
            />
          </div>
        )}

        {referralApplied && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.4rem', padding: '0.6rem 0.85rem', fontSize: '0.88rem', color: '#166534' }}>
            Referral code applied! Your friend will get their discount.
          </div>
        )}
        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="btn-gold btn-full btn-lg" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'signup' ? 'Create account & book lesson →' : 'Sign in →'}
        </button>
      </form>

      <div className="auth-toggle">
        {mode === 'signup' ? (
          <>Already have an account?{' '}
            <button className="link-btn" onClick={() => { setMode('login'); setError(null) }}>Sign in</button>
          </>
        ) : (
          <>Don't have an account?{' '}
            <button className="link-btn" onClick={() => { setMode('signup'); setError(null) }}>Sign up</button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Access level helpers ─────────────────────────────────────
const ACCESS_META = {
  pending:        { label: 'Awaiting approval',   color: '#94a3b8', desc: 'Dogukan will approve your account shortly.' },
  trial:          { label: 'Trial access',         color: '#60a5fa', desc: 'You have full access during your trial.' },
  pay_per_lesson: { label: 'Pay per lesson',       color: '#4ade80', desc: 'Active — book your next lesson anytime.' },
  bundle_12:      { label: 'Bundle — 12 lessons',  color: '#d4a853', desc: 'Track your progress across all 12 lessons below.' },
}

function AccessBadge({ level, style = {} }) {
  const m = ACCESS_META[level] || ACCESS_META.pending
  return (
    <span className="access-badge" style={{ '--badge-color': m.color, ...style }}>{m.label}</span>
  )
}

// ─── getWeeklyProgress helper ─────────────────────────────────
function getWeeklyProgress(assignments) {
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

// ─── StudentDashboard ─────────────────────────────────────────
function StudentDashboard({ user, onSignOut, onBook, onSettings }) {
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

  if (!user) {
    return (
      <div className="flow-card text-center">
        <span className="confirmation-icon">🔒</span>
        <h2>Sign in to view your dashboard</h2>
        <p className="flow-sub">Create an account or sign in to access your lessons and results.</p>
      </div>
    )
  }

  const name = profile?.name || user.user_metadata?.name || user.email?.split('@')[0]
  const levelColors = { A1: '#94a3b8', A2: '#60a5fa', B1: '#3b82f6', B2: '#6366f1', C1: '#d4a853', C2: '#f59e0b' }
  const color = result ? (levelColors[result.cefr_level] || '#d4a853') : '#d4a853'
  const accessLevel = profile?.access_level || 'pending'
  const completedCount = lessons.filter(l => l.status === 'completed').length
  const isPending = accessLevel === 'pending'

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
            {accessLevel === 'bundle_12' && (
              <div className="access-bundle-progress">
                <span className="access-bundle-count">{completedCount}<span>/12</span></span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>lessons done</span>
              </div>
            )}
          </div>

          {isPending ? (
            <div className="dashboard-pending-msg">
              <p>✉️ Your account is awaiting approval. Dogukan will activate it shortly — usually within 24 hours.</p>
            </div>
          ) : (
            <>
              {/* ── Upcoming lesson ── */}
              {nextLesson && (
                <div className="upcoming-lesson-card">
                  <div className="upcoming-lesson-label">📅 Next lesson</div>
                  <div className="upcoming-lesson-meta">
                    <strong className="upcoming-lesson-date">
                      {new Date(nextLesson.scheduled_at).toLocaleDateString('en-GB', {
                        weekday: 'long', day: 'numeric', month: 'long'
                      })}
                    </strong>
                    <span className="upcoming-lesson-time">
                      {new Date(nextLesson.scheduled_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                      {nextLesson.duration_minutes ? ` · ${nextLesson.duration_minutes} min` : ''}
                    </span>
                  </div>
                  {nextLesson.title && (
                    <p className="upcoming-lesson-title">"{nextLesson.title}"</p>
                  )}
                  {nextLesson.teacher_notes_public && (
                    <p className="upcoming-lesson-note">📝 {nextLesson.teacher_notes_public}</p>
                  )}
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

              <div className="dashboard-actions">
                <button className="btn-gold btn-full btn-lg" onClick={onBook}>
                  Book your next lesson →
                </button>
              </div>

              {/* ── Lesson history ── */}
              <StudentLessonList lessons={lessons} onFeedbackSaved={(id, fb) =>
                setLessons(prev => prev.map(l => l.id === id ? { ...l, student_feedback: fb } : l))} />

              {/* ── Exercises (grouped by lesson plan, then solo) ── */}
              {(() => {
                const planAsgns = assignments.filter(a => a.lesson_plan_id)
                const soloAsgns = assignments.filter(a => !a.lesson_plan_id)
                // Group plan assignments by plan id, preserving insertion order
                const planMap = {}
                planAsgns.forEach(a => {
                  if (!planMap[a.lesson_plan_id]) planMap[a.lesson_plan_id] = { plan: a.lesson_plans, items: [] }
                  planMap[a.lesson_plan_id].items.push(a)
                })
                const planGroups = Object.entries(planMap)

                const renderExerciseRow = (a) => {
                  const ex = a.exercises
                  const submitted = a.status === 'submitted'
                  return (
                    <div key={a.id} className={`exercise-row ${submitted ? 'exercise-row--done' : ''}`}>
                      <div className="exercise-row-left">
                        <span className="exercise-mode-chip">
                          {a.mode === 'homework' ? '🏠 Homework' : '🎓 In class'}
                        </span>
                        <strong className="exercise-title">{ex?.title}</strong>
                        {a.note && <p className="exercise-note">💬 {a.note}</p>}
                        {!a.lesson_plan_id && (
                          <span className="exercise-date">
                            {submitted
                              ? `Submitted ${new Date(a.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                              : `Assigned ${new Date(a.assigned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                          </span>
                        )}
                      </div>
                      <div className="exercise-row-right">
                        {submitted ? (
                          <button className="btn-ghost" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                            onClick={() => handleViewSubmission(a)}>View →</button>
                        ) : (
                          <button className="btn-gold" onClick={() => openExercise(a)}>Start →</button>
                        )}
                      </div>
                    </div>
                  )
                }

                return (
                  <>
                    {planGroups.length > 0 && (
                      <div className="dashboard-exercises">
                        <h3 className="dashboard-section-title">📚 My Lesson Plans</h3>
                        <div className="plan-card-list">
                          {planGroups.map(([planId, { plan, items }]) => {
                            const doneCount = items.filter(a => a.status === 'submitted').length
                            return (
                              <div key={planId} className="plan-card">
                                <div className="plan-card-header">
                                  <div>
                                    <strong className="plan-card-title">{plan?.title || 'Lesson Plan'}</strong>
                                    <span className="plan-card-progress">
                                      {doneCount}/{items.length} done
                                    </span>
                                  </div>
                                </div>
                                {plan?.description && (
                                  <p className="plan-card-desc">{plan.description}</p>
                                )}
                                <div className="plan-exercises">
                                  {items.map(a => renderExerciseRow(a))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {assignments.length === 0 ? (
                      <div className="dashboard-exercises">
                        <h3 className="dashboard-section-title">📝 My Exercises</h3>
                        <p className="dashboard-empty-small">No exercises assigned yet.</p>
                      </div>
                    ) : soloAsgns.length > 0 && (
                      <div className="dashboard-exercises">
                        <h3 className="dashboard-section-title">📝 My Exercises</h3>
                        <div className="exercise-list">
                          {soloAsgns.map(a => renderExerciseRow(a))}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

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
                      <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.7rem' }}
                        onClick={() => setShowVocab(v => !v)}>
                        {showVocab ? 'Hide' : 'Show all'}
                      </button>
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

// ─── StudentLessonList ────────────────────────────────────────
function StudentLessonList({ lessons, onFeedbackSaved }) {
  const [feedbackId,   setFeedbackId]   = useState(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [saving,       setSaving]       = useState(false)

  if (lessons.length === 0) return null

  const handleFeedbackSave = async (lessonId) => {
    setSaving(true)
    const ok = await submitLessonFeedback(lessonId, feedbackText)
    setSaving(false)
    if (ok) { onFeedbackSaved(lessonId, feedbackText); setFeedbackId(null); setFeedbackText('') }
  }

  return (
    <div className="dashboard-exercises">
      <h3 className="dashboard-section-title">📅 My Lessons</h3>
      <div className="lesson-list">
        {lessons.map((l) => (
          <div key={l.id} className="lesson-row">
            <div className="lesson-row-top">
              <div className="lesson-row-left">
                <span className={`lesson-status-chip lesson-status-chip--${l.status}`}>
                  {l.status === 'completed' ? '✓ Completed' : l.status === 'cancelled' ? '✕ Cancelled' : '◷ Upcoming'}
                </span>
                <span className="lesson-title">
                  {l.lesson_no ? `Lesson ${l.lesson_no}` : 'Lesson'}
                  {l.title ? ` — ${l.title}` : ''}
                </span>
                {l.scheduled_at && (
                  <span className="lesson-date">
                    {new Date(l.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {l.duration_minutes && (
                  <span className="lesson-duration-chip">⏱ {l.duration_minutes} min</span>
                )}
              </div>
            </div>
            {(l.teacher_notes_public || (l.notes_visible && l.teacher_notes)) && (
              <div className="lesson-teacher-note">
                <span className="lesson-note-label">📝 Note from Dogukan:</span>
                <p>{l.teacher_notes_public || l.teacher_notes}</p>
              </div>
            )}
            {l.student_feedback ? (
              <p className="lesson-my-feedback">Your feedback: {l.student_feedback}</p>
            ) : l.status === 'completed' && feedbackId !== l.id ? (
              <button className="lesson-feedback-btn" onClick={() => { setFeedbackId(l.id); setFeedbackText('') }}>
                + Leave feedback
              </button>
            ) : feedbackId === l.id ? (
              <div className="lesson-feedback-form">
                <textarea className="writing-input" rows={2} style={{ marginBottom: 0 }}
                  placeholder="How did the lesson go? What did you find helpful?"
                  value={feedbackText} onChange={e => setFeedbackText(e.target.value)} />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn-gold" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
                    onClick={() => handleFeedbackSave(l.id)} disabled={saving || !feedbackText.trim()}>
                    {saving ? 'Saving…' : 'Save feedback'}
                  </button>
                  <button className="btn-ghost" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
                    onClick={() => setFeedbackId(null)}>Cancel</button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AccountSettings ──────────────────────────────────────────
function AccountSettings({ user, onBack, onSignOut }) {
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
function parseWordChoiceTemplate(template) {
  const tokens = []
  let idx = 0
  const re = /\[([^\]]+)\]/g
  let lastEnd = 0
  let match
  while ((match = re.exec(template)) !== null) {
    if (match.index > lastEnd)
      tokens.push({ type: 'text', value: template.slice(lastEnd, match.index) })
    const inner = match[1]
    if (inner === '___') {
      tokens.push({ type: 'blank', index: idx++ })
    } else if (inner.includes('/')) {
      tokens.push({ type: 'choice', options: inner.split('/'), index: idx++ })
    } else {
      tokens.push({ type: 'text', value: match[0] })
    }
    lastEnd = match.index + match[0].length
  }
  if (lastEnd < template.length)
    tokens.push({ type: 'text', value: template.slice(lastEnd) })
  return tokens
}

// ─── WordChoiceQuestion ───────────────────────────────────────
// Interactive sentence renderer used in ExercisePlayer, ExerciseDemoPlayer,
// AdminExerciseReview (read-only) and StudentSubmissionReview (read-only).
function WordChoiceQuestion({ template, answer, onChange, disabled = false }) {
  const tokens  = parseWordChoiceTemplate(template || '')
  const current = answer
    ? (() => { try { return JSON.parse(answer) } catch { return {} } })()
    : {}

  const setChoice = (tokenIdx, val) => {
    const next = { ...current }
    if (next[tokenIdx] === val) delete next[tokenIdx] // toggle off
    else next[tokenIdx] = val
    onChange(JSON.stringify(next))
  }

  const setBlank = (tokenIdx, val) => {
    onChange(JSON.stringify({ ...current, [tokenIdx]: val }))
  }

  return (
    <div className="word-choice-sentence">
      {tokens.map((tok, i) => {
        if (tok.type === 'text')
          return <span key={i} className="word-choice-text">{tok.value}</span>

        if (tok.type === 'choice')
          return (
            <span key={i} className="word-choice-group">
              {tok.options.map(opt => (
                <button key={opt} type="button" disabled={disabled}
                  className={`word-choice-btn ${current[tok.index] === opt ? 'word-choice-btn--selected' : ''}`}
                  onClick={() => !disabled && setChoice(tok.index, opt)}>
                  {opt}
                </button>
              ))}
            </span>
          )

        if (tok.type === 'blank')
          return (
            <input key={i} type="text" className="word-choice-blank"
              disabled={disabled}
              placeholder="___"
              value={current[tok.index] || ''}
              onChange={e => !disabled && setBlank(tok.index, e.target.value)}
            />
          )

        return null
      })}
    </div>
  )
}

// ─── Fill-blank helpers ───────────────────────────────────────
// Parse student answer: JSON {"0":"word","1":"word2"} or legacy plain string
function parseFillBlankAnswer(str) {
  if (!str) return {}
  try {
    const p = JSON.parse(str)
    if (typeof p === 'object' && !Array.isArray(p)) return p
    if (Array.isArray(p)) return Object.fromEntries(p.map((v, i) => [i, v]))
  } catch {}
  return { 0: str }
}
// Parse correct answer: JSON ["ans1","ans2"] or legacy plain string
function parseFillBlankCorrect(str) {
  if (!str) return []
  try {
    const p = JSON.parse(str)
    if (Array.isArray(p)) return p
    if (typeof p === 'object') return Object.values(p)
  } catch {}
  return [str]
}

// ─── InlineFillBlank ─────────────────────────────────────────
// Renders a fill-blank prompt with inline <input> fields for each ___.
// answer   : JSON string {"0":"word","1":"word2"} or legacy plain string
// onChange : (newJsonStr) => void
// disabled : read-only mode
// checked  : show correct/wrong colouring (demo mode)
// correctAnswers : string[] for colouring when checked=true
function InlineFillBlank({ prompt, answer, onChange, disabled = false, checked = false, correctAnswers = null }) {
  const parts = (prompt || '').split('___')  // N+1 text segments, N blanks
  const blankCount = parts.length - 1

  const current = parseFillBlankAnswer(answer || '')

  const setBlank = (idx, val) => {
    onChange(JSON.stringify({ ...current, [idx]: val }))
  }

  // Render text segment preserving line breaks
  const renderText = (text) =>
    text.split('\n').flatMap((line, i) =>
      i === 0 ? [line] : [<br key={i} />, line]
    )

  // Fallback: no template typed yet — show numbered input rows
  if (blankCount === 0) {
    if (!disabled) {
      return (
        <div className="inline-fill-fallback">
          <p className="inline-fill-fallback-note">⚠️ The teacher hasn't added the text template yet. Your teacher will update this exercise.</p>
        </div>
      )
    }
    // In disabled/review mode with no template, just show the raw text if any
    return prompt ? <div className="inline-fill-text">{renderText(prompt)}</div> : null
  }

  return (
    <div className="inline-fill-wrap">
      {!disabled && (
        <p className="inline-fill-hint">
          ✏️ Type your answers directly into the blanks below:
        </p>
      )}
      <div className="inline-fill-text">
        {parts.map((part, i) => {
          const isLast = i === parts.length - 1
          let inputClass = 'inline-fill-input'
          if (checked && correctAnswers && !isLast) {
            const ok = (current[i] || '').trim().toLowerCase() === (correctAnswers[i] || '').trim().toLowerCase()
            inputClass += ok ? ' inline-fill-input--correct' : ' inline-fill-input--wrong'
          }
          if (disabled && !checked) inputClass += ' inline-fill-input--readonly'
          return (
            <span key={i}>
              {renderText(part)}
              {!isLast && (
                <input
                  type="text"
                  className={inputClass}
                  disabled={disabled}
                  placeholder="..."
                  value={current[i] || ''}
                  onChange={e => !disabled && setBlank(i, e.target.value)}
                />
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── FbBlankEditor (builder only) ────────────────────────────
// Shows an exercise image. Dogukan can:
//   • Click + drag to draw a new blank box
//   • Click an existing blank box to remove it
// blanks  : [{x,y,w,h} percentages]
// onChange: (newBlanks) => void
function FbBlankEditor({ src, blanks, onChange }) {
  const wrapRef = useRef(null)
  const [drawing, setDrawing] = useState(null) // {startX,startY} in %

  const pct = (e) => {
    const rect = wrapRef.current.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width)  * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    }
  }

  const onMouseDown = (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    const p = pct(e)
    setDrawing({ sx: p.x, sy: p.y })
  }
  const onMouseMove = (e) => {
    if (!drawing) return
    const p = pct(e)
    setDrawing(d => ({ ...d, cx: p.x, cy: p.y }))
  }
  const onMouseUp = (e) => {
    if (!drawing) return
    const p = pct(e)
    const x = Math.min(drawing.sx, p.x)
    const y = Math.min(drawing.sy, p.y)
    const w = Math.abs(p.x - drawing.sx)
    const h = Math.abs(p.y - drawing.sy)
    setDrawing(null)
    if (w < 1 || h < 0.5) return // too small — ignore accidental clicks
    onChange([...blanks, { x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)),
                           w: parseFloat(w.toFixed(2)), h: parseFloat(h.toFixed(2)) }])
  }

  // Preview rect while dragging
  const preview = drawing?.cx != null ? {
    x: Math.min(drawing.sx, drawing.cx),
    y: Math.min(drawing.sy, drawing.cy),
    w: Math.abs(drawing.cx - drawing.sx),
    h: Math.abs(drawing.cy - drawing.sy),
  } : null

  return (
    <div
      ref={wrapRef}
      className="fb-blank-editor"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => setDrawing(null)}>
      <img src={src} alt="Exercise" className="fb-blank-editor-img" draggable={false} />

      {/* Existing blanks */}
      {blanks.map((b, i) => (
        <div key={i} className="fb-blank-box"
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
          onMouseDown={e => { e.stopPropagation() }}
          onClick={() => onChange(blanks.filter((_, j) => j !== i))}>
          <span className="fb-blank-box-num">{i + 1}</span>
          <span className="fb-blank-box-del">✕</span>
        </div>
      ))}

      {/* Live draw preview */}
      {preview && (
        <div className="fb-blank-box fb-blank-box--drawing"
          style={{ left: `${preview.x}%`, top: `${preview.y}%`,
                   width: `${preview.w}%`, height: `${preview.h}%` }} />
      )}
    </div>
  )
}

// ─── ImageOverlayFill ─────────────────────────────────────────
// Shows an exercise image with absolutely-positioned <input> boxes
// placed over each detected blank. Students type directly on the image.
function ImageOverlayFill({ src, blanks, answers, onChange, disabled = false }) {
  const imgRef = useRef(null)
  const [fontSize, setFontSize] = useState(14)

  // Scale font-size to match rendered image height
  useEffect(() => {
    const update = () => {
      if (imgRef.current) {
        // Assume average blank height is ~5% of image; map to font-size
        const renderedH = imgRef.current.clientHeight
        setFontSize(Math.max(10, Math.round(renderedH * 0.035)))
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [src])

  const current = (() => {
    try { return JSON.parse(answers || '{}') } catch { return {} }
  })()

  const setBlank = (i, val) =>
    onChange(JSON.stringify({ ...current, [i]: val }))

  return (
    <div className="img-overlay-wrap">
      <img ref={imgRef} src={src} alt="Exercise" className="img-overlay-img"
        onLoad={() => {
          if (imgRef.current) {
            const renderedH = imgRef.current.clientHeight
            setFontSize(Math.max(10, Math.round(renderedH * 0.035)))
          }
        }}
      />
      {blanks.map((b, i) => (
        <input
          key={i}
          type="text"
          className="img-overlay-input"
          disabled={disabled}
          value={current[i] || ''}
          onChange={e => !disabled && setBlank(i, e.target.value)}
          style={{
            left:     `${b.x}%`,
            top:      `${b.y}%`,
            width:    `${b.w}%`,
            height:   `${b.h}%`,
            fontSize: `${fontSize}px`,
          }}
        />
      ))}
    </div>
  )
}

// ─── ExercisePlayer (student) ─────────────────────────────────
function ExercisePlayer({ assignment, questions, studentId, onBack, onSubmitted }) {
  const ex = assignment.exercises
  const [answers, setAnswers] = useState({})
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const setAnswer = (qId, val) => setAnswers(prev => ({ ...prev, [qId]: val }))

  const allAnswered = questions.every(q => {
    if (q.type === 'listening' || q.type === 'viewing') return true
    if (q.type === 'matching') {
      if (!answers[q.id]) return false
      try {
        const matched = JSON.parse(answers[q.id])
        return (q.options || []).length > 0 && (q.options || []).every(p => matched[p.left])
      } catch { return false }
    }
    if (q.type === 'word_choice') {
      if (!answers[q.id]) return false
      try {
        const ans      = JSON.parse(answers[q.id])
        const tokens   = parseWordChoiceTemplate(q.prompt)
        const interact = tokens.filter(t => t.type === 'choice' || t.type === 'blank')
        if (!interact.length) return true
        return interact.every(t => (ans[t.index] ?? '').toString().trim().length > 0)
      } catch { return false }
    }
    if (q.type === 'fill_blank') {
      const overlay = parseOverlayPrompt(q.prompt)
      if (overlay) {
        // overlay mode: at least one blank filled is enough (Dogukan reviews manually)
        try {
          const ans = JSON.parse(answers[q.id] || '{}')
          return overlay.blanks.length === 0 ||
            overlay.blanks.some((_, i) => (ans[i] || '').trim().length > 0)
        } catch { return false }
      }
      const blanks = (q.prompt || '').split('___').length - 1
      if (blanks === 0) return true
      const ans = parseFillBlankAnswer(answers[q.id] || '')
      return Array.from({ length: blanks }, (_, i) => (ans[i] || '').trim().length > 0).every(Boolean)
    }
    return (answers[q.id] ?? '').trim().length > 0
  })

  const handleSubmit = async () => {
    setSubmitting(true)
    const ok = await submitExerciseAnswers(assignment.id, answers, studentId)
    setSubmitting(false)
    if (ok) { setDone(true); setTimeout(() => onSubmitted(assignment.id), 2200) }
  }

  if (done) {
    return (
      <div className="flow-card text-center">
        <span className="confirmation-icon" style={{ fontSize: '3rem' }}>✅</span>
        <h2>Submitted!</h2>
        <p className="flow-sub">Your teacher will review your answers and go through them with you in your next lesson.</p>
      </div>
    )
  }

  return (
    <div className="flow-card exercise-player-card">
      <button className="back-btn" onClick={onBack}>← Back to dashboard</button>

      <div className="exercise-player-header">
        <span className={`exercise-mode-chip exercise-mode-chip--${assignment.mode}`}>
          {assignment.mode === 'homework' ? '🏠 Homework' : '🎓 In class'}
        </span>
        <h2>{ex?.title}</h2>
        {ex?.description && <p className="flow-sub">{ex.description}</p>}
        {assignment.note && (
          <div className="exercise-teacher-note">
            <strong>Note from Dogukan:</strong> {assignment.note}
          </div>
        )}
      </div>

      {/* ── Audio link ── */}
      {ex?.audio_url && (
        <div className="exercise-audio-block">
          <span className="exercise-context-label">🎧 Listen first</span>
          <a href={ex.audio_url} target="_blank" rel="noopener noreferrer" className="exercise-audio-link">
            Open audio / video →
          </a>
          <p className="exercise-audio-hint">Click the link, listen, then come back to fill in the exercise.</p>
        </div>
      )}
      {/* ── Context text (reading passage) ── */}
      {ex?.context_text && (
        <div className="exercise-context-text">
          <p className="exercise-context-label">📖 Read this first</p>
          <div className="exercise-context-passage">{ex.context_text}</div>
        </div>
      )}
      {/* ── Context images (skip if fill_blank overlay — the image is shown on the overlay) ── */}
      {ex?.context_images?.length > 0 && !(
        questions.length > 0 && questions[0].type === 'fill_blank' &&
        parseOverlayPrompt(questions[0].prompt)
      ) && (
        <div className="exercise-context-images">
          <p className="exercise-context-label">📖 Reference material</p>
          {ex.context_images.map((src, i) => (
            <img key={i} src={src} alt={`Reference ${i + 1}`} className="exercise-context-img" />
          ))}
        </div>
      )}

      <div className="exercise-questions">
        {questions.map((q, idx) => {
          if (q.type === 'listening' || q.type === 'viewing') return null

          // Fill-blank: overlay on image if positions detected, otherwise inline text
          if (q.type === 'fill_blank') {
            const overlay = parseOverlayPrompt(q.prompt)
            return (
              <div key={q.id} className="exercise-fill-block">
                {q.hint && <p className="eq-hint" style={{ marginBottom: '0.5rem' }}>💡 Hint: {q.hint}</p>}
                {overlay && ex?.context_images?.[0] ? (
                  <ImageOverlayFill
                    src={ex.context_images[0]}
                    blanks={overlay.blanks}
                    answers={answers[q.id] || null}
                    onChange={val => setAnswer(q.id, val)}
                  />
                ) : (
                  <InlineFillBlank
                    prompt={q.prompt}
                    answer={answers[q.id] || null}
                    onChange={val => setAnswer(q.id, val)}
                  />
                )}
              </div>
            )
          }

          return (
          <div key={q.id} className="exercise-question">
            <div className="eq-label">
              <span className="eq-num">Q{idx + 1}</span>
              <span className="eq-type">
                {q.type === 'multiple_choice' ? 'Multiple choice'
                 : q.type === 'true_false'     ? 'True / False'
                 : q.type === 'matching'       ? 'Matching'
                 : q.type === 'word_choice'    ? 'Word choice'
                 : 'Written answer'}
              </span>
            </div>
            {q.type !== 'word_choice' && <p className="eq-prompt">{q.prompt}</p>}
            {q.hint && <p className="eq-hint">Hint: {q.hint}</p>}

            {q.type === 'multiple_choice' && (
              <div className="options-list">
                {(q.options || []).map((opt) => (
                  <button key={opt}
                    className={`option-btn ${answers[q.id] === opt ? 'selected' : ''}`}
                    onClick={() => setAnswer(q.id, opt)}
                  >{opt}</button>
                ))}
              </div>
            )}
            {q.type === 'true_false' && (
              <div className="options-list" style={{ flexDirection: 'row', gap: '0.75rem' }}>
                {['True', 'False'].map(opt => (
                  <button key={opt}
                    className={`option-btn ${answers[q.id] === opt ? 'selected' : ''}`}
                    style={{ flex: 1, textAlign: 'center' }}
                    onClick={() => setAnswer(q.id, opt)}
                  >{opt === 'True' ? '✓ True' : '✗ False'}</button>
                ))}
              </div>
            )}
            {q.type === 'matching' && (
              <MatchingQuestion
                pairs={q.options || []}
                answer={answers[q.id] || null}
                onChange={val => setAnswer(q.id, val)}
              />
            )}
            {q.type === 'free_text' && (
              <textarea className="writing-input" rows={4}
                placeholder={q.hint || 'Write your answer here…'}
                value={answers[q.id] || ''}
                onChange={e => setAnswer(q.id, e.target.value)}
              />
            )}
            {q.type === 'word_choice' && (
              <WordChoiceQuestion
                template={q.prompt}
                answer={answers[q.id] || null}
                onChange={val => setAnswer(q.id, val)}
              />
            )}
          </div>
          )
        })}
      </div>

      {/* Verbal-activity note for listening/viewing exercises */}
      {questions.every(q => q.type === 'listening' || q.type === 'viewing') && questions.length > 0 && (
        <div className="verbal-activity-note">
          {questions[0].type === 'listening' ? '🎧' : '🎥'}
          <span>
            {questions[0].type === 'listening'
              ? 'Listen carefully and be ready to discuss with your teacher.'
              : 'Watch carefully and be ready to discuss with your teacher.'}
          </span>
        </div>
      )}

      {!confirming ? (
        <div className="exercise-submit-row">
          {!allAnswered && <p className="exercise-submit-hint">Answer all questions before submitting.</p>}
          <button className="btn-gold btn-lg" disabled={!allAnswered} onClick={() => setConfirming(true)}>
            {questions.every(q => q.type === 'listening' || q.type === 'viewing') && questions.length > 0
              ? 'Mark as done →'
              : 'Submit answers →'}
          </button>
        </div>
      ) : (
        <div className="exercise-confirm-box">
          <p><strong>⚠️ Are you sure?</strong> Once you submit, you cannot change your answers. Your teacher will review them.</p>
          <div className="exercise-confirm-actions">
            <button className="btn-outline" onClick={() => setConfirming(false)}>Go back and check</button>
            <button className="btn-gold" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Yes, submit now'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MatchingQuestion (student drag-and-drop) ─────────────────
function MatchingQuestion({ pairs, answer, onChange }) {
  const [rightShuffled] = useState(() => [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5))
  const [dragOver, setDragOver]   = useState(null)

  const current   = answer ? (() => { try { return JSON.parse(answer) } catch { return {} } })() : {}
  const usedRight = Object.values(current)

  const unmatched = rightShuffled.filter(r => !usedRight.includes(r))

  const drop = (e, leftVal) => {
    e.preventDefault()
    const rightVal = e.dataTransfer.getData('text/plain')
    const next = { ...current }
    Object.keys(next).forEach(k => { if (next[k] === rightVal) delete next[k] })
    next[leftVal] = rightVal
    onChange(JSON.stringify(next))
    setDragOver(null)
  }

  const clearMatch = (leftVal) => {
    const next = { ...current }
    delete next[leftVal]
    onChange(JSON.stringify(next))
  }

  return (
    <div className="matching-container">
      {unmatched.length > 0 && (
        <div className="matching-bank">
          <p className="matching-bank-label">Drag to match ↓</p>
          <div className="matching-bank-items">
            {unmatched.map(r => (
              <div key={r} className="matching-chip"
                draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', r)}>
                {r}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="matching-pairs">
        {pairs.map(pair => {
          const matched = current[pair.left]
          const isOver  = dragOver === pair.left
          return (
            <div key={pair.left} className="matching-pair-row">
              <div className="matching-left">{pair.left}</div>
              <span className="matching-arrow">→</span>
              <div
                className={`matching-drop ${isOver ? 'drag-over' : ''} ${matched ? 'matched' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(pair.left) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => drop(e, pair.left)}
              >
                {matched
                  ? <><span className="matching-chip matched-chip">{matched}</span>
                      <button className="matching-clear" onClick={() => clearMatch(pair.left)}>✕</button></>
                  : <span className="matching-placeholder">Drop here…</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ExerciseDemoPlayer (admin — interactive preview) ─────────
function ExerciseDemoPlayer({ exercise, questions, onBack }) {
  const [answers, setAnswers] = useState({})

  const setAnswer = (qId, val) => setAnswers(prev => ({ ...prev, [qId]: val }))

  const typeLabel = (t) =>
    t === 'multiple_choice' ? 'Multiple choice'
    : t === 'fill_blank'    ? 'Fill in the blank'
    : t === 'true_false'    ? 'True / False'
    : t === 'matching'      ? 'Matching'
    : t === 'word_choice'   ? 'Word choice'
    : t === 'listening'     ? 'Listening'
    : t === 'viewing'       ? 'Viewing'
    : 'Written answer'

  return (
    <div className="flow-card exercise-player-card">
      <button className="back-btn" onClick={onBack}>← Back to library</button>
      <div className="exercise-demo-badge">🎓 Preview / Demo mode</div>
      <div className="exercise-player-header">
        <h2>{exercise?.title}</h2>
        {exercise?.description && <p className="flow-sub">{exercise.description}</p>}
      </div>

      {exercise?.audio_url && (
        <div className="exercise-audio-block">
          <span className="exercise-context-label">🎧 Listen first</span>
          <a href={exercise.audio_url} target="_blank" rel="noopener noreferrer" className="exercise-audio-link">
            Open audio / video →
          </a>
        </div>
      )}
      {exercise?.context_text && (
        <div className="exercise-context-text">
          <p className="exercise-context-label">📖 Read this first</p>
          <div className="exercise-context-passage">{exercise.context_text}</div>
        </div>
      )}
      {exercise?.context_images?.length > 0 && !(
        questions.length > 0 && questions[0].type === 'fill_blank' &&
        parseOverlayPrompt(questions[0].prompt)
      ) && (
        <div className="exercise-context-images">
          <p className="exercise-context-label">📖 Reference material</p>
          {exercise.context_images.map((src, i) => (
            <img key={i} src={src} alt={`Reference ${i + 1}`} className="exercise-context-img" />
          ))}
        </div>
      )}

      <div className="exercise-questions">
        {(!questions || questions.length === 0) && (
          <p style={{ color: 'var(--text-muted)' }}>This exercise has no questions yet.</p>
        )}
        {questions && questions.every(q => q.type === 'listening' || q.type === 'viewing') && questions.length > 0 && (
          <div className="verbal-activity-note">
            {questions[0].type === 'listening' ? '🎧' : '🎥'}
            <span>{questions[0].type === 'listening' ? 'Listening activity — verbal discussion.' : 'Viewing activity — verbal discussion.'}</span>
          </div>
        )}
        {(questions || []).map((q, idx) => {
          if (q.type === 'listening' || q.type === 'viewing') return null
          const result = getResult(q)

          // Fill-blank: overlay on image (demo/screen-share mode — Dogukan can type too)
          if (q.type === 'fill_blank') {
            const overlay = parseOverlayPrompt(q.prompt)
            return (
              <div key={q.id} className="exercise-fill-block">
                {q.hint && <p className="eq-hint" style={{ marginBottom: '0.5rem' }}>💡 Hint: {q.hint}</p>}
                {overlay && exercise?.context_images?.[0] ? (
                  <ImageOverlayFill
                    src={exercise.context_images[0]}
                    blanks={overlay.blanks}
                    answers={answers[q.id] || null}
                    onChange={val => setAnswer(q.id, val)}
                  />
                ) : (
                  <InlineFillBlank
                    prompt={q.prompt}
                    answer={answers[q.id] || null}
                    onChange={val => setAnswer(q.id, val)}
                  />
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
              {q.type !== 'word_choice' && q.type !== 'fill_blank' && <p className="eq-prompt">{q.prompt}</p>}
              {q.hint && <p className="eq-hint">Hint: {q.hint}</p>}

              {q.type === 'multiple_choice' && (
                <div className="options-list">
                  {(q.options||[]).map(opt => (
                    <button key={opt} className={`option-btn ${answers[q.id]===opt?'selected':''}`}
                      onClick={() => setAnswer(q.id, opt)}>{opt}</button>
                  ))}
                </div>
              )}
              {q.type === 'true_false' && (
                <div className="options-list" style={{ flexDirection:'row', gap:'0.75rem' }}>
                  {['True','False'].map(opt => (
                    <button key={opt} className={`option-btn ${answers[q.id]===opt?'selected':''}`}
                      style={{ flex:1, textAlign:'center' }}
                      onClick={() => setAnswer(q.id, opt)}>
                      {opt === 'True' ? '✓ True' : '✗ False'}
                    </button>
                  ))}
                </div>
              )}
              {q.type === 'matching' && (
                <MatchingQuestion pairs={q.options||[]} answer={answers[q.id]||null}
                  onChange={val => setAnswer(q.id, val)} />
              )}
              {q.type === 'free_text' && (
                <textarea className="writing-input" rows={4}
                  placeholder={q.hint || 'Write your answer here…'}
                  value={answers[q.id]||''} onChange={e => setAnswer(q.id, e.target.value)} />
              )}
              {q.type === 'word_choice' && (
                <WordChoiceQuestion
                  template={q.prompt}
                  answer={answers[q.id] || null}
                  onChange={val => setAnswer(q.id, val)}
                />
              )}
              {!['multiple_choice','true_false','matching','free_text','word_choice','fill_blank','listening','viewing'].includes(q.type) && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem' }}>Preview not available for this exercise type.</p>
              )}
            </div>
          )
        })}
      </div>

      {!questions.every(q => q.type === 'listening' || q.type === 'viewing') && (
        <div className="exercise-submit-row">
          <button className="btn-ghost" onClick={() => setAnswers({})}>
            ↺ Reset
          </button>
        </div>
      )}
    </div>
  )
}

// ─── VocabCaptureBar ──────────────────────────────────────────
function VocabCaptureBar({ exerciseId, studentId }) {
  const [word,    setWord]    = useState('')
  const [saved,   setSaved]   = useState(false)
  const [saving,  setSaving]  = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!word.trim() || !studentId) return
    setSaving(true)
    const ok = await addVocabularyWord({ studentId, word: word.trim(), exerciseId })
    setSaving(false)
    if (ok) { setWord(''); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <form className="vocab-capture-bar no-print" onSubmit={handleSave}>
      <span className="vocab-capture-label">📖 Save a word from this exercise:</span>
      <input type="text" placeholder="Type a word or phrase…" value={word}
        onChange={e => { setWord(e.target.value); setSaved(false) }} />
      <button type="submit" className="btn-ghost" disabled={saving || !word.trim()}
        style={{ fontSize: '0.82rem', padding: '0.35rem 0.7rem' }}>
        {saving ? '…' : saved ? '✓ Saved' : 'Save'}
      </button>
    </form>
  )
}

// ─── StudentSubmissionReview ──────────────────────────────────
function StudentSubmissionReview({ assignment, questions, answerMap, onBack }) {
  const ex = assignment.exercises

  const typeLabel = (t) =>
    t === 'multiple_choice' ? 'Multiple choice'
    : t === 'fill_blank'    ? 'Fill in the blank'
    : t === 'true_false'    ? 'True / False'
    : t === 'matching'      ? 'Matching'
    : t === 'word_choice'   ? 'Word choice'
    : t === 'listening'     ? 'Listening'
    : t === 'viewing'       ? 'Viewing'
    : 'Written answer'

  return (
    <div className="flow-card exercise-player-card">
      <div className="submission-review-toolbar no-print">
        <button className="back-btn" onClick={onBack}>← Back to dashboard</button>
        <button className="btn-ghost" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
          onClick={() => window.print()}>
          🖨️ Print / Save PDF
        </button>
      </div>
      <VocabCaptureBar exerciseId={ex?.id} studentId={assignment.student_id} />

      <div className="exercise-player-header">
        <span className={`exercise-mode-chip exercise-mode-chip--${assignment.mode}`}>
          {assignment.mode === 'homework' ? '🏠 Homework' : '🎓 In class'}
        </span>
        <h2>{ex?.title}</h2>
        {ex?.description && <p className="flow-sub">{ex.description}</p>}
        {assignment.note && (
          <div className="exercise-teacher-note">
            <strong>Note from Dogukan:</strong> {assignment.note}
          </div>
        )}
      </div>

      {/* Dogukan's feedback */}
      {assignment.teacher_feedback ? (
        <div className="submission-feedback-card">
          <p className="submission-feedback-label">💬 Dogukan's feedback</p>
          <p className="submission-feedback-text">{assignment.teacher_feedback}</p>
        </div>
      ) : (
        <div className="submission-pending-msg">
          ⏳ Dogukan will go through this exercise with you and leave feedback after your lesson.
        </div>
      )}

      {/* Context images — hidden for fill_blank overlay (image is embedded in the answer display) */}
      {ex?.context_images?.length > 0 && !(
        questions.length > 0 && questions[0].type === 'fill_blank' &&
        parseOverlayPrompt(questions[0].prompt)
      ) && (
        <div className="exercise-context-images">
          <p className="exercise-context-label">📖 Reference material</p>
          {ex.context_images.map((src, i) => (
            <img key={i} src={src} alt={`Reference ${i + 1}`} className="exercise-context-img" />
          ))}
        </div>
      )}

      <div className="exercise-questions">
        {questions.map((q, idx) => {
          if (q.type === 'listening' || q.type === 'viewing') return null
          const sa = answerMap[q.id]

          // Fill-blank overlay: show image with typed answers
          if (q.type === 'fill_blank' && parseOverlayPrompt(q.prompt)) {
            const overlay = parseOverlayPrompt(q.prompt)
            return (
              <div key={q.id} className="exercise-fill-block">
                {ex?.context_images?.[0] && (
                  <ImageOverlayFill
                    src={ex.context_images[0]}
                    blanks={overlay.blanks}
                    answers={sa?.answer || null}
                    onChange={() => {}}
                    disabled={true}
                  />
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
              {q.type !== 'word_choice' && q.type !== 'fill_blank' && <p className="eq-prompt">{q.prompt}</p>}

              <div className="submission-answer-block">
                <span className="review-label">Your answer:</span>
                {q.type === 'word_choice' ? (
                  sa?.answer
                    ? <WordChoiceQuestion template={q.prompt} answer={sa.answer} onChange={() => {}} disabled={true} />
                    : <div className="review-answer-box review-answer-empty"><em>No answer given</em></div>
                ) : q.type === 'fill_blank' ? (
                  sa?.answer
                    ? <InlineFillBlank prompt={q.prompt} answer={sa.answer} onChange={() => {}} disabled={true} />
                    : <div className="review-answer-box review-answer-empty"><em>No answer given</em></div>
                ) : q.type === 'matching' && sa?.answer ? (
                  <div className="review-matching-pairs">
                    {(() => { try {
                      const m = JSON.parse(sa.answer)
                      return (q.options||[]).map(p => (
                        <div key={p.left} className="review-match-row">
                          <span>{p.left}</span><span>→</span>
                          <span>{m[p.left] || <em style={{color:'var(--text-dim)'}}>not matched</em>}</span>
                        </div>
                      ))
                    } catch { return <em>Error reading answer</em> } })()}
                  </div>
                ) : (
                  <div className={`review-answer-box ${!sa?.answer?.trim() ? 'review-answer-empty' : ''}`}>
                    {sa?.answer?.trim() || <em>No answer given</em>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── AdminLessonStages tab ────────────────────────────────────
function AdminLessonStages({ adminUserId }) {
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
  const [showLabelMgr,   setShowLabelMgr]   = useState(false) // label management panel open
  const [deletingLabelId,setDeletingLabelId]= useState(null)
  const [showBookMgr,    setShowBookMgr]    = useState(false) // book management panel open
  const [newBookTitle,   setNewBookTitle]   = useState('')
  const [savingBook,     setSavingBook]     = useState(false)
  const [deletingBookId, setDeletingBookId] = useState(null)

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
    const ok = await deleteExercise(id)
    if (ok) {
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
        const filteredExercises = filterLabelIds.length === 0
          ? sectionFiltered
          : sectionFiltered.filter(ex => (ex.labels || []).some(l => filterLabelIds.includes(l.id)))
        return (
          <div>
            <div className="admin-exercises-toolbar">
              <h3 style={{ margin: 0 }}>Stage Library ({filteredExercises.length}{(filterStageType || filterLabelIds.length > 0 || filterBookId || filterUnit || filterPage || filterSection) ? ` / ${exercises.length}` : ''})</h3>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => { setShowBookMgr(false); setShowLabelMgr(p => !p) }}>🏷 Labels</button>
                <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => { setShowLabelMgr(false); setShowBookMgr(p => !p) }}>📚 Books</button>
                <button className="btn-gold" onClick={() => setView('create-stage')}>+ Create lesson stage</button>
              </div>
            </div>

            {/* ── Stage type filter ── */}
            <div className="stage-type-filter">
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

            {/* ── Label manager ── */}
            {showLabelMgr && (
              <div className="label-mgr-panel">
                <p className="label-mgr-title">Manage labels</p>
                {labels.length === 0 ? (
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>
                    No labels yet. Create them from inside any exercise.
                  </p>
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

            {/* ── Book filter ── */}
            {books.length > 0 && (
              <div className="library-filter-row">
                <span className="library-filter-label">📚 Book:</span>
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
            )}

            {/* ── Location filter (unit / page / section) ── */}
            <div className="library-filter-row library-filter-row--location">
              <span className="library-filter-label">📍</span>
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
                <button className="btn-ghost"
                  style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                  onClick={() => { setFilterUnit(''); setFilterPage(''); setFilterSection('') }}>
                  Clear
                </button>
              )}
            </div>

            {/* ── Label filter ── */}
            {labels.length > 0 && (
              <div className="library-filter-row">
                <span className="library-filter-label">Filter:</span>
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
            )}

            {loading ? <div className="dashboard-loading">Loading…</div>
            : exercises.length === 0 ? (
              <div className="dashboard-empty">
                <p>No lesson stages yet.</p>
                <p className="flow-sub" style={{ fontSize: '0.88rem' }}>Click "Create lesson stage" to build your first one — or upload a textbook photo.</p>
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="dashboard-empty">
                <p>No stages match the selected filter.</p>
                <button className="btn-ghost" style={{ fontSize: '0.85rem' }} onClick={() => { setFilterLabelIds([]); setFilterStageType(null); setFilterBookId(null); setFilterUnit(''); setFilterPage(''); setFilterSection('') }}>Clear filter</button>
              </div>
            ) : (
              <div className="library-list">
                {filteredExercises.map(ex => {
                  const stDef = STAGE_TYPES.find(t => t.value === ex.stage_type) || { icon: '✏️', label: 'Exercise' }
                  return (
                  <div key={ex.id} className="library-row">
                    {ex.thumbnail && (
                      <img src={ex.thumbnail} alt="" className="library-row-thumb" />
                    )}
                    <div className="library-row-main">
                      <div className="library-row-info">
                        <strong style={{ fontSize: '0.95rem' }}>{ex.title}</strong>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem', alignItems: 'center' }}>
                          <span className="stage-type-badge-sm" style={{ fontSize: '0.75rem', padding: '0.18rem 0.5rem' }}>{stDef.icon} {stDef.label}</span>
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
                          {ex.estimated_minutes && (
                            <span className="admin-level-chip" style={{ color: 'var(--text-muted)' }}>⏱ {ex.estimated_minutes} min</span>
                          )}
                          {ex.audio_url && <span className="admin-level-chip" style={{ color: 'var(--text-muted)' }}>🎧 Audio</span>}
                          {ex.context_text && <span className="admin-level-chip" style={{ color: 'var(--text-muted)' }}>📖 Text</span>}
                          {(ex.labels || []).map(lbl => (
                            <span key={lbl.id} className="label-chip" style={{ '--lbl-color': lbl.color }}>{lbl.name}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
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
                  </div>
                )})}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

// ─── LessonPlanView ───────────────────────────────────────────
function LessonPlanView({ plan, exercises, onBack }) {
  const [viewMode, setViewMode] = useState('teacher') // 'teacher' | 'student'

  const lessonStages = (plan.lesson_stages ?? [])
    .filter(s => (s.section ?? 'lesson') !== 'homework')
    .sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0) || a.order_index - b.order_index)

  const homeworkStages = (plan.lesson_stages ?? [])
    .filter(s => (s.section ?? 'lesson') === 'homework')

  // Group lesson stages by stage_number
  const stageGroups = lessonStages.reduce((acc, s) => {
    const num = s.stage_number ?? 1
    if (!acc[num]) acc[num] = { number: num, name: s.stage_name, items: [] }
    acc[num].items.push(s)
    return acc
  }, {})

  const studentName = plan.profiles?.name || plan.profiles?.email || plan.manual_students?.name

  return (
    <div>
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1rem', flexWrap:'wrap' }}>
        <button className="back-btn" onClick={onBack}>← Back to plans</button>
        <div style={{ display:'flex', gap:'0.5rem', marginLeft:'auto', flexWrap:'wrap' }}>
          <button className="btn-ghost"
            style={{ fontSize:'0.85rem', ...(viewMode==='teacher' ? {background:'var(--gold)', color:'#fff', borderColor:'var(--gold)'} : {}) }}
            onClick={() => setViewMode('teacher')}>👨‍🏫 Teacher view</button>
          <button className="btn-ghost"
            style={{ fontSize:'0.85rem', ...(viewMode==='student' ? {background:'var(--gold)', color:'#fff', borderColor:'var(--gold)'} : {}) }}
            onClick={() => setViewMode('student')}>👤 Student view</button>
          {viewMode === 'teacher' && (
            <button className="btn-ghost" style={{ fontSize:'0.85rem' }} onClick={() => window.print()}>🖨 Print</button>
          )}
        </div>
      </div>

      {/* Plan title */}
      <h2 style={{ margin:'0 0 0.5rem', fontSize:'1.4rem' }}>{plan.title}</h2>

      {/* Metadata chips */}
      <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1rem' }}>
        {studentName && (
          <span className="admin-level-chip">👤 {studentName}</span>
        )}
        {plan.scheduled_at && (
          <span className="admin-level-chip" style={{ color:'var(--gold)' }}>
            📅 {new Date(plan.scheduled_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
          </span>
        )}
      </div>

      {/* Teacher-only metadata section */}
      {viewMode === 'teacher' && (plan.lesson_aim || plan.teaching_point || plan.language_analysis) && (
        <div style={{ background:'#FFFBF0', border:'1px solid #f0e8c8', borderRadius:'10px', padding:'1rem', marginBottom:'1.25rem' }}>
          {plan.lesson_aim && (
            <>
              <strong>🎯 Lesson aim</strong>
              <p style={{ margin:'0.25rem 0 0.75rem', whiteSpace:'pre-wrap' }}>{plan.lesson_aim}</p>
            </>
          )}
          {plan.teaching_point && (
            <>
              <strong>✏️ Teaching point</strong>
              <p style={{ margin:'0.25rem 0 0.75rem', whiteSpace:'pre-wrap' }}>{plan.teaching_point}</p>
            </>
          )}
          {plan.language_analysis && (
            <>
              <strong>🔬 Language analysis</strong>
              <p style={{ margin:'0.25rem 0', whiteSpace:'pre-wrap' }}>{plan.language_analysis}</p>
            </>
          )}
        </div>
      )}

      {/* Lesson stages */}
      <div className="builder-section">
        <h4 className="builder-section-title">📌 Lesson stages</h4>
        {Object.values(stageGroups).map(group => (
          <div key={group.number} style={{ marginBottom:'1rem' }}>
            <div style={{ fontWeight:600, marginBottom:'0.4rem', color:'var(--gold)' }}>
              Stage {group.number}{group.name ? ` — ${group.name}` : ''}
            </div>
            {group.items.map(stage => {
              const ex = exercises.find(e => e.id === stage.exercise_id)
              return (
                <div key={stage.id} style={{ padding:'0.5rem 0.75rem', background:'#fff', borderRadius:'7px', border:'1px solid #e8e3d8', marginBottom:'0.4rem', fontSize:'0.9rem' }}>
                  {ex ? ex.title : stage.title || 'Stage item'}
                  {viewMode === 'teacher' && stage.duration_minutes && (
                    <span style={{ color:'var(--text-muted)', fontSize:'0.8rem', marginLeft:'0.5rem' }}>⏱ {stage.duration_minutes} min</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
        {Object.keys(stageGroups).length === 0 && (
          <p style={{ color:'var(--text-muted)', fontSize:'0.88rem' }}>No stages yet.</p>
        )}
      </div>

      {/* Homework section */}
      {homeworkStages.length > 0 && (
        <div className="builder-section" style={{ marginTop:'1rem' }}>
          <h4 className="builder-section-title">📚 Homework</h4>
          {homeworkStages.map(stage => {
            const ex = exercises.find(e => e.id === stage.exercise_id)
            return (
              <div key={stage.id} style={{ padding:'0.5rem 0.75rem', background:'#fff', borderRadius:'7px', border:'1px solid #e8e3d8', marginBottom:'0.4rem', fontSize:'0.9rem' }}>
                {ex ? ex.title : stage.title || 'Homework exercise'}
                {stage.content_text && (
                  <span style={{ color:'var(--text-muted)', fontSize:'0.82rem', marginLeft:'0.5rem' }}>— {stage.content_text}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── AdminLessonPlans ─────────────────────────────────────────
function AdminLessonPlans({ adminUserId }) {
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
  const [deletingPlanId, setDeletingPlanId] = useState(null)

  // Assign plan to student
  const [assigningPlanId, setAssigningPlanId] = useState(null)
  const [apStudentId,     setApStudentId]     = useState('')
  const [apMode,          setApMode]          = useState('homework')
  const [apNote,          setApNote]          = useState('')
  const [apSaving,        setApSaving]        = useState(false)
  const [apError,         setApError]         = useState(null)
  const [apDone,          setApDone]          = useState(false)
  const [apMultiIds,      setApMultiIds]      = useState([]) // selected student IDs for bulk assign
  const [apBulkDone,      setApBulkDone]      = useState([]) // track which student IDs succeeded

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchAllExercises(),
      fetchAllLessonPlans(),
      fetchAllLabels(),
      fetchAllBooks(),
      fetchStudentsAdmin(),
      fetchManualStudents(),
    ]).then(([exs, pls, lbls, bks, auths, manuals]) => {
      setExercises(exs); setPlans(pls); setLabels(lbls)
      setBooks(bks); setAuthStudents(auths); setManualStudents(manuals)
      setLoading(false)
    })
  }, [])

  const reloadAll = () => Promise.all([fetchAllExercises(), fetchAllLessonPlans()])
    .then(([exs, pls]) => { setExercises(exs); setPlans(pls) })

  const handleAssignPlan = async (planId) => {
    if (!apStudentId) { setApError('Please select a student.'); return }
    setApSaving(true); setApError(null)
    const ok = await assignLessonPlan({ planId, studentId: apStudentId, assignedBy: adminUserId, mode: apMode, note: apNote || null })
    setApSaving(false)
    if (ok) {
      setApDone(true)
      setTimeout(() => { setAssigningPlanId(null); setApDone(false); setApStudentId(''); setApNote('') }, 2000)
    } else { setApError('Assignment failed — this plan may have no exercises, or student already has them.') }
  }

  const handleBulkAssign = async (planId) => {
    if (!apMultiIds.length) { setApError('Select at least one student.'); return }
    setApSaving(true); setApError(null)
    const results = await Promise.all(
      apMultiIds.map(sid => assignLessonPlan({ planId, studentId: sid, assignedBy: adminUserId, mode: apMode, note: apNote || null }))
    )
    setApSaving(false)
    const succeeded = apMultiIds.filter((_, i) => results[i])
    setApBulkDone(succeeded)
    if (succeeded.length === apMultiIds.length) {
      setTimeout(() => { setAssigningPlanId(null); setApMultiIds([]); setApBulkDone([]); setApNote('') }, 2000)
    }
  }

  // Push a history entry when entering create/edit so the browser ← button
  // returns to the plan list rather than leaving the admin panel entirely.
  useEffect(() => {
    if (view !== 'list') {
      window.history.pushState({ adminPlanEdit: true }, '', '/admin')
    }
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handlePop = () => {
      if (view !== 'list') {
        setView('list')
        setEditingPlan(null)
        setViewingPlan(null)
      }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [view])

  const builderProps = {
    exercises, labels, books, authStudents, manualStudents, adminUserId,
  }

  if (view === 'create') {
    return <LessonStageBuilder {...builderProps}
      onCancel={() => setView('list')}
      onSaved={() => { reloadAll(); setView('list') }} />
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
      onBack={() => { setView('list'); setViewingPlan(null) }} />
  }

  return (
    <div>
      <div className="admin-exercises-toolbar">
        <h3 style={{ margin: 0 }}>Lesson Plans ({plans.length})</h3>
        <button className="btn-gold" onClick={() => setView('create')}>+ Create plan</button>
      </div>

      {/* Assign-to-student panel */}
      {assigningPlanId && (() => {
        const plan = plans.find(p => p.id === assigningPlanId)
        return (
          <div className="admin-assign-form" style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.75rem', fontWeight: 600 }}>Assign: {plan?.title}</p>
            <div className="form-field">
              <label>Student(s)</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <button type="button" className={`radio-option ${!apMultiIds.length ? 'selected' : ''}`}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem' }}
                  onClick={() => { setApMultiIds([]); setApStudentId('') }}>
                  Single student
                </button>
                <button type="button" className={`radio-option ${apMultiIds.length > 0 ? 'selected' : ''}`}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem' }}
                  onClick={() => { setApStudentId(''); setApMultiIds([]) }}>
                  Multiple students
                </button>
              </div>
              {apMultiIds.length === 0 ? (
                <select value={apStudentId} onChange={e => setApStudentId(e.target.value)}>
                  <option value="">Select student…</option>
                  {authStudents.filter(s => s.access_level !== 'pending').map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.email}</option>
                  ))}
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
                </div>
              )}
            </div>
            <div className="form-field">
              <label>Mode</label>
              <div className="radio-group" style={{ flexDirection: 'row', gap: '0.5rem' }}>
                {['homework', 'in_class'].map(m => (
                  <button key={m} type="button"
                    className={`radio-option ${apMode === m ? 'selected' : ''}`}
                    style={{ flex: 1, justifyContent: 'center' }} onClick={() => setApMode(m)}>
                    {m === 'homework' ? '🏠 Homework' : '🎓 In class'}
                  </button>
                ))}
              </div>
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
              disabled={apSaving || (!apStudentId && apMultiIds.length === 0) || apDone}
              onClick={() => apMultiIds.length > 0
                ? handleBulkAssign(assigningPlanId)
                : handleAssignPlan(assigningPlanId)}>
              {apSaving ? 'Assigning…'
                : apMultiIds.length > 0
                  ? `Assign to ${apMultiIds.length} student${apMultiIds.length > 1 ? 's' : ''} →`
                  : 'Assign all exercises to student →'}
            </button>
          </div>
        )
      })()}

      {loading ? <p>Loading…</p> : plans.length === 0 ? (
        <div className="dashboard-empty"><p>No lesson plans yet.</p></div>
      ) : (
        <div className="plan-list">
          {plans.map(p => {
            const stageCount  = (p.lesson_stages ?? []).length
            const legacyCount = (p.lesson_plan_exercises ?? []).length
            const count       = stageCount > 0 ? stageCount : legacyCount
            const totalMins   = (p.lesson_stages ?? []).reduce((s, st) => s + (st.duration_minutes || 0), 0)
            return (
              <div key={p.id} className="plan-row">
                <div>
                  <strong>{p.title}</strong>
                  {p.description && <span className="plan-desc"> — {p.description}</span>}
                  <div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(p.profiles || p.manual_students) && (
                      <span className="admin-level-chip">
                        👤 {(p.profiles?.name || p.profiles?.email) ?? (p.manual_students?.name)}
                        {(p.profiles?.english_level || p.manual_students?.english_level) && (
                          <> · <span style={{ textTransform: 'capitalize' }}>
                            {p.profiles?.english_level || p.manual_students?.english_level}
                          </span></>
                        )}
                      </span>
                    )}
                    {p.scheduled_at && (
                      <span className="admin-level-chip" style={{ color: 'var(--gold)' }}>
                        📅 {new Date(p.scheduled_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                      </span>
                    )}
                    <span className="admin-level-chip">{count} stage{count !== 1 ? 's' : ''}</span>
                    {totalMins > 0 && <span className="admin-level-chip">⏱ {totalMins} min</span>}
                  </div>
                  {/* Stage summary */}
                  {stageCount > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {(p.lesson_stages ?? []).slice().sort((a,b)=>a.order_index-b.order_index).map(st => {
                        const def = STAGE_TYPES.find(t => t.value === st.stage_type) || {}
                        return (
                          <span key={st.id} className="admin-level-chip" style={{ fontSize: '0.78rem' }}>
                            {def.icon} {st.title || def.label}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <button className="btn-ghost"
                    style={{ fontSize: '0.85rem', color: assigningPlanId === p.id ? undefined : 'var(--gold)', borderColor: assigningPlanId === p.id ? undefined : 'var(--gold)' }}
                    onClick={() => {
                      setAssigningPlanId(p.id === assigningPlanId ? null : p.id)
                      setApStudentId(''); setApMode('homework'); setApNote(''); setApError(null); setApDone(false); setApMultiIds([]); setApBulkDone([])
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
                          if (ok) { setPlans(prev => prev.filter(x => x.id !== p.id)); setDeletingPlanId(null) }
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
      )}
    </div>
  )
}

// ─── ExerciseBuilder ─────────────────────────────────────────
const BUILDER_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice', icon: '☑️' },
  { value: 'fill_blank',      label: 'Fill in the Blank', icon: '✏️' },
  { value: 'true_false',      label: 'True / False', icon: '✓✗' },
  { value: 'matching',        label: 'Matching', icon: '↔️' },
  { value: 'word_choice',     label: 'Word Choice', icon: '↕️' },
  { value: 'listening',       label: 'Listening', icon: '🎧' },
  { value: 'viewing',         label: 'Viewing',   icon: '🎥' },
]

// ─── Lesson stage types ───────────────────────────────────────
const STAGE_TYPES = [
  { value: 'controlled_exercise', label: 'Controlled Exercise', icon: '✏️',  hasExercise: true,  hasQuestions: true  },
  { value: 'free_exercise',       label: 'Free Exercise',       icon: '🗣️', hasExercise: true,  hasQuestions: true  },
  { value: 'lead_in',             label: 'Lead-in / Input',     icon: '📥', hasExercise: false, hasQuestions: false },
  { value: 'feedback',            label: 'Feedback',            icon: '💬', hasExercise: false, hasQuestions: false },
  { value: 'instruction',         label: 'Instruction',         icon: '📋', hasExercise: false, hasQuestions: false },
  { value: 'clarification',       label: 'Clarification',       icon: '❓', hasExercise: false, hasQuestions: false },
]

function newStage(type) {
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
  }
}

function initStagesFromPlan(plan) {
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
    }))
}

/** Convert a lesson plan's lesson_stages into grouped stage structure for the builder. */
function initStageGroupsFromPlan(plan) {
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
        exerciseTitle: lpe.exercises.title || '', contentText: '', audioUrl: '', contentImages: [],
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
      contentImages: s.content_images || [],
    })
  })
  return Object.values(groups).sort((a, b) => a.number - b.number)
}

function newQ(type) {
  return {
    tempId:         crypto.randomUUID(),
    type,
    prompt:         '',
    options:        type === 'multiple_choice' ? ['', '', '', '']
                  : type === 'true_false'      ? ['True', 'False']
                  : type === 'matching'        ? [{ left: '', right: '' }]
                  : null,
    correct_answer: type === 'true_false' ? 'True' : '',
    hint:           '',
  }
}

function ExerciseBuilder({ onSaved, onCancel, initialExercise = null, allLabels = [], allBooks = [], onLabelCreated = null, onBookCreated = null, initialStageType = null, cancelLabel = 'Cancel' }) {
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
  const [photoLoading,   setPhotoLoading]   = useState(false)
  const [photoError,     setPhotoError]     = useState(null)
  // OCR review state: null = not in review, string = raw text to review
  const [ocrDraft,       setOcrDraft]       = useState(null)
  // fill_blank picture upload state
  const [fbPicLoading,   setFbPicLoading]   = useState(false)
  const [fbPicError,     setFbPicError]     = useState(null)
  const contextFileRef  = useRef(null)
  const exerciseFileRef = useRef(null)
  const fbPicFileRef    = useRef(null)
  const thumbnailRef    = useRef(null)

  // ── Context images ──────────────────────────────────────────
  const handleContextImages = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - contextImages.length)
    if (!files.length) return
    const compressed = await Promise.all(files.map(f => compressImage(f)))
    setContextImages(prev => [...prev, ...compressed].slice(0, 3))
    e.target.value = ''
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
      // 3. Store as overlay prompt (even if 0 blanks — Dogukan can tap to add)
      const prompt = JSON.stringify({ overlay: true, blanks })
      setQuestions(prev => {
        const q = prev[0] ?? newQ('fill_blank')
        return [{ ...q, type: 'fill_blank', prompt, correct_answer: '' }]
      })
    } catch (err) {
      setFbPicError(err.message ?? 'Failed to read the picture. Please try again.')
    } finally {
      setFbPicLoading(false)
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
    const isVerbal = selType === 'listening' || selType === 'viewing'
    if (!title.trim()) return
    if (stDef?.hasQuestions && !selType) return
    if (stDef?.hasQuestions && !isVerbal && !questions.length) return
    // Location fields are required for exercise stages
    if (stDef?.hasQuestions && (!exUnit || !exPage || !exSection.trim() || !exNo)) {
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
    }
    // For listening/viewing: auto-create one dummy question as the activity type marker
    const questionsToSave = isVerbal
      ? [{ type: selType, prompt: '', order_index: 0, options: [], correct_answer: null, hint: null }]
      : questions
    const id = isEdit
      ? await updateExerciseWithQuestions(initialExercise.id, meta, questionsToSave)
      : await createExerciseWithQuestions(meta, questionsToSave)
    if (id) {
      await setExerciseLabels(id, labelIds)
      setSaving(false)
      onSaved(id)
    } else {
      setSaving(false)
      setSaveError('Something went wrong saving. Check your connection and try again.')
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

  return (
    <div>
      <div className="admin-exercises-toolbar">
        <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Lesson Stage' : 'Create Lesson Stage'}</h3>
        <button className="btn-ghost" onClick={onCancel}>{cancelLabel}</button>
      </div>

      {/* ── Stage type badge ── */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="stage-type-badge-sm">{stageTypeDef.icon} {stageTypeDef.label}</span>
        {!isEdit && (
          <button type="button" style={{ fontSize: '0.78rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            onClick={() => setStageType(null)}>Change</button>
        )}
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
          {contextImages.length < 3 && (
            <button className="builder-upload-btn"
              onClick={() => contextFileRef.current?.click()}>
              + Upload photo {contextImages.length > 0 ? `(${contextImages.length}/3)` : '(up to 3)'}
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
                  onClick={() => setContextImages(p => p.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
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
          <textarea className="writing-input" rows={5}
            placeholder="Paste or type a reading passage here. Students read it before answering the questions."
            value={contextText} onChange={e => setContextText(e.target.value)} />
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
                <>
                  <div className="fb-upload-area">
                    <input ref={fbPicFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={handleFbPicUpload} />

                    {contextImages.length === 0 ? (
                      /* No picture yet — big prominent upload CTA */
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
                      /* Picture uploaded — show thumbnail + re-upload option */
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
                  {contextImages[0] && questions[0] && (() => {
                    const overlay = parseOverlayPrompt(questions[0].prompt)
                    const blanks  = overlay?.blanks ?? []
                    const updateBlanks = (next) => {
                      updateQ(questions[0].tempId, 'prompt', JSON.stringify({ overlay: true, blanks: next }))
                    }
                    return (
                      <div className="fb-preview-section">
                        <div className="fb-preview-header">
                          <span className="fb-preview-label">
                            {blanks.length > 0
                              ? `✅ ${blanks.length} blank${blanks.length !== 1 ? 's' : ''} detected — students will type directly on the image`
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

                        {/* Tap-to-draw blank boxes on the image */}
                        <FbBlankEditor
                          src={contextImages[0]}
                          blanks={blanks}
                          onChange={updateBlanks}
                        />

                        <p className="builder-section-sub" style={{ marginTop: '0.5rem' }}>
                          💡 Click and drag on the image to add a blank. Click an existing blank to remove it.
                        </p>
                      </div>
                    )
                  })()}
                </>
              ) : (
                /* ── All other types: numbered question cards ── */
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
            </div>
          )}
        </>
      )}

      {saveError && <div className="auth-error" style={{ marginTop: '1rem' }}>{saveError}</div>}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button className="btn-gold" onClick={handleSave}
          disabled={saving || !title.trim() || (stageTypeDef.hasQuestions && (!selType || (selType !== 'listening' && selType !== 'viewing' && !questions.length)))}>
          {saving
            ? 'Saving…'
            : isEdit
              ? (stageTypeDef.hasQuestions ? `Update stage (${(selType === 'listening' || selType === 'viewing') ? selType : questions.length + ' Q'})` : 'Update stage')
              : (stageTypeDef.hasQuestions
                  ? ((selType === 'listening' || selType === 'viewing')
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
function BuilderQuestion({ idx, question, onChange, onRemove, canRemove, flat = false }) {
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
          <label>Sentence template</label>
          <p className="builder-section-sub" style={{ marginBottom: '0.5rem' }}>
            Write the sentence. Use <code>[word1/word2]</code> for a two-option choice and <code>[___]</code> for a fill-in blank.
          </p>
          <div className="wc-toolbar">
            <button type="button" className="btn-ghost"
              style={{ fontSize: '0.78rem', padding: '0.28rem 0.65rem' }}
              onClick={() => onChange('prompt', (prompt || '') + '[option1/option2]')}>
              + Insert choice [A/B]
            </button>
            <button type="button" className="btn-ghost"
              style={{ fontSize: '0.78rem', padding: '0.28rem 0.65rem' }}
              onClick={() => onChange('prompt', (prompt || '') + '[___]')}>
              + Insert blank [___]
            </button>
          </div>
          <textarea className="writing-input" rows={3}
            placeholder="e.g. Maria [is/isn't] a good teacher. She [goes/go] to work every day."
            value={prompt || ''}
            onChange={e => onChange('prompt', e.target.value)}
          />
          {prompt?.includes('[') && (
            <div style={{ marginTop: '0.6rem' }}>
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

      {type === 'matching' && (
        <div className="form-field">
          <label>Pairs <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(left ↔ right)</span></label>
          <div className="builder-pairs">
            {(options || []).map((pair, i) => (
              <div key={i} className="builder-pair-row">
                <input type="text" placeholder="Left (word)" value={pair.left || ''}
                  onChange={e => {
                    const nxt = [...options]; nxt[i] = { ...nxt[i], left: e.target.value }
                    onChange('options', nxt)
                  }} />
                <span className="builder-pair-arrow">↔</span>
                <input type="text" placeholder="Right (match)" value={pair.right || ''}
                  onChange={e => {
                    const nxt = [...options]; nxt[i] = { ...nxt[i], right: e.target.value }
                    onChange('options', nxt)
                  }} />
                {options.length > 1 && (
                  <button type="button" className="builder-q-remove"
                    onClick={() => onChange('options', options.filter((_, j) => j !== i))}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="builder-add-pair-btn"
              onClick={() => onChange('options', [...(options || []), { left: '', right: '' }])}>
              + Add pair
            </button>
          </div>
        </div>
      )}

      <div className="form-field">
        <label>Hint <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
        <input type="text" placeholder="e.g. am / is / are"
          value={hint || ''} onChange={e => onChange('hint', e.target.value)} />
      </div>
    </div>
  )
}

// ─── LessonPlanBuilder ────────────────────────────────────────
function LessonPlanBuilder({ exercises, adminUserId, onSaved, onCancel, initialPlan = null }) {
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
function ExercisePicker({ exercises, labels = [], books = [], onSelect, onCancel, cancelLabel = 'Cancel' }) {
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
function StagePicker({ type, allStages, onSelect, onCancel }) {
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
function StageCard({ stage, idx, exercises, onChange, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown, onPickerOpen }) {
  const def         = STAGE_TYPES.find(t => t.value === stage.type)
  const stageImgRef = useRef(null)
  const [imgLoading, setImgLoading] = useState(false)

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

      {/* Exercise picker (exercise stages) */}
      {def.hasExercise && (
        <div className="form-field" style={{ marginBottom: 0 }}>
          {stage.exerciseId ? (
            <div className="stage-selected-row">
              <span className="stage-selected-name">
                {exercises.find(ex => ex.id === stage.exerciseId)?.title || 'Selected exercise'}
              </span>
              <button type="button" className="stage-change-btn" onClick={onPickerOpen}>Change</button>
            </div>
          ) : (
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
          <textarea className="writing-input" rows={3}
            placeholder="📖 Notes, text or instructions (optional)"
            value={stage.contentText}
            onChange={e => onChange('contentText', e.target.value)} />
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
function LessonStageBuilder({
  exercises: allExercises, labels, books, authStudents = [], manualStudents = [],
  adminUserId, onSaved, onCancel, initialPlan = null
}) {
  const isEdit = !!initialPlan

  // Student
  const initStudentType = initialPlan?.manual_student_id ? 'manual'
    : initialPlan?.student_id ? 'profile' : null
  const initStudentId = initialPlan?.manual_student_id ?? initialPlan?.student_id ?? null
  const [studentType,  setStudentType]  = useState(initStudentType)
  const [studentId,    setStudentId]    = useState(initStudentId)

  // Lesson metadata
  const [title,           setTitle]           = useState(initialPlan?.title            ?? '')
  const [lessonAim,       setLessonAim]       = useState(initialPlan?.lesson_aim       ?? '')
  const [teachingPoint,   setTeachingPoint]   = useState(initialPlan?.teaching_point   ?? '')
  const [langAnalysis,    setLangAnalysis]    = useState(initialPlan?.language_analysis ?? '')
  const [scheduledAt,     setScheduledAt]     = useState(() => {
    if (!initialPlan?.scheduled_at) return ''
    const d = new Date(initialPlan.scheduled_at)
    const pad = n => String(n).padStart(2,'0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })

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
  // All exercises including ones created inline during this session
  const [exercises,    setExercises]    = useState(allExercises)

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
      if (draft.scheduledAt)   setScheduledAt(draft.scheduledAt)
      if (draft.studentType)   setStudentType(draft.studentType)
      if (draft.studentId)     setStudentId(draft.studentId)
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
          scheduledAt, studentType, studentId, stageGroups,
          savedAt: Date.now(),
        }))
      } catch { /* storage full — ignore */ }
    }, 300)
    return () => clearTimeout(t)
  }, [title, lessonAim, teachingPoint, langAnalysis, scheduledAt, studentType, studentId, stageGroups]) // eslint-disable-line react-hooks/exhaustive-deps

  // Browser back-button support: push a history entry when picker opens,
  // and close it when the user presses ← browser back.
  useEffect(() => {
    if (pickerCtx) {
      window.history.pushState({ lessonPickerOpen: true }, '')
      window.scrollTo(0, 0)
    }
  }, [!!pickerCtx]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handlePop = () => {
      if (pickerCtx) { setPickerCtx(null); window.scrollTo(0, 0) }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [pickerCtx])

  // Helper: close picker and restore scroll position
  const closePickerCtx = () => { setPickerCtx(null); window.scrollTo(0, 0) }

  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState(null)

  // ── Student derived info ──────────────────────────────────────
  const selectedStudent = useMemo(() => {
    if (!studentId || !studentType) return null
    return studentType === 'manual'
      ? manualStudents.find(s => s.id === studentId)
      : authStudents.find(s => s.id === studentId)
  }, [studentId, studentType, authStudents, manualStudents])

  // ── Stage group helpers ────────────────────────────────────────
  const addStageGroup = () => {
    const nextNum = stageGroups.length > 0
      ? Math.max(...stageGroups.map(g => g.number)) + 1
      : 1
    if (nextNum > 10) return // max 10 stages
    setStageGroups(p => [...p, { number: nextNum, name: '', items: [] }])
  }
  const removeStageGroup = (num) =>
    setStageGroups(p => p.filter(g => g.number !== num))
  const updateGroupName = (num, name) =>
    setStageGroups(p => p.map(g => g.number === num ? { ...g, name } : g))
  const addItemToGroup = (num, item) =>
    setStageGroups(p => p.map(g => g.number === num ? { ...g, items: [...g.items, item] } : g))
  const removeItemFromGroup = (num, itemId) =>
    setStageGroups(p => p.map(g => g.number === num ? { ...g, items: g.items.filter(i => i.id !== itemId) } : g))
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
    const item = newStage('controlled_exercise')
    item.exerciseId    = exercise.id
    item.exerciseTitle = exercise.title
    item.type          = exercise.stage_type || 'controlled_exercise'
    addItemToGroup(pickerCtx.groupNumber, item)
    closePickerCtx()
  }

  const handleNewExerciseSaved = async (newExId) => {
    const reloaded = await fetchAllExercises()
    setExercises(reloaded)
    const newEx = reloaded.find(e => e.id === newExId)
    if (newEx && pickerCtx) {
      const item = newStage(newEx.stage_type || 'controlled_exercise')
      item.exerciseId    = newEx.id
      item.exerciseTitle = newEx.title
      item.type          = newEx.stage_type || 'controlled_exercise'
      addItemToGroup(pickerCtx.groupNumber, item)
    }
    closePickerCtx()
  }

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) return
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
      studentId:        studentType === 'profile' ? studentId : null,
      manualStudentId:  studentType === 'manual'  ? studentId : null,
      lessonAim:        lessonAim,
      teachingPoint:    teachingPoint,
      languageAnalysis: langAnalysis,
      scheduledAt:      scheduledAt ? new Date(scheduledAt).toISOString() : null,
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

  return (
    <div>
      <div className="admin-exercises-toolbar">
        <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Lesson Plan' : 'Create Lesson Plan'}</h3>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
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

      {/* ── Student ── */}
      <div className="builder-section">
        <h4 className="builder-section-title">👤 Student</h4>
        <select value={studentId ? `${studentType}:${studentId}` : ''}
          onChange={e => {
            const val = e.target.value
            if (!val) { setStudentType(null); setStudentId(null); return }
            const [type, id] = val.split(':')
            setStudentType(type); setStudentId(id)
          }}>
          <option value="">— Select student —</option>
          {authStudents.filter(s => s.access_level !== 'pending').length > 0 && (
            <optgroup label="Active students">
              {authStudents.filter(s => s.access_level !== 'pending').map(s => (
                <option key={s.id} value={`profile:${s.id}`}>
                  {s.name || s.email}{s.english_level ? ` (${s.english_level})` : ''}
                </option>
              ))}
            </optgroup>
          )}
          {manualStudents.length > 0 && (
            <optgroup label="Manual students">
              {manualStudents.map(s => (
                <option key={s.id} value={`manual:${s.id}`}>
                  {s.name}{s.english_level ? ` (${s.english_level})` : ''}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {selectedStudent?.english_level && (
          <p style={{ fontSize: '0.82rem', color: 'var(--gold)', marginTop: '0.4rem', margin: '0.4rem 0 0' }}>
            Level: <strong style={{ textTransform: 'capitalize' }}>{selectedStudent.english_level}</strong>
          </p>
        )}
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
          <label>📅 Date &amp; time <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <input type="datetime-local" value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)} />
        </div>
        <div className="form-field" style={{ marginTop: '0.75rem' }}>
          <label>🎯 Lesson aim</label>
          <textarea className="writing-input" rows={2}
            placeholder="e.g. Students will be able to talk about daily habits using the present simple."
            value={lessonAim} onChange={e => setLessonAim(e.target.value)} />
        </div>
        <div className="form-field" style={{ marginTop: '0.75rem' }}>
          <label>✏️ Teaching point</label>
          <textarea className="writing-input" rows={2}
            placeholder="e.g. He/She/It + verb + s/es. Negative: don't / doesn't."
            value={teachingPoint} onChange={e => setTeachingPoint(e.target.value)} />
        </div>
        <div className="form-field" style={{ marginTop: '0.75rem' }}>
          <label>🔬 Language analysis</label>
          <textarea className="writing-input" rows={8}
            placeholder="e.g. Form: S + V(s) + O. Meaning: habitual actions. Pronunciation: /s/ /z/ /ɪz/ endings."
            value={langAnalysis} onChange={e => setLangAnalysis(e.target.value)} />
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
        {stageGroups.map(group => (
          <div key={group.number} className="plan-stage-group">
            <div className="plan-stage-group-header">
              <span className="plan-stage-num">Stage {group.number}</span>
              <input type="text" className="plan-stage-name-input"
                placeholder="Stage name (optional, e.g. Warm-up)"
                value={group.name}
                onChange={e => updateGroupName(group.number, e.target.value)} />
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
                {group.items.map(item => {
                  const def = STAGE_TYPES.find(t => t.value === item.type) || { icon: '✏️', label: 'Exercise' }
                  const exFull = exercises.find(e => e.id === item.exerciseId)
                  const book   = exFull?.book_id ? books.find(b => b.id === exFull.book_id) : null
                  const locParts = [
                    exFull?.unit != null ? `Unit ${exFull.unit}` : null,
                    exFull?.page != null ? `p.${exFull.page}` : null,
                    exFull?.section || null,
                    exFull?.exercise_no != null ? `Ex.${exFull.exercise_no}` : null,
                  ].filter(Boolean)
                  return (
                    <div key={item.id} className="plan-stage-item-card">
                      {exFull?.thumbnail && (
                        <img src={exFull.thumbnail} alt="" className="plan-stage-item-thumb" />
                      )}
                      <div className="plan-stage-item-body">
                        <div className="plan-stage-item-title-row">
                          <span className="plan-stage-item-icon">{def.icon}</span>
                          <span className="plan-stage-item-title">
                            {item.exerciseTitle || item.title || <em style={{ color: 'var(--text-muted)' }}>No title</em>}
                          </span>
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
              <button type="button" className="btn-ghost"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                onClick={() => setPickerCtx({ groupNumber: group.number, mode: 'pick' })}>
                + Pick from library
              </button>
              <button type="button" className="btn-ghost"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                onClick={() => setPickerCtx({ groupNumber: group.number, mode: 'create' })}>
                + Create new exercise
              </button>
            </div>
          </div>
        ))}

        {stageGroups.length < 10 && (
          <button type="button" className="stage-add-btn"
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
            <div key={hw.id} style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.6rem 0.75rem', background:'#fff', borderRadius:'8px', border:'1px solid #e8e3d8', marginBottom:'0.5rem' }}>
              <span style={{ flex:1, fontSize:'0.9rem' }}>{ex ? ex.title : 'Select exercise…'}</span>
              <select value={hw.exerciseId} onChange={e => updateHomeworkItem(hw.id, 'exerciseId', e.target.value)}
                style={{ fontSize:'0.85rem', padding:'0.3rem 0.5rem', borderRadius:'6px', border:'1px solid #d4d0c8', background:'#fff' }}>
                <option value="">Choose exercise…</option>
                {exercises.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
              <input type="text" placeholder="Note (optional)" value={hw.note}
                onChange={e => updateHomeworkItem(hw.id, 'note', e.target.value)}
                style={{ fontSize:'0.82rem', padding:'0.3rem 0.5rem', borderRadius:'6px', border:'1px solid #d4d0c8', width:'160px' }} />
              <button className="btn-ghost" style={{ fontSize:'0.8rem', padding:'0.25rem 0.5rem', color:'#e05c5c' }}
                onClick={() => removeHomeworkItem(hw.id)}>✕</button>
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
function AdminExerciseReview({ details, onBack }) {
  const questions  = (details.exercises?.questions ?? [])
    .slice().sort((a, b) => a.order_index - b.order_index)
  const answerMap  = Object.fromEntries(details.studentAnswers.map(a => [a.question_id, a]))

  const [feedback, setFeedback] = useState(details.teacher_feedback ?? '')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  const handleSave = async () => {
    setSaving(true)
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

      {/* Admin-only timing */}
      {exercise?.estimated_minutes && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0.4rem 0 0.75rem' }}>
          <span className="admin-level-chip">⏱ ~{exercise.estimated_minutes} min</span>
        </div>
      )}
      {/* Audio link */}
      {exercise?.audio_url && (
        <div className="exercise-audio-block" style={{ marginTop: '0.5rem' }}>
          <span className="exercise-context-label">🎧 Audio</span>
          <a href={exercise.audio_url} target="_blank" rel="noopener noreferrer" className="exercise-audio-link">
            Open audio / video →
          </a>
        </div>
      )}
      {/* Reading text */}
      {exercise?.context_text && (
        <div className="exercise-context-text" style={{ marginTop: '0.5rem' }}>
          <p className="exercise-context-label">📖 Reading text</p>
          <div className="exercise-context-passage">{exercise.context_text}</div>
        </div>
      )}
      {/* Context images */}
      {exercise?.context_images?.length > 0 && (
        <div className="exercise-context-images" style={{ marginTop: '0.75rem' }}>
          <p className="exercise-context-label">📖 Reference material</p>
          {exercise.context_images.map((src, i) => (
            <img key={i} src={src} alt={`Reference ${i+1}`} className="exercise-context-img" />
          ))}
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
          if (q.type === 'listening' || q.type === 'viewing') return null
          const sa        = answerMap[q.id]
          const hasAnswer = sa?.answer?.trim()
          const correct   = autoCorrect(q)

          return (
            <div key={q.id} className="review-question">
              <div className="review-q-header">
                <span className="eq-num">Q{idx + 1}</span>
                <span className="eq-type">{typeLabel(q.type)}</span>
                {hasAnswer && correct === true  && <span className="demo-mark demo-mark--correct">✓ Correct</span>}
                {hasAnswer && correct === false && <span className="demo-mark demo-mark--wrong">✗ Wrong</span>}
              </div>
              {q.type !== 'word_choice' && q.type !== 'fill_blank' && <p className="eq-prompt">{q.prompt}</p>}

              {/* Student's answer */}
              <div className="review-answer-row" style={{ display: 'block' }}>
                <span className="review-label">Student answered:</span>
                {q.type === 'word_choice' ? (
                  hasAnswer
                    ? <WordChoiceQuestion template={q.prompt} answer={sa?.answer} onChange={() => {}} disabled={true} />
                    : <div className="review-answer-box review-answer-empty"><em>No answer given</em></div>
                ) : q.type === 'fill_blank' ? (
                  hasAnswer
                    ? <InlineFillBlank
                        prompt={q.prompt}
                        answer={sa?.answer}
                        onChange={() => {}}
                        disabled={true}
                        checked={true}
                        correctAnswers={parseFillBlankCorrect(q.correct_answer ?? '')}
                      />
                    : <div className="review-answer-box review-answer-empty"><em>No answer given</em></div>
                ) : q.type === 'matching' && hasAnswer ? (
                  <div className="review-matching-pairs">
                    {(() => { try {
                      const m = JSON.parse(sa.answer)
                      return (q.options||[]).map(p => (
                        <div key={p.left} className={`review-match-row ${m[p.left]===p.right?'match-correct':'match-wrong'}`}>
                          <span>{p.left}</span><span>→</span>
                          <span>{m[p.left]||<em style={{color:'var(--text-dim)'}}>not matched</em>}</span>
                        </div>
                      ))
                    } catch { return <em>Error reading answer</em> } })()}
                  </div>
                ) : (
                  <div className={`review-answer-box ${!hasAnswer?'review-answer-empty':''}`}>
                    {hasAnswer || <em>No answer given</em>}
                  </div>
                )}
                {q.correct_answer && q.type !== 'matching' && q.type !== 'word_choice' && q.type !== 'fill_blank' && (
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
                    {(q.options||[]).map(p => `${p.left} → ${p.right}`).join(' · ')}
                  </div>
                )}
              </div>

            </div>
          )
        })}
      </div>

      {/* ── Overall feedback box ── */}
      <div className="exercise-feedback-section">
        <div className="form-field">
          <label>
            💬 Feedback for student
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
        {hasAnswers && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.75rem' }}>
            <button className="btn-gold" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save feedback →'}
            </button>
            {saved && <span style={{ color: '#4ade80', fontSize: '0.9rem' }}>✓ Saved — student can see your feedback</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AdminLessonRow ───────────────────────────────────────────
function AdminLessonRow({ lesson: initialLesson, onUpdate }) {
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
      <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
        onClick={() => setEditing(true)}>Edit</button>
    </div>
  )
}

// ─── AdminStudentExercises ────────────────────────────────────
function AdminStudentExercises({ student, onReview }) {
  const [assignments, setAssignments] = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    fetchStudentAssignmentsAdmin(student.id).then(data => {
      setAssignments(data); setLoading(false)
    })
  }, [student.id])

  const completed = assignments.filter(a => a.status === 'submitted')
  const pending   = assignments.filter(a => a.status !== 'submitted')

  const renderRow = (a) => (
    <button key={a.id} className="admin-student-row" onClick={() => onReview(a)}>
      <div className="admin-student-info">
        <strong>{a.exercises?.title}</strong>
        <span className="admin-student-email">
          {a.mode === 'homework' ? '🏠 Homework' : '🎓 In class'}
          {a.status === 'submitted'
            ? ` · Completed ${new Date(a.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
            : ` · Assigned ${new Date(a.assigned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
        </span>
      </div>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, flexShrink: 0,
        color: a.status === 'submitted' ? '#4ade80' : 'var(--text-muted)' }}>
        {a.status === 'submitted' ? '✓ Completed' : '⏳ Pending'}
      </span>
      <span className="admin-arrow">›</span>
    </button>
  )

  return (
    <div className="admin-section">
      <h3>Exercises ({assignments.length})</h3>
      {loading ? (
        <div className="dashboard-loading" style={{ padding: '0.5rem 0' }}>Loading…</div>
      ) : assignments.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No exercises assigned to this student yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
          {completed.map(renderRow)}
          {pending.map(renderRow)}
        </div>
      )}
    </div>
  )
}

// ─── AdminStudentLessons ──────────────────────────────────────
function AdminStudentLessons({ student, adminUserId }) {
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

  useEffect(() => {
    fetchStudentLessonsAdmin(student.id).then(data => {
      setLessons(data)
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
            <div key={l.id}>
              <AdminLessonRow lesson={l} onUpdate={handleUpdate} />
              {editingNotesId === l.id ? (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="form-field">
                    <label style={{ fontSize: '0.8rem' }}>Private notes (admin only)</label>
                    <textarea rows={2} placeholder="Your private notes about this lesson…"
                      value={editTeacherNotes} onChange={e => setEditTeacherNotes(e.target.value)}
                      style={{ resize: 'vertical', minHeight: '60px', fontSize: '0.87rem' }} />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: '0.8rem' }}>Note for student <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(visible on their dashboard)</span></label>
                    <textarea rows={2} placeholder="e.g. Great work on conditionals today. Review pronunciation for next time."
                      value={editPublicNotes} onChange={e => setEditPublicNotes(e.target.value)}
                      style={{ resize: 'vertical', minHeight: '60px', fontSize: '0.87rem' }} />
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── AdminBooks ───────────────────────────────────────────────
function AdminBooks({ adminUserId }) {
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

const EX_TYPES = [
  { value: 'multiple_choice',    label: 'Multiple Choice',               emoji: '🔘' },
  { value: 'fill_blank',         label: 'Fill in the Blanks (Typed)',     emoji: '✍️' },
  { value: 'fill_blank_dropdown',label: 'Fill in the Blanks (Word Bank)', emoji: '📋' },
  { value: 'matching',           label: 'Match Words',                    emoji: '🔗' },
  { value: 'ordering',           label: 'Order Sentences / Words',        emoji: '🔢' },
  { value: 'true_false',         label: 'True or False',                  emoji: '✅' },
  { value: 'listening',          label: 'Listening',                      emoji: '🎧' },
]

const TYPE_COLORS = {
  multiple_choice:    { bg: '#dbeafe', color: '#1d4ed8' },
  fill_blank:         { bg: '#fce7f3', color: '#9d174d' },
  fill_blank_dropdown:{ bg: '#ede9fe', color: '#6d28d9' },
  matching:           { bg: '#d1fae5', color: '#065f46' },
  ordering:           { bg: '#fef3c7', color: '#92400e' },
  true_false:         { bg: '#dcfce7', color: '#166534' },
  listening:          { bg: '#e0f2fe', color: '#075985' },
}

function TypeBadge({ type }) {
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

function ExFormMultipleChoice({ title, instructions, onChange }) {
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
        <textarea rows={3} value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. Which sentence uses the past perfect correctly?" className="writing-input" />
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

function ExFormFillBlank({ title, instructions, onChange, dropdown }) {
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

function ExFormMatching({ onChange }) {
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

function ExFormOrdering({ onChange }) {
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

function ExFormTrueFalse({ onChange }) {
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

function ExFormListening({ onChange }) {
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

function AdminExerciseLibrary({ adminUserId }) {
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {exercises.map(ex => {
            // Derive exercise type from first question's type (exercises table has no top-level type)
            const typeHint = ex.stage_type === 'listening' ? 'listening' : null
            return (
              <div key={ex.id} className="admin-student-row"
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ flex: 1, fontWeight: 500, minWidth: '160px' }}>{ex.title}</span>
                <TypeBadge type={typeHint || ex.stage_type || 'controlled_exercise'} />
                {ex.books?.title && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📚 {ex.books.title}</span>
                )}
                <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
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

// ─── AdminPanel ───────────────────────────────────────────────
function AdminPanel({ user, onSignOut }) {
  const [adminEmail,    setAdminEmail]    = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loginError,    setLoginError]    = useState(null)
  const [loginLoading,  setLoginLoading]  = useState(false)
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
  }, [isAdmin])

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
    const created = await createManualStudent({
      name: prospect.name,
      email: prospect.email,
      createdBy: user.id,
    })
    if (created) {
      setManualStudents(prev => [created, ...prev])
      await updateProspectStatus(prospect.id, 'converted')
      setProspects(prev => prev.filter(p => p.id !== prospect.id))
      setProspectCount(prev => Math.max(0, prev - (prospect.status === 'new' ? 1 : 0)))
    }
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
          onBack={() => setReviewingFromStudent(null)}
        />
      </div>
    )
  }

  // Manual student detail view
  if (selectedManual) {
    return (
      <div className="flow-card admin-detail">
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

        <div className="admin-section">
          <p className="flow-sub" style={{ fontSize: '0.88rem' }}>
            This is a manually-added student — they don't have a login account yet.
          </p>
        </div>
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

        {/* ── Access level management ── */}
        <div className="admin-section">
          <h3>Access level</h3>
          <div className="admin-access-row">
            <select className="admin-access-select" value={accessLevel}
              onChange={e => setAccessLevel(e.target.value)}>
              <option value="pending">Pending approval</option>
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
              onClick={() => handleAccessSave('trial')} disabled={accessSaving}>
              ✓ Approve — grant trial access
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

        {/* ── Exercises ── */}
        <AdminStudentExercises student={selected} onReview={openStudentReview} />

        {/* ── Lesson log ── */}
        <AdminStudentLessons student={selected} adminUserId={user.id} />
      </div>
    )
  }

  // Student list view
  const pendingStudents = students.filter(s => s.access_level === 'pending')
  const activeStudents  = students.filter(s => s.access_level !== 'pending')

  return (
    <div className="flow-card admin-panel">
      <div className="admin-header">
        <div>
          <h2>Admin panel</h2>
          <p className="flow-sub">English with Dogukan</p>
        </div>
        <button className="btn-ghost" onClick={onSignOut}>Sign out</button>
      </div>

      {/* Tab bar */}
      <div className="admin-tabs">
        <button className={`admin-tab ${adminTab === 'students' ? 'active' : ''}`}
          onClick={() => setAdminTab('students')}>
          👥 Students
          {pendingCount > 0 && <span className="admin-tab-badge">{pendingCount}</span>}
        </button>
        <button className={`admin-tab ${adminTab === 'prospects' ? 'active' : ''}`}
          onClick={() => setAdminTab('prospects')}>
          🔍 Prospects
          {prospectCount > 0 && <span className="admin-tab-badge">{prospectCount}</span>}
        </button>
        <button className={`admin-tab ${adminTab === 'stages' ? 'active' : ''}`}
          onClick={() => setAdminTab('stages')}>
          📝 Exercise Library
        </button>
        <button className={`admin-tab ${adminTab === 'plans' ? 'active' : ''}`}
          onClick={() => setAdminTab('plans')}>
          🗂 Lesson Plans
        </button>
        <button className={`admin-tab ${adminTab === 'books' ? 'active' : ''}`}
          onClick={() => setAdminTab('books')}>
          📖 Books
        </button>
        <button className={`admin-tab ${adminTab === 'referrals' ? 'active' : ''}`}
          onClick={() => setAdminTab('referrals')}>
          🎁 Referrals
        </button>
      </div>

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

      {/* Prospects tab */}
      {adminTab === 'prospects' && (
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.85rem' }}>Prospects</h3>
          {prospectsLoading ? (
            <div className="dashboard-loading">Loading prospects…</div>
          ) : prospects.length === 0 ? (
            <p className="dashboard-empty-small">No prospects yet. They'll appear here when someone fills in the consultation booking form.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
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
                  {prospects.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f0ece4' }}>
                      <td style={{ padding: '0.55rem 0.75rem' }}><strong>{p.name}</strong></td>
                      <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)' }}>{p.email}</td>
                      <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)' }}>{p.phone || '—'}</td>
                      <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        <span style={{
                          display: 'inline-block', borderRadius: '0.9rem', padding: '0.18rem 0.6rem',
                          fontSize: '0.78rem', fontWeight: 600,
                          background: p.status === 'new' ? '#dbeafe' : p.status === 'contacted' ? '#fef9c3' : p.status === 'converted' ? '#dcfce7' : '#e5e7eb',
                          color: p.status === 'new' ? '#1d4ed8' : p.status === 'contacted' ? '#92400e' : p.status === 'converted' ? '#166534' : '#6b7280',
                        }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {p.status !== 'contacted' && (
                            <button className="btn-ghost"
                              style={{ fontSize: '0.78rem', padding: '0.22rem 0.55rem' }}
                              onClick={() => handleProspectStatusChange(p, 'contacted')}>
                              Mark contacted
                            </button>
                          )}
                          {p.status !== 'declined' && (
                            <button className="btn-ghost"
                              style={{ fontSize: '0.78rem', padding: '0.22rem 0.55rem', color: '#9ca3af' }}
                              onClick={() => handleProspectStatusChange(p, 'declined')}>
                              Decline
                            </button>
                          )}
                          <button className="btn-gold"
                            style={{ fontSize: '0.78rem', padding: '0.22rem 0.65rem' }}
                            onClick={() => handleConvertProspect(p)}>
                            Convert to student
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Students tab */}
      {adminTab === 'students' && (
        <div>
          {/* Add student button / form */}
          {!showAddStudentForm ? (
            <div style={{ marginBottom: '1rem' }}>
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
              {/* Pending section */}
              {pendingStudents.length > 0 && (
                <>
                  <p className="admin-section-label">⏳ Awaiting approval ({pendingStudents.length})</p>
                  {pendingStudents.map(s => (
                    <button key={s.id} className="admin-student-row admin-student-row--pending"
                      onClick={() => openStudent(s)}>
                      <div className="admin-student-info">
                        <strong>{s.name || 'Unknown'}</strong>
                        <span className="admin-student-email">{s.email}</span>
                      </div>
                      <div className="admin-student-meta">
                        <AccessBadge level="pending" />
                        {s.english_level && <span className="admin-level-chip eng-level-chip">{s.english_level}</span>}
                        <span className="admin-date-chip">{new Date(s.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                      <span className="admin-arrow">›</span>
                    </button>
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
                      <button key={s.id} className="admin-student-row" onClick={() => openStudent(s)}>
                        <div className="admin-student-info">
                          <strong>{s.name || 'Unknown'}</strong>
                          <span className="admin-student-email">{s.email}</span>
                        </div>
                        <div className="admin-student-meta">
                          <AccessBadge level={s.access_level} />
                          {s.english_level && <span className="admin-level-chip eng-level-chip">{s.english_level}</span>}
                          {result && <span className="admin-level-chip">{result.cefr_level} · {result.overall_score}%</span>}
                          {result && !result.writing_reviewed && <span className="admin-review-chip">Writing to review</span>}
                          <span className="admin-date-chip">{new Date(s.created_at).toLocaleDateString('en-GB')}</span>
                        </div>
                        <span className="admin-arrow">›</span>
                      </button>
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
                    <button key={s.id} className="admin-student-row" onClick={() => openManualStudent(s)}>
                      <div className="admin-student-info">
                        <strong>{s.name}</strong>
                        <span className="admin-student-email">{s.email || 'No email'}</span>
                      </div>
                      <div className="admin-student-meta">
                        {s.english_level && <span className="admin-level-chip eng-level-chip">{s.english_level}</span>}
                        <span className="admin-level-chip" style={{ opacity: 0.65 }}>Manual</span>
                        <span className="admin-date-chip">{new Date(s.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                      <span className="admin-arrow">›</span>
                    </button>
                  ))}
                </>
              )}

              {students.length === 0 && manualStudents.length === 0 && (
                <div className="dashboard-empty">
                  <p>No students yet.</p>
                  <p className="flow-sub" style={{ fontSize: '0.88rem' }}>Students who sign up will appear here, or add one manually above.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
