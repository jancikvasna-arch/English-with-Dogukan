import { useState, useEffect, useRef, useMemo } from 'react'
import './App.css'
import { supabase, saveQuestionnaire, savePlacementResult, linkGuestData,
  fetchMyExercises, fetchQuestionsForStudent, fetchQuestionsForReview,
  fetchMyAnswersForAssignment, submitExerciseAnswers,
  fetchAllExercises, fetchStudentProfiles, assignExercise,
  fetchAllAssignmentsAdmin, fetchStudentAssignmentsAdmin, fetchAssignmentDetails, saveAnswerReviews,
  createExerciseWithQuestions, fetchExerciseWithQuestions, updateExerciseWithQuestions, deleteExercise,
  fetchAllLabels, createLabel, deleteLabel, setExerciseLabels,
  fetchAllBooks, createBook, deleteBook,
  fetchAllLessonPlans, createLessonPlan, updateLessonPlan, deleteLessonPlan,
  createLessonPlanWithStages, updateLessonPlanWithStages, assignLessonPlan,
  fetchMyProfile, updateMyName, updateStudentAccessLevel, fetchStudentsAdmin,
  fetchStudentLessons, createLesson, updateLesson, fetchMyLessons, submitLessonFeedback,
} from './lib/supabase'
import { ABOUT, HOW_IT_WORKS_STEPS, PRICING_PLANS, COURSES_DATA, WHATSAPP_NUMBER } from './content'

// ─── Constants ───────────────────────────────────────────────
const CALENDLY_CONSULTATION = 'https://calendly.com/dogukan-cy/free-english-course-consultation-50-mins'
const CALENDLY_FIRST_LESSON = 'https://calendly.com/dogukan-cy/30min'
const ADMIN_EMAIL           = 'dogukan.cy@gmail.com'

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
    if (pageHistory.length === 0) { goTo('landing'); return }
    const prev = pageHistory[pageHistory.length - 1]
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
          <button className="back-link" onClick={goBack}>
            ← English with Dogukan
          </button>
          {user && (
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
              onBack={() => goTo('start')}
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
      <Navbar onBook={() => goTo('start')} user={user}
        onAccount={() => goTo(user?.email === ADMIN_EMAIL ? 'admin' : 'dashboard')}
        onSignIn={() => goTo('signin')} />
      <Hero onBook={() => goTo('start')} />
      <HowItWorks />
      <Courses />
      <Testimonials />
      <Pricing onBook={() => goTo('start')} />
      <AboutMe />
      <BookingCTA onBook={() => goTo('start')} />
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
    q.prompt = text.replace(/_{1,}/g, '___')
    return q
  })
}

