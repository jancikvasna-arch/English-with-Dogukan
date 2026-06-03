import { useState, useEffect, Component } from 'react'
import { linkGuestData, savePlacementResult, saveQuestionnaire, supabase } from './lib/supabase'
import { ADMIN_EMAIL, loadAdminCoursesCache } from './lib/shared'
import { WHATSAPP_NUMBER } from './content'
import { AdminPanel } from './AdminApp.jsx'
import { AboutMe, AuthPage, BookingCTA, ConsultationScreen, Courses, DemoExercise, FAQ, Footer, Grading, Hero, HowItWorks, Navbar, PlacementTest, PreTest, Pricing, PublicTestPage, Questionnaire, Results, Start, Testimonials, WhatsAppButton } from './PublicPages.jsx'
import { AccountSettings, StudentDashboard } from './StudentDashboard.jsx'
import './App.css'

const CALENDLY_FIRST_LESSON = 'https://calendly.com/dogukan-cy/30min'
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flow-card" style={{ maxWidth: 640, margin: '2rem auto', textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem' }}>⚠️</span>
          <h2 style={{ marginTop: '0.75rem' }}>Something went wrong</h2>
          <p className="flow-sub" style={{ marginBottom: '1.5rem' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button className="btn-gold" onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

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
  const [publicTestId, setPublicTestId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('t') || null
    } catch { return null }
  })
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

  // Load courses cache from Supabase when user logs in
  useEffect(() => {
    if (user) loadAdminCoursesCache()
  }, [user])

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

  if (publicTestId) {
    return (
      <div className="flow-wrapper">
        <div className="flow-header">
          <span className="flow-header-logo">English with Dogukan</span>
        </div>
        <div className="flow-content">
          <div className="flow-card" style={{ maxWidth: '780px' }}>
            <PublicTestPage
              assignmentId={publicTestId}
              onDone={() => setPublicTestId(null)}
            />
          </div>
        </div>
      </div>
    )
  }

  if (page !== 'landing') {
    return (
      <div className="flow-wrapper">
        <div className="flow-header">
          {page === 'admin' ? (
            <span className="flow-header-logo flow-header-logo--admin">Admin Panel — English with Dogukan</span>
          ) : (
            <button className="back-link" onClick={() => goTo('landing')}>
              ← English with Dogukan
            </button>
          )}
          {user && page !== 'admin' && page !== 'dashboard' && page !== 'settings' && (
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
              showSteps={false}
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
            <ErrorBoundary>
              <AdminPanel user={user} onSignOut={handleSignOut} />
            </ErrorBoundary>
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
