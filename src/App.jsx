import { useState, useEffect, useRef } from 'react'
import './App.css'
import { supabase, saveQuestionnaire, savePlacementResult, linkGuestData } from './lib/supabase'
import { ABOUT, HOW_IT_WORKS_STEPS, PRICING_PLANS, COURSES_DATA } from './content'

// ─── Constants ───────────────────────────────────────────────
const CALENDLY_CONSULTATION = 'https://calendly.com/dogukan-cy/free-english-course-consultation-50-mins'
const CALENDLY_FIRST_LESSON = 'https://calendly.com/dogukan-cy/30min'

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
    if (path.startsWith('/admin')) return 'admin'
    if (path.startsWith('/dashboard')) return 'dashboard'
    return 'landing'
  }

  const [page, setPage] = useState(initPage)
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
    setPage(p)
    window.scrollTo(0, 0)
    if (p === 'admin')     window.history.pushState({}, '', '/admin')
    else if (p === 'dashboard') window.history.pushState({}, '', '/dashboard')
    else if (p === 'landing')   window.history.pushState({}, '', '/')
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
          <button className="back-link" onClick={() => goTo('landing')}>
            ← English with Dogukan
          </button>
          {user && (
            <button className="back-link" style={{ marginLeft: 'auto' }}
              onClick={() => goTo(user.email === 'dogukan.cy@gmail.com' ? 'admin' : 'dashboard')}>
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
              onSuccess={async (newUser) => {
                try {
                  if (studentData.email) await linkGuestData(studentData.email, newUser.id)
                } catch (e) {
                  console.error('[onSuccess] linkGuestData failed:', e)
                }
                window.open(CALENDLY_FIRST_LESSON, '_blank')
                goTo('dashboard')
              }}
              onBack={() => goTo(results ? 'results' : 'landing')}
            />
          )}
          {page === 'dashboard' && (
            <StudentDashboard user={user} onSignOut={handleSignOut} onBook={() => window.open(CALENDLY_FIRST_LESSON, '_blank')} />
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
        onAccount={() => goTo(user?.email === 'dogukan.cy@gmail.com' ? 'admin' : 'dashboard')} />
      <Hero onBook={() => goTo('start')} />
      <HowItWorks />
      <Courses />
      <Testimonials />
      <Pricing onBook={() => goTo('start')} />
      <AboutMe />
      <BookingCTA onBook={() => goTo('start')} />
      <Footer />
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
function Navbar({ onBook, user, onAccount }) {
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
            <button className="btn-gold" onClick={onBook}>Book a free lesson</button>
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
function AuthPage({ studentData, onSuccess, onBack }) {
  const [mode, setMode] = useState('signup') // 'signup' | 'login'
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

// ─── StudentDashboard ─────────────────────────────────────────
function StudentDashboard({ user, onSignOut, onBook }) {
  const [submission, setSubmission] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !user) { setLoading(false); return }
    Promise.all([
      supabase.from('questionnaire_submissions').select('*')
        .eq('student_id', user.id).order('submitted_at', { ascending: false }).limit(1).single(),
      supabase.from('placement_results').select('*')
        .eq('student_id', user.id).order('completed_at', { ascending: false }).limit(1).single(),
    ]).then(([{ data: sub }, { data: res }]) => {
      setSubmission(sub)
      setResult(res)
      setLoading(false)
    })
  }, [user])

  if (!user) {
    return (
      <div className="flow-card text-center">
        <span className="confirmation-icon">🔒</span>
        <h2>Sign in to view your dashboard</h2>
        <p className="flow-sub">Create an account or sign in to access your lessons and results.</p>
      </div>
    )
  }

  const name = user.user_metadata?.name || user.email?.split('@')[0]
  const levelColors = { A1: '#94a3b8', A2: '#60a5fa', B1: '#3b82f6', B2: '#6366f1', C1: '#d4a853', C2: '#f59e0b' }
  const color = result ? (levelColors[result.cefr_level] || '#d4a853') : '#d4a853'

  return (
    <div className="flow-card dashboard-card">
      <div className="dashboard-header">
        <div>
          <h2>Welcome back, {name}!</h2>
          <p className="flow-sub">Your English learning journey</p>
        </div>
        <button className="btn-ghost" onClick={onSignOut}>Sign out</button>
      </div>

      {loading ? (
        <div className="dashboard-loading">Loading your data…</div>
      ) : (
        <>
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
          ) : (
            <div className="dashboard-empty">
              <p>No placement test results yet.</p>
              <p className="flow-sub" style={{ fontSize: '0.88rem' }}>Complete a placement test to see your level here.</p>
            </div>
          )}

          <div className="dashboard-actions">
            <button className="btn-gold btn-full btn-lg" onClick={onBook}>
              Book your free first lesson →
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── AdminPanel ───────────────────────────────────────────────
const ADMIN_EMAIL = 'dogukan.cy@gmail.com'

function AdminPanel({ user, onSignOut }) {
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loginError, setLoginError] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [students, setStudents] = useState([])
  const [dataLoading, setDataLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (!isAdmin || !supabase) return
    setDataLoading(true)
    supabase
      .from('questionnaire_submissions')
      .select(`id, guest_name, guest_email, level, goal, challenge, background,
               time_commitment, content_preference, submitted_at,
               placement_results ( id, cefr_level, overall_score, writing_answer, writing_reviewed, teacher_notes, completed_at )`)
      .order('submitted_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        setStudents(data ?? [])
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

  const handleReview = async (resultId) => {
    setSaving(true)
    const { error } = await supabase.from('placement_results')
      .update({ teacher_notes: notes, writing_reviewed: true })
      .eq('id', resultId)
    if (!error) {
      setStudents((prev) => prev.map((s) => ({
        ...s,
        placement_results: s.placement_results?.map((r) =>
          r.id === resultId ? { ...r, teacher_notes: notes, writing_reviewed: true } : r
        ),
      })))
      setSelected(null)
    }
    setSaving(false)
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

  // Not logged in as admin → show login form
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

  // Student detail view
  if (selected) {
    const result = selected.placement_results?.[0]
    return (
      <div className="flow-card admin-detail">
        <button className="back-btn" onClick={() => { setSelected(null); setNotes('') }}>← Back to students</button>
        <h2>{selected.guest_name || 'Student'}</h2>
        <p className="admin-email">{selected.guest_email}</p>
        <p className="admin-date">Submitted: {new Date(selected.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <div className="admin-section">
          <h3>Questionnaire answers</h3>
          <div className="admin-answers">
            {[
              ['Level',       selected.level],
              ['Goal',        selected.goal],
              ['Challenge',   selected.challenge],
              ['Background',  selected.background],
              ['Time/week',   selected.time_commitment],
              ['Content',     selected.content_preference],
            ].map(([label, val]) => val && (
              <div key={label} className="admin-answer-row">
                <span className="admin-answer-label">{label}</span>
                <span className="admin-answer-val">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {result ? (
          <div className="admin-section">
            <h3>Placement test results</h3>
            <div className="admin-scores">
              <span className="admin-level-badge">{result.cefr_level}</span>
              <span>Overall: <strong>{result.overall_score}%</strong></span>
            </div>

            <div className="admin-writing">
              <h4>Writing answer {result.writing_reviewed ? <span className="reviewed-badge">✓ Reviewed</span> : <span className="pending-badge">Pending review</span>}</h4>
              <blockquote className="writing-quote">{result.writing_answer || '(no answer provided)'}</blockquote>
            </div>

            <div className="admin-section">
              <h4>Teacher notes</h4>
              <textarea
                className="writing-input"
                rows={4}
                placeholder="Add your notes about this student's writing and overall profile…"
                value={notes || result.teacher_notes || ''}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button className="btn-gold" style={{ marginTop: '0.75rem' }}
                onClick={() => handleReview(result.id)} disabled={saving}>
                {saving ? 'Saving…' : result.writing_reviewed ? 'Update notes' : 'Mark as reviewed & save notes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="admin-section">
            <p className="flow-sub">No placement test completed yet.</p>
          </div>
        )}
      </div>
    )
  }

  // Student list view
  return (
    <div className="flow-card admin-panel">
      <div className="admin-header">
        <div>
          <h2>Students</h2>
          <p className="flow-sub">{students.length} {students.length === 1 ? 'submission' : 'submissions'}</p>
        </div>
        <button className="btn-ghost" onClick={onSignOut}>Sign out</button>
      </div>

      {dataLoading ? (
        <div className="dashboard-loading">Loading students…</div>
      ) : students.length === 0 ? (
        <div className="dashboard-empty">
          <p>No student submissions yet.</p>
          <p className="flow-sub" style={{ fontSize: '0.88rem' }}>Students who complete the questionnaire will appear here.</p>
        </div>
      ) : (
        <div className="admin-list">
          {students.map((s) => {
            const result = s.placement_results?.[0]
            const needsReview = result && !result.writing_reviewed
            return (
              <button key={s.id} className="admin-student-row" onClick={() => { setSelected(s); setNotes(result?.teacher_notes || '') }}>
                <div className="admin-student-info">
                  <strong>{s.guest_name || 'Unknown'}</strong>
                  <span className="admin-student-email">{s.guest_email}</span>
                </div>
                <div className="admin-student-meta">
                  {result && <span className="admin-level-chip">{result.cefr_level} · {result.overall_score}%</span>}
                  {needsReview && <span className="admin-review-chip">Writing to review</span>}
                  <span className="admin-date-chip">{new Date(s.submitted_at).toLocaleDateString('en-GB')}</span>
                </div>
                <span className="admin-arrow">›</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