// ─── Shared: flow step indicator ──────────────────────────────
function FlowSteps({ current }) {
  const steps = ['About you', 'Placement test', 'Book your lesson']
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
          <div className="journey-card">
            <div className="journey-card-title">Your learning journey</div>
            <div className="journey-steps">
              <div className="journey-step">
                <div className="step-num">1</div>
                <div>
                  <strong>Tell me about your learning needs</strong>
                  <p>Quick questionnaire or a free 15-min consultation call</p>
                </div>
              </div>
              <div className="journey-step">
                <div className="step-num">2</div>
                <div>
                  <strong>Free Level Test</strong>
                  <p>Take a test so that we determine your level</p>
                </div>
              </div>
              <div className="journey-step">
                <div className="step-num">3</div>
                <div>
                  <strong>First lesson free</strong>
                  <p>Designed specifically for you — no commitment</p>
                </div>
              </div>
              <div className="journey-step">
                <div className="step-num">4</div>
                <div>
                  <strong>Start your course</strong>
                  <p>Lessons focus on improving your practical communication skills. I prepare custom lessons to address your needs and fill in the gaps in your knowledge.</p>
                </div>
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
  const testimonials = [
    {
      name: 'Maria S.', country: 'Spain', level: 'B2 → C1',
      text: 'After 6 months with Dogukan I went from struggling in meetings to confidently leading them. His approach is patient, structured and genuinely fun.',
    },
    {
      name: 'Kaito M.', country: 'Japan', level: 'B1 → B2',
      text: 'I tried many tutors before but Dogukan is different. He actually listens to what you need and adapts every lesson. My business English has improved massively.',
    },
    {
      name: 'Anya K.', country: 'Russia', level: 'B2 → C1',
      text: 'The placement test was surprisingly accurate. He knew exactly where my gaps were and we fixed them quickly. I passed my IELTS exam with a 7.5.',
    },
  ]

  return (
    <section className="section" id="testimonials">
      <div className="container">
        <div className="section-label">What students say</div>
        <h2 className="section-title">Testimonials</h2>
        <div className="testimonials-grid">
          {testimonials.map((t) => (
            <div key={t.name} className="testimonial-card">
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <div className="author-avatar">{t.name[0]}</div>
                <div>
                  <strong>{t.name}</strong>
                  <span className="author-meta">{t.country} · {t.level}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="section-note">* Placeholder testimonials — real ones coming soon.</p>
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

  const handleOpen = () => {
    window.open(CALENDLY_CONSULTATION, '_blank')
    setOpened(true)
  }

  return (
    <div className="flow-card">
      <FlowSteps current={1} />
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2>Book your free consultation</h2>
      <p className="flow-sub">
        Pick a time that works for you. Dogukan will ask you a few questions about your goals
        and design your first lesson from there.
      </p>

      {!opened ? (
        <button className="btn-gold btn-full btn-lg" onClick={handleOpen}>
          Open scheduling page →
        </button>
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
        if (data.user) onSuccess(data.user)
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

// ─── StudentDashboard ─────────────────────────────────────────
function StudentDashboard({ user, onSignOut, onBook, onSettings }) {
  const [profile,     setProfile]     = useState(null)
  const [result,      setResult]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [assignments, setAssignments] = useState([])
  const [lessons,     setLessons]     = useState([])
  const [activeAssignment,  setActiveAssignment]  = useState(null)
  const [viewingSubmission, setViewingSubmission] = useState(null) // {assignment, questions, answerMap}

  useEffect(() => {
    if (!supabase || !user) { setLoading(false); return }
    Promise.all([
      fetchMyProfile(user.id),
      supabase.from('placement_results').select('*')
        .eq('student_id', user.id).order('completed_at', { ascending: false }).limit(1).single(),
      fetchMyExercises(user.id),
      fetchMyLessons(user.id),
    ]).then(([prof, { data: res }, exs, lsns]) => {
      setProfile(prof)
      setResult(res)
      setAssignments(exs)
      setLessons(lsns)
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

  if (viewingSubmission) {
    return (
      <StudentSubmissionReview
        assignment={viewingSubmission.assignment}
        questions={viewingSubmission.questions}
        answerMap={viewingSubmission.answerMap}
        onBack={() => setViewingSubmission(null)}
      />
    )
  }

  if (activeAssignment) {
    return (
      <ExercisePlayer
        assignment={activeAssignment.assignment}
        questions={activeAssignment.questions}
        studentId={user.id}
        onBack={() => setActiveAssignment(null)}
        onSubmitted={(id) => {
          setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: 'submitted' } : a))
          setActiveAssignment(null)
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
            {l.notes_visible && l.teacher_notes && (
              <div className="lesson-teacher-note">
                <span className="lesson-note-label">Dogukan's note:</span>
                <p>{l.teacher_notes}</p>
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
      {/* ── Context images ── */}
      {ex?.context_images?.length > 0 && (
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
          return (
          <div key={q.id} className="exercise-question">
            <div className="eq-label">
              <span className="eq-num">Q{idx + 1}</span>
              <span className="eq-type">
                {q.type === 'multiple_choice' ? 'Multiple choice'
                 : q.type === 'fill_blank'     ? 'Fill in the blank'
                 : q.type === 'true_false'      ? 'True / False'
                 : q.type === 'matching'        ? 'Matching'
                 : q.type === 'word_choice'     ? 'Word choice'
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
            {q.type === 'fill_blank' && (
              <input type="text" className="fill-input"
                placeholder="Type your answer…"
                value={answers[q.id] || ''}
                onChange={e => setAnswer(q.id, e.target.value)}
              />
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
  const [checked, setChecked] = useState(false)

  const setAnswer = (qId, val) => setAnswers(prev => ({ ...prev, [qId]: val }))

  const getResult = (q) => {
    if (!checked) return null
    const ans = (answers[q.id] ?? '').toString().trim()
    if (!ans) return null
    if (q.type === 'multiple_choice' || q.type === 'true_false')
      return ans === (q.correct_answer ?? '').trim() ? true : false
    if (q.type === 'fill_blank')
      return ans.toLowerCase() === (q.correct_answer ?? '').trim().toLowerCase() ? true : false
    if (q.type === 'matching') {
      try { const m = JSON.parse(ans); return (q.options||[]).every(p => m[p.left] === p.right) }
      catch { return null }
    }
    return null // free_text — not auto-graded
  }

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
      {exercise?.context_images?.length > 0 && (
        <div className="exercise-context-images">
          <p className="exercise-context-label">📖 Reference material</p>
          {exercise.context_images.map((src, i) => (
            <img key={i} src={src} alt={`Reference ${i + 1}`} className="exercise-context-img" />
          ))}
        </div>
      )}

      <div className="exercise-questions">
        {questions.every(q => q.type === 'listening' || q.type === 'viewing') && questions.length > 0 && (
          <div className="verbal-activity-note">
            {questions[0].type === 'listening' ? '🎧' : '🎥'}
            <span>{questions[0].type === 'listening' ? 'Listening activity — verbal discussion.' : 'Viewing activity — verbal discussion.'}</span>
          </div>
        )}
        {questions.map((q, idx) => {
          if (q.type === 'listening' || q.type === 'viewing') return null
          const result = getResult(q)
          return (
            <div key={q.id} className={`exercise-question${checked && result === true ? ' eq--correct' : checked && result === false ? ' eq--wrong' : ''}`}>
              <div className="eq-label">
                <span className="eq-num">Q{idx + 1}</span>
                <span className="eq-type">{typeLabel(q.type)}</span>
                {checked && result === true  && <span className="demo-mark demo-mark--correct">✓ Correct</span>}
                {checked && result === false && <span className="demo-mark demo-mark--wrong">✗ Wrong</span>}
              </div>
              {q.type !== 'word_choice' && <p className="eq-prompt">{q.prompt}</p>}
              {q.hint && <p className="eq-hint">Hint: {q.hint}</p>}

              {q.type === 'multiple_choice' && (
                <div className="options-list">
                  {(q.options||[]).map(opt => (
                    <button key={opt} className={`option-btn ${answers[q.id]===opt?'selected':''}`}
                      onClick={() => setAnswer(q.id, opt)}>{opt}</button>
                  ))}
                </div>
              )}
              {q.type === 'fill_blank' && (
                <input type="text" className="fill-input" placeholder="Type your answer…"
                  value={answers[q.id]||''} onChange={e => setAnswer(q.id, e.target.value)} />
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

              {/* Reveal correct answer after Check — word_choice has no auto-answer */}
              {checked && q.correct_answer && q.type !== 'matching' && q.type !== 'word_choice' && (
                <div className="demo-correct-answer">✓ Answer: <strong>{q.correct_answer}</strong></div>
              )}
              {checked && q.type === 'matching' && q.options && (
                <div className="demo-correct-answer">
                  ✓ Pairs: {(q.options||[]).map(p => `${p.left} → ${p.right}`).join(' · ')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!questions.every(q => q.type === 'listening' || q.type === 'viewing') && (
        <div className="exercise-submit-row">
          {!checked ? (
            <button className="btn-gold btn-lg" onClick={() => setChecked(true)}>Check answers →</button>
          ) : (
            <button className="btn-ghost" onClick={() => { setChecked(false); setAnswers({}) }}>
              ↺ Reset &amp; try again
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── StudentSubmissionReview ──────────────────────────────────
function StudentSubmissionReview({ assignment, questions, answerMap, onBack }) {
  const ex = assignment.exercises
  const allAnswers = Object.values(answerMap)
  const reviewed = allAnswers.some(a => a.is_correct !== null && a.is_correct !== undefined)
  const correctCount = allAnswers.filter(a => a.is_correct === true).length
  const reviewedCount = allAnswers.filter(a => a.is_correct !== null && a.is_correct !== undefined).length

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

      {/* Score card */}
      {reviewed ? (
        <div className="submission-score-card">
          <div className="submission-score-num">{correctCount}<span>/{reviewedCount}</span></div>
          <div className="submission-score-label">correct answers</div>
          {reviewedCount < questions.length && (
            <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:'0.3rem 0 0' }}>
              {questions.length - reviewedCount} question{questions.length - reviewedCount !== 1 ? 's' : ''} still pending review
            </p>
          )}
        </div>
      ) : (
        <div className="submission-pending-msg">
          ⏳ Dogukan hasn't reviewed this exercise yet. Check back after your next lesson.
        </div>
      )}

      {/* Context images */}
      {ex?.context_images?.length > 0 && (
        <div className="exercise-context-images">
          <p className="exercise-context-label">📖 Reference material</p>
          {ex.context_images.map((src, i) => (
            <img key={i} src={src} alt={`Reference ${i + 1}`} className="exercise-context-img" />
          ))}
        </div>
      )}

      <div className="exercise-questions">
        {questions.map((q, idx) => {
          const sa = answerMap[q.id]
          const isCorrect = sa?.is_correct
          const hasReview = isCorrect !== null && isCorrect !== undefined
          return (
            <div key={q.id} className={`exercise-question${hasReview && isCorrect ? ' eq--correct' : hasReview && !isCorrect ? ' eq--wrong' : ''}`}>
              <div className="eq-label">
                <span className="eq-num">Q{idx + 1}</span>
                <span className="eq-type">{typeLabel(q.type)}</span>
                {hasReview && <span className={`demo-mark ${isCorrect ? 'demo-mark--correct' : 'demo-mark--wrong'}`}>
                  {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </span>}
              </div>
              {q.type !== 'word_choice' && <p className="eq-prompt">{q.prompt}</p>}

              <div className="submission-answer-block">
                <span className="review-label">Your answer:</span>
                {q.type === 'word_choice' ? (
                  sa?.answer
                    ? <WordChoiceQuestion template={q.prompt} answer={sa.answer} onChange={() => {}} disabled={true} />
                    : <div className="review-answer-box review-answer-empty"><em>No answer given</em></div>
                ) : q.type === 'matching' && sa?.answer ? (
                  <div className="review-matching-pairs">
                    {(() => { try {
                      const m = JSON.parse(sa.answer)
                      return (q.options||[]).map(p => (
                        <div key={p.left} className={`review-match-row ${m[p.left]===p.right?'match-correct':'match-wrong'}`}>
                          <span>{p.left}</span><span>→</span><span>{m[p.left]||<em style={{color:'var(--text-dim)'}}>not matched</em>}</span>
                        </div>
                      ))
                    } catch { return <em>Error reading answer</em> } })()}
                  </div>
                ) : (
                  <div className={`review-answer-box ${!sa?.answer?.trim()?'review-answer-empty':''}`}>
                    {sa?.answer?.trim() || <em>No answer given</em>}
                  </div>
                )}

                {/* Show correct answer when marked wrong (not for word_choice — no auto-answer) */}
                {hasReview && !isCorrect && q.correct_answer && q.type !== 'matching' && q.type !== 'word_choice' && (
                  <div className="demo-correct-answer">✓ Correct answer: <strong>{q.correct_answer}</strong></div>
                )}
                {hasReview && !isCorrect && q.type === 'matching' && q.options && (
                  <div className="demo-correct-answer">
                    ✓ Correct pairs: {(q.options||[]).map(p=>`${p.left} → ${p.right}`).join(' · ')}
                  </div>
                )}

                {/* Teacher comment */}
                {sa?.teacher_comment && (
                  <div className="submission-teacher-comment">
                    <span className="review-label">💬 Dogukan's feedback:</span>
                    <p>{sa.teacher_comment}</p>
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
  const [exTab,          setExTab]          = useState('assignments')
  const [view,           setView]           = useState('list') // 'list'|'review'|'create-stage'|'edit-exercise'
  const [reviewing,      setReviewing]      = useState(null)
  const [editingExercise,setEditingExercise]= useState(null)
  const [demoExercise,   setDemoExercise]   = useState(null) // {exercise, questions} for admin preview
  const [deletingId,     setDeletingId]     = useState(null) // exercise id pending delete confirm
  const [filterLabelIds, setFilterLabelIds] = useState([])   // active label filter in library tab
  const [filterStageType,setFilterStageType]= useState(null) // active stage type filter in library tab
  const [filterBookId,   setFilterBookId]   = useState(null) // active book filter in library tab
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
    if (full) { setDemoExercise(full); setView('demo-exercise') }
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

  const submitted = assignments.filter(a => a.status === 'submitted')
  const pending   = assignments.filter(a => a.status !== 'submitted')

  return (
    <div>
      {/* Sub-tabs */}
      <div className="admin-tabs" style={{ marginTop: 0 }}>
        {[['assignments','📋 Assignments'],['library','📚 Library']].map(([k, label]) => (
          <button key={k} className={`admin-tab ${exTab === k ? 'active' : ''}`} onClick={() => setExTab(k)}>{label}</button>
        ))}
      </div>

      {/* ── Assignments tab ── */}
      {exTab === 'assignments' && (
        <div>
          <div className="admin-exercises-toolbar">
            <h3 style={{ margin: 0 }}>Assignments</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                onClick={refreshAssignments} disabled={refreshing}>
                {refreshing ? '…' : '↺ Refresh'}
              </button>
              <button className="btn-gold" onClick={() => setShowAssign(v => !v)}>
                {showAssign ? '← Cancel' : '+ Assign'}
              </button>
            </div>
          </div>

          {showAssign && (
            <form className="admin-assign-form" onSubmit={handleAssign}>
              <div className="form-field">
                <label>Student</label>
                <select value={aStudentId} onChange={e => setAStudentId(e.target.value)} required>
                  <option value="">Select a student…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Exercise</label>
                <select value={aExerciseId} onChange={e => setAExerciseId(e.target.value)} required>
                  <option value="">Select an exercise…</option>
                  {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Type</label>
                <div className="radio-group" style={{ flexDirection: 'row', gap: '0.75rem' }}>
                  {['homework','in_class'].map(m => (
                    <button key={m} type="button"
                      className={`radio-option ${aMode === m ? 'selected' : ''}`}
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => setAMode(m)}>
                      {m === 'homework' ? '🏠 Homework' : '🎓 In class'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-field">
                <label>Note for student <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <input type="text" placeholder="e.g. Please complete before Friday's lesson"
                  value={aNote} onChange={e => setANote(e.target.value)} />
              </div>
              {assignError && <div className="auth-error">{assignError}</div>}
              <button type="submit" className="btn-gold btn-full" disabled={assigning}>
                {assigning ? 'Assigning…' : 'Assign exercise →'}
              </button>
            </form>
          )}

          {loading ? <div className="dashboard-loading">Loading…</div> : (
            <>
              {submitted.length > 0 && (
                <div className="admin-asgn-section">
                  <div className="admin-asgn-section-title">
                    <span className="admin-review-chip">✓ Completed — open to add comments</span>
                    <span>{submitted.length}</span>
                  </div>
                  {submitted.map(a => (
                    <button key={a.id} className="admin-student-row" onClick={() => openReview(a)}>
                      <div className="admin-student-info">
                        <strong>{a.profiles?.name || a.profiles?.email || 'Student'}</strong>
                        <span className="admin-student-email">{a.exercises?.title}</span>
                      </div>
                      <div className="admin-student-meta">
                        <span className="admin-level-chip">{a.mode === 'homework' ? '🏠' : '🎓'} {a.mode}</span>
                        <span className="admin-date-chip">{new Date(a.submitted_at).toLocaleDateString('en-GB')}</span>
                      </div>
                      <span className="admin-arrow">›</span>
                    </button>
                  ))}
                </div>
              )}
              {pending.length > 0 && (
                <div className="admin-asgn-section">
                  <div className="admin-asgn-section-title">
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assigned — awaiting student</span>
                    <span>{pending.length}</span>
                  </div>
                  {pending.map(a => (
                    <button key={a.id} className="admin-student-row" onClick={() => openReview(a)}>
                      <div className="admin-student-info">
                        <strong>{a.profiles?.name || a.profiles?.email || 'Student'}</strong>
                        <span className="admin-student-email">{a.exercises?.title}</span>
                      </div>
                      <div className="admin-student-meta">
                        <span className="admin-level-chip">{a.mode === 'homework' ? '🏠' : '🎓'} {a.mode}</span>
                        <span className="admin-date-chip">Assigned {new Date(a.assigned_at).toLocaleDateString('en-GB')}</span>
                      </div>
                      <span className="admin-arrow">›</span>
                    </button>
                  ))}
                </div>
              )}
              {assignments.length === 0 && (
                <div className="dashboard-empty">
                  <p>No exercises assigned yet.</p>
                  <p className="flow-sub" style={{ fontSize: '0.88rem' }}>Create exercises in the Library, then assign them here.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Library tab ── */}
      {exTab === 'library' && (() => {
        const typeFiltered = filterStageType
          ? exercises.filter(ex => ex.stage_type === filterStageType)
          : exercises
        const labelFiltered = filterLabelIds.length === 0
          ? typeFiltered
          : typeFiltered.filter(ex => (ex.labels || []).some(l => filterLabelIds.includes(l.id)))
        const filteredExercises = filterBookId
          ? labelFiltered.filter(ex => ex.book_id === filterBookId)
          : labelFiltered
        return (
          <div>
            <div className="admin-exercises-toolbar">
              <h3 style={{ margin: 0 }}>Stage Library ({filteredExercises.length}{(filterStageType || filterLabelIds.length > 0 || filterBookId) ? ` / ${exercises.length}` : ''})</h3>
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
                <button className="btn-ghost" style={{ fontSize: '0.85rem' }} onClick={() => { setFilterLabelIds([]); setFilterStageType(null) }}>Clear filter</button>
              </div>
            ) : (
              <div className="library-list">
                {filteredExercises.map(ex => {
                  const stDef = STAGE_TYPES.find(t => t.value === ex.stage_type) || { icon: '✏️', label: 'Exercise' }
                  return (
                  <div key={ex.id} className="library-row">
                    <div className="library-row-main">
                      <div className="library-row-info">
                        <strong style={{ fontSize: '0.95rem' }}>{ex.title}</strong>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem', alignItems: 'center' }}>
                          <span className="stage-type-badge-sm" style={{ fontSize: '0.75rem', padding: '0.18rem 0.5rem' }}>{stDef.icon} {stDef.label}</span>
                          {ex.course && <span className="admin-level-chip">{ex.course}</span>}
                          {ex.books?.title && <span className="admin-level-chip">📚 {ex.books.title}</span>}
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

// ─── AdminLessonPlans ─────────────────────────────────────────
function AdminLessonPlans({ adminUserId }) {
  const [exercises,   setExercises]   = useState([])
  const [plans,       setPlans]       = useState([])
  const [labels,      setLabels]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [view,        setView]        = useState('list') // 'list' | 'create' | 'edit'
  const [editingPlan, setEditingPlan] = useState(null)
  const [deletingPlanId, setDeletingPlanId] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchAllExercises(),
      fetchAllLessonPlans(),
      fetchAllLabels(),
    ]).then(([exs, pls, lbls]) => {
      setExercises(exs); setPlans(pls); setLabels(lbls)
      setLoading(false)
    })
  }, [])

  if (view === 'create') {
    return <LessonStageBuilder exercises={exercises} adminUserId={adminUserId}
      onCancel={() => setView('list')}
      onSaved={() => { fetchAllLessonPlans().then(setPlans); setView('list') }} />
  }
  if (view === 'edit' && editingPlan) {
    return <LessonStageBuilder exercises={exercises} adminUserId={adminUserId}
      initialPlan={editingPlan}
      onCancel={() => { setView('list'); setEditingPlan(null) }}
      onSaved={() => { fetchAllLessonPlans().then(setPlans); setView('list'); setEditingPlan(null) }} />
  }

  return (
    <div>
      <div className="admin-exercises-toolbar">
        <h3 style={{ margin: 0 }}>Lesson Plans ({plans.length})</h3>
        <button className="btn-gold" onClick={() => setView('create')}>+ Create plan</button>
      </div>
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
                  <button className="btn-ghost" style={{ fontSize: '0.85rem' }}
                    onClick={() => { setEditingPlan(p); setView('edit') }}>Edit</button>
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

function ExerciseBuilder({ onSaved, onCancel, initialExercise = null, allLabels = [], allBooks = [], onLabelCreated = null, onBookCreated = null, initialStageType = null }) {
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
  const [bookId,         setBookId]         = useState(initialExercise?.book_id ?? null)
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
  const contextFileRef  = useRef(null)
  const exerciseFileRef = useRef(null)

  // ── Context images ──────────────────────────────────────────
  const handleContextImages = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - contextImages.length)
    if (!files.length) return
    const compressed = await Promise.all(files.map(f => compressImage(f)))
    setContextImages(prev => [...prev, ...compressed].slice(0, 3))
    e.target.value = ''
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
    setSaving(true); setSaveError(null)
    const finalMins = estimatedMins === 'other' ? (parseInt(customMins) || null) : estimatedMins
    const meta = { title, description, contextImages, contextText, audioUrl, estimatedMinutes: finalMins, stageType: stageType ?? 'controlled_exercise', bookId: bookId || null }
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
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
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
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
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

      {/* ── 5. Context material ── */}
      <div className="builder-section">
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
      </div>

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
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── BuilderQuestion ──────────────────────────────────────────
function BuilderQuestion({ idx, question, onChange, onRemove, canRemove }) {
  const { type, prompt, options, correct_answer, hint } = question

  return (
    <div className="builder-question-card">
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

      {type !== 'word_choice' && (
        <div className="form-field">
          <label>
            {type === 'fill_blank' ? 'Sentence (use ___ for each blank)'
             : type === 'matching' ? 'Instruction (e.g. "Match the words to their meanings")'
             : 'Question'}
          </label>
          <input type="text"
            placeholder={
              type === 'fill_blank'        ? 'e.g. She ___ from Spain.'
              : type === 'multiple_choice' ? 'e.g. Which sentence is correct?'
              : type === 'true_false'      ? 'e.g. "Good morning" is used in the evening.'
              : 'e.g. Match the words to their definitions.'
            }
            value={prompt}
            onChange={e => onChange('prompt', e.target.value)}
          />
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

      {type === 'fill_blank' && (
        <div className="form-field">
          <label>Correct answer</label>
          <input type="text" placeholder="e.g. is  (for multiple blanks, separate with commas)"
            value={correct_answer || ''} onChange={e => onChange('correct_answer', e.target.value)} />
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

// ─── LessonStageBuilder ───────────────────────────────────────
function LessonStageBuilder({ exercises, adminUserId, onSaved, onCancel, initialPlan = null }) {
  const isEdit = !!initialPlan
  const [title,     setTitle]     = useState(initialPlan?.title ?? '')
  const [desc,      setDesc]      = useState(initialPlan?.description ?? '')
  const [stages,    setStages]    = useState(() => initStagesFromPlan(initialPlan))
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState(null)
  const [pickerFor, setPickerFor] = useState(null) // { type, stageId } | null

  const totalMins = stages.reduce((sum, s) => {
    const m = s.durationMinutes === 'other' ? (parseInt(s.customDuration) || 0) : (s.durationMinutes || 0)
    return sum + m
  }, 0)

  const openPickerForType = (type)    => setPickerFor({ type, stageId: null })
  const openPickerForStage = (stageId, type) => setPickerFor({ type, stageId })

  const removeStage = (id)  => setStages(p => p.filter(s => s.id !== id))
  const moveStage  = (i, dir) => setStages(p => {
    const a = [...p]; [a[i], a[i + dir]] = [a[i + dir], a[i]]; return a
  })
  const updateStage = (id, field, val) =>
    setStages(p => p.map(s => s.id === id ? { ...s, [field]: val } : s))

  const handlePickerSelect = (exercise) => {
    if (!pickerFor) return
    if (pickerFor.stageId === null) {
      // Add new stage with the selected exercise
      const stage = newStage(pickerFor.type)
      stage.exerciseId    = exercise.id
      stage.exerciseTitle = exercise.title
      setStages(p => [...p, stage])
    } else {
      // Update existing stage's exercise
      setStages(p => p.map(s => s.id === pickerFor.stageId
        ? { ...s, exerciseId: exercise.id, exerciseTitle: exercise.title }
        : s))
    }
    setPickerFor(null)
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true); setErr(null)
    const id = isEdit
      ? await updateLessonPlanWithStages(initialPlan.id, title, desc, stages)
      : await createLessonPlanWithStages(title, desc, adminUserId, stages)
    setSaving(false)
    if (id) onSaved(id)
    else setErr('Something went wrong. Please try again.')
  }

  // Show stage picker overlay
  if (pickerFor) {
    return <StagePicker
      type={pickerFor.type}
      allStages={exercises}
      onSelect={handlePickerSelect}
      onCancel={() => setPickerFor(null)} />
  }

  return (
    <div>
      <div className="admin-exercises-toolbar">
        <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Lesson Plan' : 'Create Lesson Plan'}</h3>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>

      <div className="admin-assign-form" style={{ marginBottom: '1.25rem' }}>
        <div className="form-field">
          <label>Plan title *</label>
          <input type="text" placeholder="e.g. Beginner — Lesson 3: Present Simple"
            value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <input type="text" placeholder="Brief description"
            value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
      </div>

      {/* Total time */}
      {totalMins > 0 && (
        <div className="stage-total-row">
          <span className="stage-total-label">Total planned time:</span>
          <span className="stage-total-mins">{totalMins} min</span>
        </div>
      )}

      {/* Stage list */}
      {stages.length > 0 && (
        <div className="stage-list">
          {stages.map((s, i) => (
            <StageCard key={s.id} stage={s} idx={i} exercises={exercises}
              onChange={(field, val) => updateStage(s.id, field, val)}
              onRemove={() => removeStage(s.id)}
              onMoveUp={() => moveStage(i, -1)}
              onMoveDown={() => moveStage(i, 1)}
              canMoveUp={i > 0}
              canMoveDown={i < stages.length - 1}
              onPickerOpen={() => openPickerForStage(s.id, s.type)}
            />
          ))}
        </div>
      )}

      {stages.length === 0 && (
        <div className="dashboard-empty" style={{ margin: '1rem 0' }}>
          <p style={{ margin: 0 }}>No stages yet — add one below.</p>
        </div>
      )}

      {/* Add stage buttons */}
      <div className="stage-add-section">
        <p className="stage-add-label">Add a stage:</p>
        <div className="stage-add-row">
          {STAGE_TYPES.map(t => (
            <button key={t.value} type="button" className="stage-add-btn"
              onClick={() => t.hasExercise ? openPickerForType(t.value) : setStages(p => [...p, newStage(t.value)])}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="auth-error" style={{ marginTop: '0.75rem' }}>{err}</div>}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', alignItems: 'center' }}>
        <button className="btn-gold" onClick={handleSave}
          disabled={saving || !title.trim()}>
          {saving ? 'Saving…'
            : isEdit
              ? `Save changes (${stages.length} stage${stages.length !== 1 ? 's' : ''})`
              : `Save plan (${stages.length} stage${stages.length !== 1 ? 's' : ''})`}
        </button>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── AdminExerciseReview ──────────────────────────────────────
function AdminExerciseReview({ details, onBack }) {
  const questions = (details.exercises?.questions ?? [])
    .slice().sort((a, b) => a.order_index - b.order_index)
  const answerMap = Object.fromEntries(details.studentAnswers.map(a => [a.question_id, a]))

  // Comments only — no manual grading. is_correct is auto-computed on save.
  const [comments, setComments] = useState(() => {
    const init = {}
    questions.forEach(q => { init[q.id] = answerMap[q.id]?.teacher_comment ?? '' })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  // Auto-compute correctness for question types that have a single right answer
  const autoCorrect = (q) => {
    const sa = answerMap[q.id]
    if (!sa?.answer?.trim()) return null
    if (q.type === 'multiple_choice' || q.type === 'true_false')
      return sa.answer.trim() === (q.correct_answer ?? '').trim() ? true : false
    if (q.type === 'fill_blank')
      return sa.answer.trim().toLowerCase() === (q.correct_answer ?? '').trim().toLowerCase() ? true : false
    if (q.type === 'matching') {
      try { const m = JSON.parse(sa.answer); return (q.options||[]).every(p => m[p.left] === p.right) }
      catch { return null }
    }
    return null // free_text / word_choice — no auto-grade
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = questions
      .filter(q => answerMap[q.id]?.id)
      .map(q => ({
        id:              answerMap[q.id].id,
        is_correct:      autoCorrect(q),
        teacher_comment: comments[q.id] || null,
      }))
    await saveAnswerReviews(payload)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const student  = details.profiles
  const exercise = details.exercises
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
              {q.type !== 'word_choice' && <p className="eq-prompt">{q.prompt}</p>}

              {/* Student's answer */}
              <div className="review-answer-row" style={{ display: 'block' }}>
                <span className="review-label">Student answered:</span>
                {q.type === 'word_choice' ? (
                  hasAnswer
                    ? <WordChoiceQuestion template={q.prompt} answer={sa.answer} onChange={() => {}} disabled={true} />
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
                {q.correct_answer && q.type !== 'matching' && q.type !== 'word_choice' && (
                  <div className="review-correct-answer">
                    <span className="review-label">Correct answer:</span> {q.correct_answer}
                  </div>
                )}
                {q.type === 'matching' && q.options && (
                  <div className="review-correct-answer">
                    <span className="review-label">Correct pairs:</span>{' '}
                    {(q.options||[]).map(p => `${p.left} → ${p.right}`).join(' · ')}
                  </div>
                )}
              </div>

              {/* Comment box — always visible */}
              <div className="form-field" style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem' }}>
                  Your comment <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— visible to student</span>
                </label>
                <textarea className="writing-input" rows={2}
                  placeholder="e.g. Good try! Remember that 'he' uses 'is', not 'are'."
                  value={comments[q.id] || ''}
                  onChange={e => setComments(prev => ({ ...prev, [q.id]: e.target.value }))}
                />
              </div>
            </div>
          )
        })}
      </div>

      {hasAnswers && (
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn-gold" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save comments →'}
          </button>
          {saved && <span style={{ color: '#4ade80', fontSize: '0.9rem' }}>✓ Saved — student can now see your comments</span>}
        </div>
      )}
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

  useEffect(() => {
    fetchStudentLessons(student.id).then(data => {
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
            <AdminLessonRow key={l.id} lesson={l} onUpdate={handleUpdate} />
          ))}
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

  const isAdmin      = user?.email === ADMIN_EMAIL
  const pendingCount = students.filter(s => s.access_level === 'pending').length

  useEffect(() => {
    if (!isAdmin || !supabase) return
    setDataLoading(true)
    fetchStudentsAdmin().then(data => {
      setStudents(data)
      setDataLoading(false)
    })
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

  const openStudent = (s) => {
    setSelected(s)
    setAccessLevel(s.access_level || 'pending')
    setAccessSaved(false)
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
        <button className={`admin-tab ${adminTab === 'stages' ? 'active' : ''}`}
          onClick={() => setAdminTab('stages')}>
          📚 Lesson Stages
        </button>
        <button className={`admin-tab ${adminTab === 'plans' ? 'active' : ''}`}
          onClick={() => setAdminTab('plans')}>
          🗂 Lesson Plans
        </button>
      </div>

      {/* Lesson Stages tab */}
      {adminTab === 'stages' && <AdminLessonStages adminUserId={user?.id} />}

      {/* Lesson Plans tab */}
      {adminTab === 'plans' && <AdminLessonPlans adminUserId={user?.id} />}

      {/* Students tab */}
      {adminTab === 'students' && (
        dataLoading ? (
          <div className="dashboard-loading">Loading students…</div>
        ) : students.length === 0 ? (
          <div className="dashboard-empty">
            <p>No students yet.</p>
            <p className="flow-sub" style={{ fontSize: '0.88rem' }}>Students who sign up will appear here.</p>
          </div>
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
                      <span className="admin-date-chip">{new Date(s.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                    <span className="admin-arrow">›</span>
                  </button>
                ))}
              </>
            )}

            {/* Active students */}
            {activeStudents.length > 0 && (
              <>
                {pendingStudents.length > 0 && (
                  <p className="admin-section-label" style={{ marginTop: '1.25rem' }}>Active students ({activeStudents.length})</p>
                )}
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
          </div>
        )
      )}
    </div>
  )
}
