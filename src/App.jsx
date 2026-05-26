import { useState, useEffect, useRef } from 'react'
import './App.css'

// ─── Constants ───────────────────────────────────────────────
const CALENDLY_CONSULTATION = 'https://calendly.com/dogukan-cy/free-english-course-consultation-50-mins'
const CALENDLY_FIRST_LESSON = 'https://calendly.com/dogukan-cy/30min'

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
  const [page, setPage] = useState('landing')
  const [formData, setFormData] = useState({})
  const [testAnswers, setTestAnswers] = useState({})
  const [results, setResults] = useState(null)

  const goTo = (p) => {
    setPage(p)
    window.scrollTo(0, 0)
  }

  if (page !== 'landing') {
    return (
      <div className="flow-wrapper">
        <div className="flow-header">
          <button className="back-link" onClick={() => goTo('landing')}>
            ← English with Doğukan
          </button>
        </div>
        <div className="flow-content">
          {page === 'booking' && (
            <BookingForm
              onSubmit={(data) => { setFormData(data); goTo('path') }}
            />
          )}
          {page === 'path' && (
            <PathChoice
              onQuestionnaire={() => goTo('questionnaire')}
              onConsultation={() => goTo('consultation')}
              onSkip={() => goTo('pretest')}
            />
          )}
          {page === 'questionnaire' && (
            <Questionnaire
              onSubmit={() => goTo('pretest')}
              onBack={() => goTo('path')}
            />
          )}
          {page === 'consultation' && (
            <ConsultationScreen onContinue={() => goTo('pretest')} />
          )}
          {page === 'pretest' && (
            <PreTest
              formData={formData}
              onTakeTest={() => goTo('test')}
              onSkip={() => goTo('landing')}
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
              onDone={(r) => { setResults(r); goTo('results') }}
            />
          )}
          {page === 'results' && (
            <Results results={results} onDone={() => goTo('landing')} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="site">
      <Navbar onBook={() => goTo('booking')} />
      <Hero onBook={() => goTo('booking')} />
      <HowItWorks />
      <Courses />
      <Testimonials />
      <Pricing onBook={() => goTo('booking')} />
      <BookingCTA onBook={() => goTo('booking')} />
      <Footer />
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────
function Navbar({ onBook }) {
  return (
    <nav className="navbar">
      <div className="nav-inner">
        <span className="nav-logo">
          English with <span className="gold">Doğukan</span>
        </span>
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#courses">Courses</a>
          <a href="#pricing">Pricing</a>
          <button className="btn-gold" onClick={onBook}>Book free lesson</button>
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
            <span className="gold">One-to-one lessons</span> built around you.
          </h1>
          <p className="hero-sub">
            Personalised lessons. Real conversations. No wasted time on things you already know.
            Start with a free 30-minute lesson — no commitment.
          </p>
          <div className="hero-actions">
            <button className="btn-gold btn-lg" onClick={onBook}>
              Book your free lesson
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
                  <strong>Share your goals</strong>
                  <p>Tell Doğukan what you need English for</p>
                </div>
              </div>
              <div className="journey-step">
                <div className="step-num">2</div>
                <div>
                  <strong>Quick placement</strong>
                  <p>Optional 12-question test to find your level</p>
                </div>
              </div>
              <div className="journey-step">
                <div className="step-num">3</div>
                <div>
                  <strong>Free first lesson</strong>
                  <p>No payment, no pressure — just good English</p>
                </div>
              </div>
              <div className="journey-step">
                <div className="step-num">4</div>
                <div>
                  <strong>Your custom course</strong>
                  <p>Lessons shaped around how you learn best</p>
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
  const steps = [
    {
      num: '01', title: 'Book your free lesson',
      desc: "Fill in a short form — name, email, and when you're free. No credit card needed.",
    },
    {
      num: '02', title: 'Optional placement test',
      desc: 'Take a 12-question test to help Doğukan understand your level and customise your lessons.',
    },
    {
      num: '03', title: 'Meet Doğukan',
      desc: 'Your first 30-minute lesson is free. Get a feel for the teaching style and ask anything.',
    },
    {
      num: '04', title: 'Start your course',
      desc: 'Choose a lesson package and start making real, measurable progress in English.',
    },
  ]

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

// ─── Courses ──────────────────────────────────────────────────
function Courses() {
  const courses = [
    {
      level: 'Beginner', tag: 'A1 – A2', color: '#3b82f6',
      desc: 'Build a solid foundation from the ground up. Everyday vocabulary, basic grammar, and the confidence to hold simple conversations.',
      topics: ['Greetings & introductions', 'Present & past tenses', 'Numbers, dates & time', 'Shopping, travel & directions', 'Asking & answering questions'],
    },
    {
      level: 'Intermediate', tag: 'B1 – B2', color: '#d4a853', featured: true,
      desc: 'Break through the plateau. Learn to express opinions, discuss complex topics, and handle real-world English at work and in social situations.',
      topics: ['Business & professional English', 'Complex grammar structures', 'Reading & listening comprehension', 'Debate & discussion skills', 'Writing emails & reports'],
    },
    {
      level: 'Advanced', tag: 'C1', color: '#a855f7',
      desc: 'Refine your English to near-native level. Master nuance, idioms, and academic or professional English that sets you apart.',
      topics: ['Idiomatic & natural expression', 'Academic writing', 'Presentations & public speaking', 'Subtle grammar & style', 'Media & current affairs'],
    },
  ]

  return (
    <section className="section section-alt" id="courses">
      <div className="container">
        <div className="section-label">What you'll learn</div>
        <h2 className="section-title">Courses</h2>
        <div className="courses-grid">
          {courses.map((c) => (
            <div key={c.level} className={`course-card ${c.featured ? 'course-featured' : ''}`}>
              {c.featured && <div className="course-badge">Most popular</div>}
              <div className="course-tag" style={{ color: c.color }}>{c.tag}</div>
              <h3 className="course-level">{c.level}</h3>
              <p className="course-desc">{c.desc}</p>
              <ul className="course-topics">
                {c.topics.map((t) => (
                  <li key={t}>
                    <span className="check" style={{ color: c.color }}>✓</span> {t}
                  </li>
                ))}
              </ul>
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
      text: 'After 6 months with Doğukan I went from struggling in meetings to confidently leading them. His approach is patient, structured and genuinely fun.',
    },
    {
      name: 'Kaito M.', country: 'Japan', level: 'B1 → B2',
      text: 'I tried many tutors before but Doğukan is different. He actually listens to what you need and adapts every lesson. My business English has improved massively.',
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
  const plans = [
    {
      name: 'Free trial', price: '£0', per: 'first lesson',
      desc: 'Try before you commit. One 30-minute lesson, no payment required.',
      features: ['30-minute lesson', 'Level assessment', 'No credit card needed'],
      cta: 'Book now',
    },
    {
      name: 'Pay as you go', price: '£40', per: 'per lesson', featured: true,
      desc: 'Full flexibility. Pay per lesson, cancel or pause anytime.',
      features: ['60-minute lessons', 'Lesson notes & resources', 'WhatsApp support between lessons', 'Flexible scheduling'],
      cta: 'Get started',
    },
    {
      name: 'Lesson bundle', price: '£420', per: '12 lessons',
      desc: 'Best value. Commit to consistent progress and save £60.',
      features: ['12 × 60-minute lessons', 'Personalised learning plan', 'Progress tracking', 'Priority scheduling', 'Save £60 vs pay-as-you-go'],
      cta: 'Book bundle',
    },
  ]

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
                  <li key={f}>
                    <span className="check gold">✓</span> {f}
                  </li>
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
        <p className="section-note">* Placeholder pricing — Doğukan to confirm final numbers.</p>
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
          Your first lesson is free. No commitment, no pressure — just great English teaching.
        </p>
        <button className="btn-gold btn-lg" onClick={onBook}>
          Book your free lesson →
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
          English with <span className="gold">Doğukan</span>
        </span>
        <p>CELTA-certified English tutor · Personalised one-to-one lessons</p>
      </div>
    </footer>
  )
}

// ─── BookingForm ──────────────────────────────────────────────
function BookingForm({ onSubmit }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', availability: '' })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Please enter your name'
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Please enter a valid email'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSubmit(form)
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="flow-card">
      <h2>Book your free lesson</h2>
      <p className="flow-sub">
        Fill in your details and Doğukan will be in touch to confirm a time.
      </p>
      <form onSubmit={handleSubmit} className="booking-form">
        <div className="form-field">
          <label>Your name *</label>
          <input
            type="text" placeholder="e.g. Maria"
            value={form.name} onChange={set('name')}
            className={errors.name ? 'input-error' : ''}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="form-field">
          <label>Email address *</label>
          <input
            type="email" placeholder="e.g. maria@email.com"
            value={form.email} onChange={set('email')}
            className={errors.email ? 'input-error' : ''}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="form-field">
          <label>Phone number <span className="optional">(optional)</span></label>
          <input
            type="tel" placeholder="e.g. +44 7700 900000"
            value={form.phone} onChange={set('phone')}
          />
        </div>
        <div className="form-field">
          <label>When are you usually free? <span className="optional">(optional)</span></label>
          <input
            type="text" placeholder="e.g. Weekday evenings, Saturday mornings"
            value={form.availability} onChange={set('availability')}
          />
        </div>
        <button type="submit" className="btn-gold btn-full btn-lg">Continue →</button>
      </form>
    </div>
  )
}

// ─── PathChoice ───────────────────────────────────────────────
function PathChoice({ onQuestionnaire, onConsultation, onSkip }) {
  return (
    <div className="flow-card">
      <h2>One more step</h2>
      <p className="flow-sub">
        Help Doğukan prepare for your first lesson. This is completely optional — choose what works for you.
      </p>
      <div className="path-options">
        <button className="path-card" onClick={onQuestionnaire}>
          <span className="path-icon">📋</span>
          <div>
            <strong>Fill in a short questionnaire</strong>
            <p>~2 minutes. Tell Doğukan about your goals, interests, and learning style.</p>
          </div>
          <span className="path-arrow">→</span>
        </button>
        <button className="path-card" onClick={onConsultation}>
          <span className="path-icon">📞</span>
          <div>
            <strong>Request a consultation call</strong>
            <p>Book a 15-minute call to talk through your goals before the lesson.</p>
          </div>
          <span className="path-arrow">→</span>
        </button>
        <button className="path-card path-skip" onClick={onSkip}>
          <span className="path-icon">⏭️</span>
          <div>
            <strong>Skip for now</strong>
            <p>No questionnaire, no call — go straight to your booking confirmation.</p>
          </div>
          <span className="path-arrow">→</span>
        </button>
      </div>
    </div>
  )
}

// ─── Questionnaire ────────────────────────────────────────────
function Questionnaire({ onSubmit, onBack }) {
  const [form, setForm] = useState({ goals: '', topics: '', level: '', style: '', frequency: '' })
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="flow-card">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2>About you</h2>
      <p className="flow-sub">
        Help Doğukan tailor your lessons from day one. (~2 minutes)
      </p>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="booking-form">
        <div className="form-field">
          <label>Why do you want to improve your English?</label>
          <textarea
            placeholder="e.g. Work, travel, moving abroad, exams, confidence..."
            value={form.goals} onChange={set('goals')} rows={3}
          />
        </div>
        <div className="form-field">
          <label>What topics interest you most?</label>
          <input
            type="text"
            placeholder="e.g. Business, culture, news, sport, technology..."
            value={form.topics} onChange={set('topics')}
          />
        </div>
        <div className="form-field">
          <label>How would you describe your current level?</label>
          <select value={form.level} onChange={set('level')}>
            <option value="">Select a level</option>
            <option value="complete-beginner">Complete beginner</option>
            <option value="beginner">Beginner (A1–A2)</option>
            <option value="intermediate">Intermediate (B1–B2)</option>
            <option value="advanced">Advanced (C1)</option>
            <option value="not-sure">Not sure</option>
          </select>
        </div>
        <div className="form-field">
          <label>How do you prefer to learn?</label>
          <textarea
            placeholder="e.g. Conversation practice, grammar drills, reading, watching videos..."
            value={form.style} onChange={set('style')} rows={2}
          />
        </div>
        <div className="form-field">
          <label>How often would you like lessons?</label>
          <select value={form.frequency} onChange={set('frequency')}>
            <option value="">Select frequency</option>
            <option value="once">Once a week</option>
            <option value="twice">Twice a week</option>
            <option value="intensive">More than twice (intensive)</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
        <button type="submit" className="btn-gold btn-full btn-lg">Submit →</button>
      </form>
    </div>
  )
}

// ─── ConsultationScreen ───────────────────────────────────────
function ConsultationScreen({ onContinue }) {
  return (
    <div className="flow-card consultation-card">
      <span className="confirmation-icon">📞</span>
      <h2>Book a consultation call</h2>
      <p className="flow-sub">
        Click below to open Doğukan's scheduling page and book a free 15-minute
        consultation at a time that suits you.
      </p>
      <button
        className="btn-gold btn-lg"
        onClick={() => window.open(CALENDLY_CONSULTATION, '_blank')}
      >
        Open scheduling page →
      </button>
      <div className="divider" />
      <p className="flow-note" style={{ marginBottom: '1rem' }}>
        Already booked your call, or prefer to skip?
      </p>
      <button className="btn-ghost" onClick={onContinue}>
        Continue to booking confirmation →
      </button>
    </div>
  )
}

// ─── PreTest ──────────────────────────────────────────────────
function PreTest({ formData, onTakeTest, onSkip }) {
  const bookLesson = () => window.open(CALENDLY_FIRST_LESSON, '_blank')

  return (
    <div className="flow-card text-center">
      <span className="confirmation-icon">✅</span>
      <h2>You're all set{formData.name ? `, ${formData.name}` : ''}!</h2>
      <p className="flow-sub">
        Doğukan will be in touch at <strong>{formData.email}</strong> to confirm your lesson time.
      </p>

      <div className="pretest-box">
        <h3>Want to take a quick placement test?</h3>
        <p>
          It takes about 10 minutes and gives Doğukan a clear picture of your current level
          before your first lesson. Completely optional — no pressure either way.
        </p>
        <div className="pretest-actions">
          <button className="btn-gold btn-lg" onClick={onTakeTest}>
            Take the placement test
          </button>
          <button className="btn-outline btn-lg" onClick={() => { bookLesson(); onSkip() }}>
            Skip — book my lesson now →
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
          type="text"
          className="fill-input"
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
  const [error, setError] = useState(null)
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true
    gradeTest(answers).then(onDone).catch((err) => setError(err.message))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flow-card text-center">
        <span className="confirmation-icon">⚠️</span>
        <h2>Grading error</h2>
        <p className="flow-sub">{error}</p>
        <p className="flow-note">
          Make sure <code>VITE_ANTHROPIC_API_KEY</code> is set in your <code>.env</code> file.
        </p>
      </div>
    )
  }

  return (
    <div className="flow-card text-center">
      <div className="grading-spinner" />
      <h2>Grading your test…</h2>
      <p className="flow-sub">
        Doğukan's AI assistant is reviewing your answers. This takes about 10 seconds.
      </p>
    </div>
  )
}

async function gradeTest(answers) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('API key not configured. Add your Anthropic API key to the .env file.')
  }

  const formatted = TEST_QUESTIONS.map((q) => {
    const answer = answers[q.id] || '(no answer)'
    return `Q${q.id} [${q.category} – ${q.type}]: ${q.question}\nAnswer: ${answer}`
  }).join('\n\n')

  const prompt = `You are an expert English language teacher grading a student placement test. Review the answers carefully and assess the student's CEFR level.

Return ONLY valid JSON with exactly this structure (no markdown, no explanation):
{
  "level": "B1",
  "level_name": "Intermediate",
  "grammar_score": 72,
  "vocabulary_score": 68,
  "reading_score": 80,
  "writing_score": 65,
  "overall_score": 71,
  "strengths": ["Good grasp of basic tenses", "Strong reading comprehension"],
  "areas_to_improve": ["Conditional sentences need work", "Vocabulary range could be wider"],
  "teacher_notes": "A brief note for the teacher about this student's profile and priorities.",
  "recommended_course": "Intermediate",
  "encouraging_message": "A warm, encouraging message to the student about their results."
}

CEFR levels: A1 (Beginner), A2 (Elementary), B1 (Pre-Intermediate), B2 (Upper Intermediate), C1 (Advanced)
Scores are percentages 0–100. overall_score is the weighted average.

Student's answers:
${formatted}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${response.status}`)
  }

  const data = await response.json()
  const text = data.content[0].text.trim()

  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Could not parse grading response from API.')
  }
}

// ─── Results ──────────────────────────────────────────────────
function Results({ results, onDone }) {
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
        <ScoreBar label="Writing" score={results.writing_score} />
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
          <h3>Doğukan's notes</h3>
          <p>{results.teacher_notes}</p>
        </div>
      )}

      <div className="results-recommendation">
        Recommended course: <strong>{results.recommended_course}</strong>
      </div>

      <button
        className="btn-gold btn-full btn-lg"
        onClick={() => window.open(CALENDLY_FIRST_LESSON, '_blank')}
        style={{ marginBottom: '0.75rem' }}
      >
        Book your first lesson →
      </button>
      <button className="btn-ghost btn-full" onClick={onDone}>
        Back to home
      </button>
    </div>
  )
}
