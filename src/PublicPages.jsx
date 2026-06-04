// Auto-extracted from App.jsx (Task #9 split). See lib/shared.js for shared constants/utils.
import { useState, useEffect } from 'react'
import { createProspect, fetchSiteSetting, fetchTestAssignmentById, logReferral, lookupReferralCode, savePlacementResult, submitTestResult, supabase } from './lib/supabase'
import { TEST_DEFINITIONS, getEffectiveQuestions } from './lib/shared'
import { ABOUT, COURSES_DATA, FAQ_ITEMS, HOW_IT_WORKS_STEPS, PRICING_PLANS, TESTIMONIALS } from './content'

export const CALENDLY_CONSULTATION = 'https://calendly.com/dogukan-cy/free-english-course-consultation-50-mins'
export const CALENDLY_FIRST_LESSON = 'https://calendly.com/dogukan-cy/30min'
export const DEMO_EXERCISE = {
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
export const Q_QUESTIONS = [
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
export const READING_PASSAGE = `Remote work has transformed the modern workplace in ways few anticipated. While many employees celebrate the flexibility and elimination of commutes, managers face new challenges in maintaining team cohesion and monitoring productivity. Studies suggest that remote workers often put in longer hours than their office-based counterparts, blurring the boundary between professional and personal life. However, companies that have embraced remote work report lower overhead costs and access to a broader talent pool, unconstrained by geography.`

export const TEST_QUESTIONS = [
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

// ─── ErrorBoundary ────────────────────────────────────────────
// Catches render crashes so the admin never sees a blank page.
export function FlowSteps({ current }) {
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
export function Navbar({ onBook, user, onAccount, onSignIn }) {
  return (
    <nav className="navbar navbar--navy">
      <div className="nav-inner">
        <span className="brand" aria-label="English with Dogukan">
          <span className="brand-top">
            <span className="brand-dot" />
            <span className="brand-word">English</span>
          </span>
          <span className="brand-rule"><span className="brand-rule-dark" /><span className="brand-rule-gold" /></span>
          <span className="brand-sub">with Dogukan</span>
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
              <button className="nav-book" onClick={onBook}>Book free lesson</button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────
export function Hero({ onBook }) {
  const [heroSrc, setHeroSrc] = useState('/hero.png')
  useEffect(() => {
    fetchSiteSetting('hero_photo').then(v => { if (v) setHeroSrc(v) })
  }, [])
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
              <img src={heroSrc} alt="Dogukan — English teacher"
                onError={e => {
                  e.target.style.display = 'none'
                  e.target.parentNode.style.background = 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)'
                  e.target.parentNode.style.display = 'flex'
                  e.target.parentNode.style.alignItems = 'center'
                  e.target.parentNode.style.justifyContent = 'center'
                  e.target.parentNode.innerHTML = '<span style="font-size:5rem;opacity:0.4">👨‍🏫</span>'
                }} />
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
export function HowItWorks() {
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

export function Courses() {
  const [openModules, setOpenModules] = useState({})
  const [coursesData, setCoursesData] = useState(COURSES_DATA)

  useEffect(() => {
    fetchSiteSetting('courses').then(data => {
      if (Array.isArray(data) && data.length > 0) setCoursesData(data)
    })
  }, [])

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
          {coursesData.map((c, ci) => (
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
export function Testimonials() {
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
export function FAQ() {
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
export function Pricing({ onBook }) {
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
export const CREDENTIAL_ICONS = ['🎓', '📚']

export function AboutMe() {
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
export function DemoExercise({ onBook }) {
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
export function BookingCTA({ onBook }) {
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
export function WhatsAppButton({ number }) {
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
export function Footer() {
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
export function Start({ onQuestionnaire, onConsultation }) {
  return (
    <div className="flow-card">
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
export function Questionnaire({ onSubmit, onBack }) {
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
export function ConsultationScreen({ onContinue, onBack }) {
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
export function PreTest({ completedPath, studentName, onTakeTest, onSkip }) {
  const isQuestionnaire = completedPath === 'questionnaire'

  const handleBookLesson = () => {
    window.open(CALENDLY_FIRST_LESSON, '_blank')
    onSkip()
  }

  if (!isQuestionnaire) {
    // Consultation path: just show confirmation, no test offer
    return (
      <div className="flow-card" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
        <h2 style={{ marginBottom: '0.5rem' }}>Your consultation is booked!</h2>
        <p className="flow-sub" style={{ marginBottom: '1.75rem' }}>
          Dogukan will be in touch to confirm your lesson time. See you soon!
        </p>
        <button className="btn-outline btn-full" onClick={onSkip}>
          ← Back to home
        </button>
      </div>
    )
  }

  return (
    <div className="flow-card pretest-card">

      <div className="pretest-heading">
        <span className="confirmation-icon">✅</span>
        <h2>{studentName ? `Thanks, ${studentName}!` : "You're all set!"}</h2>
        <p className="flow-sub">Dogukan has everything he needs. What would you like to do next?</p>
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
          <div className="next-step-icon">📅</div>
          <h3>Book my first lesson now</h3>
          <p>Skip the test and go straight to booking your free 60-minute first lesson with Dogukan.</p>
          <button className="btn-outline btn-full" onClick={handleBookLesson}>
            Book my lesson →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PlacementTest ────────────────────────────────────────────
export function PlacementTest({ onSubmit, onBack }) {
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

// ─── PlacementTestFrame ───────────────────────────────────────
// Renders the new 45-question test in an iframe and listens for
// the postMessage that fires when the student completes it.
export function PlacementTestFrame({ userId, onComplete }) {
  useEffect(() => {
    const handler = async (event) => {
      if (event.data?.type !== 'PLACEMENT_TEST_COMPLETE') return
      const p = event.data.payload
      const resultData = {
        level: p.cefr.replace('/','_'),   // 'C1/C2' → 'C1_C2' (normalise for DB)
        level_name: p.level,
        grammar_score: p.grammarScore,
        vocabulary_score: p.vocabScore,
        reading_score: p.tenseScore,     // reuse reading_score column for tense%
        overall_score: p.overallScore,
        writing_answer: p.writingAnswers.map(w => w.tag + ': ' + w.answer).join('\n\n'),
        teacher_notes: JSON.stringify(p),
        recommended_course: p.level,
        strengths: [],
        areas_to_improve: [],
      }
      await savePlacementResult(resultData, null, userId)
      onComplete(p)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [userId, onComplete])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ marginTop: '1rem' }}>
      <iframe
        src="/placement-test.html"
        title="English Placement Test"
        style={{ width: '100%', minHeight: '800px', border: 'none', borderRadius: '0.75rem' }}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  )
}

// ─── Grading ──────────────────────────────────────────────────
export function Grading({ answers, onDone }) {
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

export function gradeTestLocally(answers) {
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
export function Results({ results, completedPath, user, onBookLesson, onDone }) {
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
export function AuthPage({ studentData, onSuccess, onBack, defaultMode = 'signup', showSteps = true }) {
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
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2>{mode === 'signup' ? 'Create your account' : 'Student Sign in'}</h2>
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
export function PublicTestPage({ assignmentId, onDone }) {
  const [assignment, setAssignment] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [testHtml,   setTestHtml]   = useState(null)

  useEffect(() => {
    fetchTestAssignmentById(assignmentId).then(a => {
      if (!a) { setNotFound(true); setLoading(false); return }
      if (a.status === 'completed') { setSubmitted(true); setLoading(false); return }
      setAssignment(a)
      setLoading(false)
    })
  }, [assignmentId])

  useEffect(() => {
    if (!assignment) return
    const htmlFile = assignment.test_id === 'hospitality_placement_v1'
      ? '/tests/hospitality_placement_v1.html'
      : '/tests/general_placement_v1.html'
    const testId = assignment.test_id || 'general_placement_v1'
    fetch(htmlFile)
      .then(r => r.text())
      .then(html => {
        const currentQ = getEffectiveQuestions(testId)
        const varName = testId === 'hospitality_placement_v1' ? '__eph_questions' : '__ept_questions'
        const injected = `<script>window.${varName} = ${JSON.stringify(currentQ)};</script>\n` + html
        setTestHtml(injected)
      })
  }, [assignment])

  useEffect(() => {
    if (!assignment) return
    const handler = async (e) => {
      if (!e.data || e.data.type !== 'ept_submit') return
      await submitTestResult(assignment.id, e.data.results)
      setSubmitted(true)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [assignment])

  if (loading) return <div className="dashboard-loading">Loading your test…</div>

  if (notFound) return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
      <h2 style={{ marginBottom: '0.5rem' }}>Test not found</h2>
      <p style={{ color: 'var(--text-muted)' }}>This test link is invalid or has expired. Please contact your teacher.</p>
    </div>
  )

  if (submitted) return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1.25rem' }}>✅</div>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem' }}>Test completed!</h2>
      <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: '440px', margin: '0 auto' }}>
        Your answers have been submitted. Your results will be evaluated and Dogukan will get back to you shortly.
      </p>
    </div>
  )

  const testDef = TEST_DEFINITIONS.find(t => t.id === assignment.test_id) || TEST_DEFINITIONS[0]
  const studentName = assignment.manual_students?.name || assignment.profiles?.name

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.2rem' }}>{testDef.label}</h2>
        {studentName && <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>For: {studentName}</p>}
      </div>
      {!testHtml ? (
        <div className="dashboard-loading">Loading test…</div>
      ) : (
        <iframe
          srcDoc={testHtml}
          title={testDef.label}
          style={{ width: '100%', border: 'none', minHeight: '750px', display: 'block' }}
          sandbox="allow-scripts"
        />
      )}
    </div>
  )
}

// ─── InlineExerciseContent ────────────────────────────────────
// Renders exercise audio / context / questions inline inside a
// collapsible stage card.  Used in LessonPlanView + student plan view.
