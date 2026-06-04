// Auto-extracted from App.jsx (Task #9 split). See lib/shared.js for shared constants/utils.
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { addVocabularyWord, deleteNote, fetchNotesForExercise, saveExerciseAnnotations, saveNote, submitExerciseAnswers, submitTestResult } from './lib/supabase'
import { getEffectiveQuestions, parseOverlayPrompt } from './lib/shared'

export const CIRCLE_COLORS = [
  { name: 'Red',   hex: '#dc2626' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Blue',  hex: '#2563eb' },
  { name: 'Black', hex: '#1a1a1a' },
]
export const LINE_COLORS = [
  '#ef4444','#3b82f6','#22c55e','#f97316',
  '#a855f7','#eab308','#ec4899','#14b8a6',
  '#6366f1','#92400e',
]
export const LINE_THICKNESSES = [
  { label: 'Thin',  px: 1.5 },
  { label: 'Med',   px: 3   },
  { label: 'Thick', px: 5   },
]

export function AnnotatedImage({ src, alt = '', circlesEnabled = true, linesEnabled = true,
  initialCircles = [], initialLines = [], onAnnotationChange = null }) {
  const wrapRef    = useRef(null)
  const instanceId = useRef(`ai${Math.random().toString(36).slice(2,7)}`).current

  // ── Circle state ──────────────────────────────────────────
  const [circles,       setCircles]       = useState(() => initialCircles || [])
  const [circleDrawing, setCircleDrawing] = useState(null)
  const [circleMode,    setCircleMode]    = useState(false)
  const [circleColor,   setCircleColor]   = useState('#dc2626')

  // ── Line state ────────────────────────────────────────────
  const [lines,     setLines]     = useState(() => initialLines || [])
  const [lineMode,  setLineMode]  = useState(false)
  const [lineStart, setLineStart] = useState(null)
  const [lineMouse, setLineMouse] = useState(null)
  const [lineThick, setLineThick] = useState(3)
  const justDrewRef = useRef(false)

  // Notify parent when annotations change (skip on initial render)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    onAnnotationChange?.(circles, lines)
  }, [circles, lines]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeMode     = circleMode ? 'circle' : lineMode ? 'line' : null
  const nextLineColor  = LINE_COLORS[lines.length % LINE_COLORS.length]

  const pct = (e) => {
    const r = wrapRef.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
  }

  const toggleCircle = () => { setCircleMode(m => !m); setLineMode(false); setLineStart(null) }
  const toggleLine   = () => { setLineMode(m => !m);   setCircleMode(false); setCircleDrawing(null) }

  const onMouseDown = (e) => {
    if (!circleMode || e.button !== 0) return
    e.preventDefault()
    const p = pct(e)
    setCircleDrawing({ sx: p.x, sy: p.y, cx: p.x, cy: p.y })
  }
  const onMouseMove = (e) => {
    const p = pct(e)
    if (circleMode && circleDrawing) setCircleDrawing(d => ({ ...d, cx: p.x, cy: p.y }))
    if (lineMode) setLineMouse(p)
  }
  const onMouseUp = (e) => {
    if (!circleMode || !circleDrawing) return
    const rx = Math.abs(circleDrawing.cx - circleDrawing.sx) / 2
    const ry = Math.abs(circleDrawing.cy - circleDrawing.sy) / 2
    if (rx > 0.5 && ry > 0.5) {
      setCircles(prev => [...prev, {
        cx: (circleDrawing.sx + circleDrawing.cx) / 2,
        cy: (circleDrawing.sy + circleDrawing.cy) / 2,
        rx, ry, color: circleColor,
      }])
      justDrewRef.current = true
    }
    setCircleDrawing(null)
  }
  const onClick = (e) => {
    if (justDrewRef.current) { justDrewRef.current = false; return }
    if (!lineMode) return
    const p = pct(e)
    if (!lineStart) {
      setLineStart(p)
    } else {
      const color = LINE_COLORS[lines.length % LINE_COLORS.length]
      setLines(prev => [...prev, { x1: lineStart.x, y1: lineStart.y, x2: p.x, y2: p.y, color, thickness: lineThick }])
      setLineStart(null)
    }
  }

  const previewEll = circleDrawing ? {
    cx: (circleDrawing.sx + circleDrawing.cx) / 2,
    cy: (circleDrawing.sy + circleDrawing.cy) / 2,
    rx: Math.abs(circleDrawing.cx - circleDrawing.sx) / 2,
    ry: Math.abs(circleDrawing.cy - circleDrawing.sy) / 2,
  } : null

  const hasAnnotations = circles.length > 0 || lines.length > 0
  const annTbBtn = (active, ac = '#dc2626', abg = '#fee2e2') => ({
    fontSize: '0.75rem', padding: '0.22rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
    border: `1.5px solid ${active ? ac : 'var(--border)'}`,
    background: active ? abg : 'var(--bg-card)',
    color: active ? ac : 'var(--text-muted)', fontFamily: 'inherit',
  })

  return (
    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>

        {/* Circle tools */}
        {circlesEnabled && (<>
          <button type="button" onClick={toggleCircle} style={annTbBtn(circleMode, '#dc2626', '#fee2e2')}>
            {circleMode ? '⭕ Drawing — click to stop' : '⭕ Draw circle'}
          </button>
          {/* Circle color swatches */}
          <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
            {CIRCLE_COLORS.map(c => (
              <button key={c.hex} type="button" title={c.name} onClick={() => setCircleColor(c.hex)}
                style={{ width: 15, height: 15, borderRadius: '50%', padding: 0, cursor: 'pointer',
                  background: c.hex, outline: 'none', flexShrink: 0,
                  border: circleColor === c.hex ? '2.5px solid #fff' : '2px solid transparent',
                  boxShadow: circleColor === c.hex ? `0 0 0 2px ${c.hex}` : 'none' }} />
            ))}
          </div>
        </>)}

        {/* Divider */}
        {circlesEnabled && linesEnabled && (
          <span style={{ color: 'var(--border)', fontSize: '0.9rem', userSelect: 'none' }}>│</span>
        )}

        {/* Line tools */}
        {linesEnabled && (<>
          <button type="button" onClick={toggleLine} style={annTbBtn(lineMode, '#2563eb', '#eff6ff')}>
            {lineMode ? (lineStart ? '🏹 Click endpoint…' : '🏹 Click start…') : '🏹 Draw line'}
          </button>
          {/* Thickness picker */}
          {LINE_THICKNESSES.map(t => (
            <button key={t.px} type="button" title={`${t.label} line`}
              onClick={() => setLineThick(t.px)}
              style={annTbBtn(lineThick === t.px, '#2563eb', '#eff6ff')}>
              {t.label}
            </button>
          ))}
          {/* Next-line color preview dot */}
          {lineMode && (
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: nextLineColor,
              display: 'inline-block', flexShrink: 0 }} title="Next line colour" />
          )}
        </>)}

        {/* Clear all */}
        {hasAnnotations && (
          <button type="button" style={{ ...annTbBtn(false), marginLeft: 'auto' }}
            onClick={() => { setCircles([]); setLines([]); setLineStart(null) }}>
            ✕ Clear all
          </button>
        )}
      </div>

      {/* Status hint */}
      {lineMode && lineStart && (
        <p style={{ fontSize: '0.71rem', color: '#2563eb', margin: '0 0 0.25rem', fontStyle: 'italic' }}>
          ● Start point set — now click the endpoint on the image
        </p>
      )}

      {/* ── Image + SVG overlay ── */}
      <div ref={wrapRef}
        style={{ position: 'relative', display: 'inline-block', maxWidth: '100%',
          cursor: circleMode ? 'crosshair' : lineMode ? 'cell' : 'default' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
        onClick={onClick}
        onMouseLeave={() => { setCircleDrawing(null); setLineMouse(null) }}>
        <img src={src} alt={alt} style={{ display: 'block', maxWidth: '100%', userSelect: 'none' }} draggable={false} />
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          overflow: 'visible', pointerEvents: activeMode ? 'none' : 'all' }}>
          <defs>
            {LINE_COLORS.map(c => {
              const mid = `${instanceId}-${c.replace('#','')}`
              return (
                <marker key={mid} id={mid} markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L9,3 z" fill={c} />
                </marker>
              )
            })}
          </defs>

          {/* Circles */}
          {circles.map((a, i) => (
            <ellipse key={`c${i}`}
              cx={`${a.cx}%`} cy={`${a.cy}%`} rx={`${a.rx}%`} ry={`${a.ry}%`}
              fill="none" stroke={a.color} strokeWidth="2.5"
              style={{ cursor: activeMode ? 'default' : 'pointer' }}
              onClick={() => !activeMode && setCircles(p => p.filter((_, j) => j !== i))} />
          ))}
          {previewEll && (
            <ellipse cx={`${previewEll.cx}%`} cy={`${previewEll.cy}%`}
              rx={`${previewEll.rx}%`} ry={`${previewEll.ry}%`}
              fill="none" stroke={circleColor} strokeWidth="2.5" strokeDasharray="6 3" />
          )}

          {/* Lines */}
          {lines.map((l, i) => {
            const mid = `${instanceId}-${l.color.replace('#','')}`
            return (
              <g key={`l${i}`} style={{ cursor: activeMode ? 'default' : 'pointer' }}
                onClick={() => !activeMode && setLines(p => p.filter((_, j) => j !== i))}>
                <circle cx={`${l.x1}%`} cy={`${l.y1}%`} r="4" fill={l.color} />
                <line x1={`${l.x1}%`} y1={`${l.y1}%`} x2={`${l.x2}%`} y2={`${l.y2}%`}
                  stroke={l.color} strokeWidth={l.thickness}
                  markerEnd={`url(#${mid})`} />
              </g>
            )
          })}

          {/* Line preview while hovering */}
          {lineMode && lineStart && lineMouse && (() => {
            const mid = `${instanceId}-${nextLineColor.replace('#','')}`
            return (
              <g>
                <circle cx={`${lineStart.x}%`} cy={`${lineStart.y}%`} r="4" fill={nextLineColor} />
                <line x1={`${lineStart.x}%`} y1={`${lineStart.y}%`}
                  x2={`${lineMouse.x}%`} y2={`${lineMouse.y}%`}
                  stroke={nextLineColor} strokeWidth={lineThick}
                  strokeDasharray="6 3" markerEnd={`url(#${mid})`} />
              </g>
            )
          })()}
        </svg>
      </div>
    </div>
  )
}

// ─── TestPlayer ───────────────────────────────────────────────
// Renders a placement test in an iframe. Intercepts the submit postMessage,
// saves results to Supabase, then shows a green checkmark confirmation.
export function TestPlayer({ assignment, studentId, onDone }) {
  const [testHtml,   setTestHtml]   = useState(null)
  const [submitted,  setSubmitted]  = useState(false)
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    const htmlFile = assignment?.test_id === 'hospitality_placement_v1'
      ? '/tests/hospitality_placement_v1.html'
      : '/tests/general_placement_v1.html'
    const testId = assignment?.test_id || 'general_placement_v1'
    fetch(htmlFile)
      .then(r => r.text())
      .then(html => {
        // Inject current (possibly edited) questions as override
        const currentQ = getEffectiveQuestions(testId)
        const varName = testId === 'hospitality_placement_v1' ? '__eph_questions' : '__ept_questions'
        const injected = `<script>window.${varName} = ${JSON.stringify(currentQ)};</script>\n` + html
        setTestHtml(injected)
      })
      .catch(() => setTestHtml(null))
  }, [])

  useEffect(() => {
    if (!assignment) return
    const handler = async (e) => {
      if (!e.data || e.data.type !== 'ept_submit') return
      setSaving(true)
      await submitTestResult(assignment.id, e.data.results)
      setSaving(false)
      setSubmitted(true)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [assignment])

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.25rem' }}>✅</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem' }}>Test completed!</h2>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: '440px', margin: '0 auto 1.5rem' }}>
          Your answers have been submitted. Your results will be evaluated and I will get back to you shortly.
        </p>
        <button className="btn-gold" style={{ padding: '0.6rem 1.5rem' }} onClick={onDone}>
          ← Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', padding: '0.5rem 0' }}>
        <button className="back-btn" onClick={onDone}>← Back</button>
        {saving && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Saving results…</span>}
      </div>
      {!testHtml ? (
        <div className="dashboard-loading">Loading test…</div>
      ) : (
        <iframe
          srcDoc={testHtml}
          title="English Placement Test"
          style={{ width: '100%', border: 'none', minHeight: '750px', display: 'block' }}
          sandbox="allow-scripts"
        />
      )}
    </div>
  )
}

// ─── PublicTestPage ───────────────────────────────────────────
// Public test page accessible via ?t=ASSIGNMENT_ID — no login required.
export function InlineExerciseContent({ exerciseId, exerciseCache, loadingExercises, demoAnswers, setDemoAnswers }) {
  if (!exerciseId) return null
  if (loadingExercises) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', margin: '0.5rem 0 0' }}>Loading exercise…</p>
  }
  const cached = exerciseCache[exerciseId]
  if (!cached) return null

  const questions  = cached.questions ?? []
  const answers    = demoAnswers[exerciseId] || {}
  const setAns     = (qId, val) => setDemoAnswers(prev => ({ ...prev, [exerciseId]: { ...(prev[exerciseId] || {}), [qId]: val } }))
  const resetAns   = () => setDemoAnswers(prev => ({ ...prev, [exerciseId]: {} }))
  const hasInteractive = questions.some(q => !['listening', 'viewing', 'speaking'].includes(q.type))

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
    <div>
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
            <AnnotatedImage key={i} src={src} alt={`Ref ${i + 1}`}
              circlesEnabled={cached.context_image_settings?.[i]?.circles !== false}
              linesEnabled={cached.context_image_settings?.[i]?.lines !== false}
            />
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
          onClick={resetAns}>↺ Reset answers</button>
      )}
    </div>
  )
}

// ─── StudentDashboard ─────────────────────────────────────────
export function parseWordChoiceTemplate(template) {
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
export function WordChoiceQuestion({ template, answer, onChange, disabled = false }) {
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

  // Split tokens into lines wherever a text token contains \n
  const lines = (() => {
    const result = [[]]
    tokens.forEach(tok => {
      if (tok.type === 'text') {
        const parts = tok.value.split('\n')
        parts.forEach((part, pi) => {
          if (pi > 0) result.push([]) // start a new line
          if (part) result[result.length - 1].push({ ...tok, value: part })
        })
      } else {
        result[result.length - 1].push(tok)
      }
    })
    return result.filter(line => line.length > 0)
  })()

  const renderToken = (tok, i) => {
    if (tok.type === 'text')
      return <span key={i} className="word-choice-text">{tok.value}</span>

    if (tok.type === 'choice') {
      const selected = current[tok.index]
      return (
        <span key={i} className="word-choice-group">
          {tok.options.map(opt => {
            const isSelected   = selected === opt
            const isEliminated = selected && selected !== opt
            return (
              <button key={opt} type="button" disabled={disabled}
                className={`word-choice-btn${isSelected ? ' word-choice-btn--selected' : ''}${isEliminated ? ' word-choice-btn--eliminated' : ''}`}
                onClick={() => !disabled && setChoice(tok.index, opt)}>
                {opt}
              </button>
            )
          })}
        </span>
      )
    }

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
  }

  return (
    <div className="word-choice-sentence">
      {lines.map((lineTokens, lineIdx) => (
        <div key={lineIdx} className="word-choice-line">
          {lineTokens.map((tok, i) => renderToken(tok, i))}
        </div>
      ))}
    </div>
  )
}

// ─── Fill-blank helpers ───────────────────────────────────────
// Parse student answer: JSON {"0":"word","1":"word2"} or legacy plain string
export function parseFillBlankAnswer(str) {
  if (!str) return {}
  try {
    const p = JSON.parse(str)
    if (typeof p === 'object' && !Array.isArray(p)) return p
    if (Array.isArray(p)) return Object.fromEntries(p.map((v, i) => [i, v]))
  } catch {}
  return { 0: str }
}
// Parse correct answer: JSON ["ans1","ans2"] or legacy plain string
export function parseFillBlankCorrect(str) {
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
export function InlineFillBlank({ prompt, answer, onChange, disabled = false, checked = false, correctAnswers = null }) {
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
export function FbBlankEditor({ src, blanks, onChange }) {
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

// Rotating colour palette for word-bank pills (builder + student views).
export const WORD_PILL_COLORS = [
  { bg: '#fde68a', border: '#f59e0b', text: '#78350f' }, // amber
  { bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a8a' }, // blue
  { bg: '#bbf7d0', border: '#22c55e', text: '#14532d' }, // green
  { bg: '#fbcfe8', border: '#ec4899', text: '#831843' }, // pink
  { bg: '#ddd6fe', border: '#8b5cf6', text: '#4c1d95' }, // purple
  { bg: '#fed7aa', border: '#f97316', text: '#7c2d12' }, // orange
  { bg: '#a5f3fc', border: '#06b6d4', text: '#164e63' }, // cyan
]

// ─── ImageOverlayWordBank ─────────────────────────────────────
// Word bank (above) + image with blank drop-zones. Students drag (or tap) a
// word into each blank. Each word is used once. Answer format matches the type
// mode: { blankIndex: "word" }.
export function ImageOverlayWordBank({ src, blanks, words, answers, onChange }) {
  const imgRef = useRef(null)
  const [renderedH, setRenderedH] = useState(0)
  const [selectedKey, setSelectedKey] = useState(null) // word index selected via tap
  const [dragOver, setDragOver] = useState(null)        // blank index hovered while dragging

  const updateH = () => { if (imgRef.current) setRenderedH(imgRef.current.clientHeight) }
  useEffect(() => {
    updateH()
    window.addEventListener('resize', updateH)
    return () => window.removeEventListener('resize', updateH)
  }, [src])

  const current = (() => { try { return JSON.parse(answers || '{}') } catch { return {} } })()

  // Remaining words = full list minus what's already placed (multiset, handles duplicates)
  const placedCounts = {}
  Object.values(current).forEach(w => { placedCounts[w] = (placedCounts[w] || 0) + 1 })
  const seen = {}
  const available = []
  words.forEach((w, i) => {
    seen[w] = (seen[w] || 0) + 1
    if (seen[w] > (placedCounts[w] || 0)) available.push({ word: w, key: i })
  })

  const blankFontSize = (b) => {
    if (!renderedH || !b.h) return 14
    return Math.min(24, Math.max(9, Math.round(renderedH * (b.h / 100) * 0.55)))
  }

  const placeWord = (blankIdx, word) => {
    onChange(JSON.stringify({ ...current, [blankIdx]: word }))
    setSelectedKey(null)
  }
  const clearBlank = (blankIdx) => {
    const next = { ...current }; delete next[blankIdx]
    onChange(JSON.stringify(next))
  }

  const onBlankClick = (blankIdx) => {
    if (current[blankIdx] != null) { clearBlank(blankIdx); return }   // tap filled → clear
    if (selectedKey != null) placeWord(blankIdx, words[selectedKey])  // tap empty w/ selection → place
  }

  return (
    <div>
      {/* Word bank (above the image) */}
      <div className="matching-bank" style={{ marginBottom: '0.75rem' }}>
        <p className="matching-bank-label">
          {available.length > 0 ? 'Drag a word into a gap (or tap a word, then tap a gap) ↓' : '✓ All words placed'}
        </p>
        <div className="matching-bank-items">
          {available.map(({ word, key }) => {
            const c = WORD_PILL_COLORS[key % WORD_PILL_COLORS.length]
            const sel = selectedKey === key
            return (
              <div key={key}
                className="matching-chip"
                draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', word)}
                onClick={() => setSelectedKey(sel ? null : key)}
                style={{
                  background: c.bg, color: c.text,
                  border: `1.5px solid ${c.border}`,
                  ...(sel ? { outline: '2px solid #1a2030', outlineOffset: '1px' } : {}),
                }}>
                {word}
              </div>
            )
          })}
        </div>
      </div>

      <div className="img-overlay-wrap">
        <img ref={imgRef} src={src} alt="Exercise" className="img-overlay-img" onLoad={updateH} />
        {blanks.map((b, i) => {
          const filled = current[i] != null
          const isOver = dragOver === i
          return (
            <div
              key={i}
              onClick={() => onBlankClick(i)}
              onDragOver={e => { e.preventDefault(); setDragOver(i) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => { e.preventDefault(); const w = e.dataTransfer.getData('text/plain'); if (w) placeWord(i, w); setDragOver(null) }}
              title={filled ? 'Tap to remove' : 'Tap a word, then tap here'}
              style={{
                position: 'absolute',
                left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxSizing: 'border-box',
                border: `2px solid ${isOver ? '#2563eb' : filled ? '#16a34a' : '#d4a853'}`,
                background: isOver ? 'rgba(37,99,235,0.18)' : filled ? 'rgba(22,163,74,0.16)' : 'rgba(212,168,83,0.12)',
                borderRadius: '4px',
                fontSize: `${blankFontSize(b)}px`,
                fontWeight: 600, color: '#1a2030', overflow: 'hidden', lineHeight: 1.1,
              }}>
              {filled ? current[i] : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ImageOverlayFill ─────────────────────────────────────────
// Shows an exercise image with absolutely-positioned <input> boxes
// placed over each detected blank. Students type directly on the image.
// When `words` is provided (word-bank mode) and interactive, delegates to
// ImageOverlayWordBank (drag/tap words into the gaps instead of typing).
export function ImageOverlayFill({ src, blanks, answers, onChange, disabled = false, words = null }) {
  const imgRef = useRef(null)
  const [renderedH, setRenderedH] = useState(0)

  const updateH = () => {
    if (imgRef.current) setRenderedH(imgRef.current.clientHeight)
  }

  useEffect(() => {
    updateH()
    window.addEventListener('resize', updateH)
    return () => window.removeEventListener('resize', updateH)
  }, [src])

  const current = (() => {
    try { return JSON.parse(answers || '{}') } catch { return {} }
  })()

  const setBlank = (i, val) =>
    onChange(JSON.stringify({ ...current, [i]: val }))

  // Per-blank font size: 60% of the blank's rendered pixel height, clamped 9–28px.
  // This keeps typed text proportional to the gap in the image regardless of image size.
  const blankFontSize = (b) => {
    if (!renderedH || !b.h) return 14
    return Math.min(28, Math.max(9, Math.round(renderedH * (b.h / 100) * 0.60)))
  }

  // Word-bank mode (interactive): delegate to the drag/tap component.
  if (words && words.length && !disabled) {
    return <ImageOverlayWordBank src={src} blanks={blanks} words={words} answers={answers} onChange={onChange} />
  }

  return (
    <div className="img-overlay-wrap">
      <img ref={imgRef} src={src} alt="Exercise" className="img-overlay-img"
        onLoad={updateH}
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
            fontSize: `${blankFontSize(b)}px`,
          }}
        />
      ))}
    </div>
  )
}

// ─── ExercisePlayer (student) ─────────────────────────────────
export function ExercisePlayer({ assignment, questions, studentId, onBack, onSubmitted, embedded = false }) {
  const ex = assignment.exercises
  const [answers, setAnswers] = useState({})
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [imageAnnotations, setImageAnnotations] = useState([]) // index → {circles,lines}

  const setAnswer = (qId, val) => setAnswers(prev => ({ ...prev, [qId]: val }))

  const allAnswered = questions.every(q => {
    if (q.type === 'listening' || q.type === 'viewing') return true
    if (q.type === 'matching') {
      if (!answers[q.id]) return false
      const isNewFmt = q.options && !Array.isArray(q.options) && q.options?.v === 2
      try {
        const matched = JSON.parse(answers[q.id])
        if (isNewFmt) {
          const leftLen = (q.options.left || []).length
          return leftLen > 0 && Array.from({length: leftLen}, (_, i) => matched[i]).every(v => v != null)
        }
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
    if (ok) {
      // Save any image annotations
      const hasAnn = imageAnnotations.some(a => a?.circles?.length || a?.lines?.length)
      if (hasAnn) saveExerciseAnnotations(assignment.id, imageAnnotations)
      if (embedded) {
        onSubmitted(assignment.id)
      } else {
        setDone(true)
        setTimeout(() => onSubmitted(assignment.id), 2200)
      }
    }
  }

  if (done && !embedded) {
    return (
      <div className="flow-card text-center">
        <span className="confirmation-icon" style={{ fontSize: '3rem' }}>✅</span>
        <h2>Submitted!</h2>
        <p className="flow-sub">Your teacher will review your answers and go through them with you in your next lesson.</p>
      </div>
    )
  }

  return (
    <div className={embedded ? '' : 'flow-card exercise-player-card'}>
      {!embedded && <button className="back-btn" onClick={onBack}>← Back to dashboard</button>}

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
          <div className="exercise-context-passage" dangerouslySetInnerHTML={{ __html: ex.context_text }} />
        </div>
      )}
      {/* ── Context images with annotation tools ── */}
      {ex?.context_images?.length > 0 && !(
        questions.length > 0 && questions[0].type === 'fill_blank' &&
        parseOverlayPrompt(questions[0].prompt)
      ) && (
        <div className="exercise-context-images">
          <p className="exercise-context-label">📖 Reference material</p>
          {ex.context_images.map((src, i) => (
            <div key={i} style={{ marginBottom: i < ex.context_images.length - 1 ? '0.75rem' : 0 }}>
              <AnnotatedImage
                src={src}
                alt={`Reference ${i + 1}`}
                circlesEnabled={ex.context_image_settings?.[i]?.circles !== false}
                linesEnabled={ex.context_image_settings?.[i]?.lines !== false}
                onAnnotationChange={(circles, lines) =>
                  setImageAnnotations(prev => {
                    const next = [...prev]
                    next[i] = { circles, lines }
                    return next
                  })
                }
              />
            </div>
          ))}
        </div>
      )}

      <div className="exercise-questions">
        {questions.map((q, idx) => {
          if (q.type === 'listening' || q.type === 'viewing' || q.type === 'speaking') return null

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
                    words={overlay.words || null}
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
            {q.type !== 'word_choice' && <p className="eq-prompt" dangerouslySetInnerHTML={{ __html: q.prompt }} />}
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

      {embedded ? (
        <div className="exercise-submit-row" style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e8e3d8' }}>
          {!allAnswered && <p className="exercise-submit-hint">Answer all questions before finishing.</p>}
          <button className="btn-gold btn-lg" disabled={!allAnswered || submitting} onClick={handleSubmit}>
            {submitting ? 'Saving…' : '✓ Finish Exercise'}
          </button>
        </div>
      ) : !confirming ? (
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
export function MatchingQuestion({ pairs, answer, onChange }) {
  const LETTERS = ['A','B','C','D','E','F','G','H','I','J']

  // Detect new format: pairs = { v:2, left: [], right: [] }
  const isNew = pairs && !Array.isArray(pairs) && pairs?.v === 2

  // ── All hooks must be called unconditionally (Rules of Hooks) ──
  // New-format state: shuffle right items once on mount, keep indices stable.
  const newRight = isNew ? (pairs.right || []) : []
  const [shuffledIdx] = useState(() => {
    const idx = newRight.map((_, i) => i)
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]]
    }
    return idx
  })
  // Legacy-format state: shuffle right values once on mount.
  const [rightShuffled] = useState(() => [...(!isNew ? (pairs || []) : []).map(p => p.right)].sort(() => Math.random() - 0.5))
  const [dragOver, setDragOver] = useState(null)
  // ── End of hooks ──────────────────────────────────────────────

  if (isNew) {
    const left  = pairs.left  || []
    const right = pairs.right || []
    // answer: JSON array where answer[leftIdx] = rightIdx or null
    const current = (() => { try { return answer ? JSON.parse(answer) : [] } catch { return [] } })()
    const usedRightIdx = current.filter(v => v != null)

    const setMatch = (li, ri) => {
      const arr = [...current]
      while (arr.length <= li) arr.push(null)
      // remove ri from any other position
      arr.forEach((v, i) => { if (v === ri) arr[i] = null })
      arr[li] = ri
      onChange(JSON.stringify(arr))
    }
    const clearMatch = (li) => {
      const arr = [...current]; arr[li] = null; onChange(JSON.stringify(arr))
    }

    return (
      <div className="matching-container">
        {/* Unmatched right items bank */}
        {shuffledIdx.filter(ri => !usedRightIdx.includes(ri)).length > 0 && (
          <div className="matching-bank" style={{ width: '100%' }}>
            <p className="matching-bank-label">Drag to match ↓</p>
            <div className="matching-bank-items">
              {shuffledIdx.filter(ri => !usedRightIdx.includes(ri)).map(ri => (
                <div key={ri} className="matching-chip"
                  draggable
                  onDragStart={e => e.dataTransfer.setData('text/plain', String(ri))}>
                  <strong style={{ color: '#2563eb', marginRight: '0.3rem' }}>{LETTERS[ri]}.</strong>{right[ri]}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="matching-pairs">
          {left.map((leftText, li) => {
            const matchedRi = current[li] != null ? current[li] : null
            const isOver = dragOver === li
            return (
              <div key={li} className="matching-pair-row">
                <div className="matching-left">
                  <strong style={{ color: 'var(--gold)', marginRight: '0.3rem' }}>{li+1}.</strong>{leftText}
                </div>
                <span className="matching-arrow">→</span>
                <div
                  className={`matching-drop${isOver ? ' drag-over' : ''}${matchedRi != null ? ' matched' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(li) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => { e.preventDefault(); const ri = parseInt(e.dataTransfer.getData('text/plain')); setMatch(li, ri); setDragOver(null) }}>
                  {matchedRi != null
                    ? <><span className="matching-chip matched-chip">
                        <strong style={{ color: '#2563eb', marginRight: '0.3rem' }}>{LETTERS[matchedRi]}.</strong>{right[matchedRi]}
                      </span>
                      <button className="matching-clear" onClick={() => clearMatch(li)}>✕</button></>
                    : <span className="matching-placeholder">Drop here…</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Legacy format (old pairs array) ──────────────────────────
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
    const next = { ...current }; delete next[leftVal]; onChange(JSON.stringify(next))
  }
  return (
    <div className="matching-container">
      {unmatched.length > 0 && (
        <div className="matching-bank">
          <p className="matching-bank-label">Drag to match ↓</p>
          <div className="matching-bank-items">
            {unmatched.map(r => (
              <div key={r} className="matching-chip" draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', r)}>{r}</div>
            ))}
          </div>
        </div>
      )}
      <div className="matching-pairs">
        {(pairs || []).map(pair => {
          const matched = current[pair.left]; const isOver = dragOver === pair.left
          return (
            <div key={pair.left} className="matching-pair-row">
              <div className="matching-left">{pair.left}</div>
              <span className="matching-arrow">→</span>
              <div className={`matching-drop${isOver ? ' drag-over' : ''}${matched ? ' matched' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(pair.left) }}
                onDragLeave={() => setDragOver(null)} onDrop={e => drop(e, pair.left)}>
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

// ─── EmbeddedMedia ────────────────────────────────────────────
// Embeds YouTube, renders <audio> for direct audio files, or
// falls back to a plain link. Used during live screen-share lessons.
export function EmbeddedMedia({ url, label }) {
  if (!url) return null

  // Detect YouTube URLs
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  )
  if (ytMatch) {
    const videoId = ytMatch[1]
    const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
    return (
      <div className="embedded-media-block">
        <span className="exercise-context-label">{label || '🎥 Watch / Listen'}</span>
        <div className="embedded-yt-wrapper">
          <iframe
            src={embedUrl}
            title="Embedded video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    )
  }

  // Detect direct audio file links
  const isAudio = /\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(url)
  if (isAudio) {
    return (
      <div className="embedded-media-block">
        <span className="exercise-context-label">{label || '🎧 Listen first'}</span>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls src={url} style={{ width: '100%', marginTop: '0.5rem' }} />
      </div>
    )
  }

  // Fallback — plain link (opens in new tab)
  return (
    <div className="embedded-media-block">
      <span className="exercise-context-label">{label || '🎧 Listen / Watch'}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="exercise-audio-link">
        Open audio / video →
      </a>
    </div>
  )
}

// ─── RichTextEditor ───────────────────────────────────────────
export const RTE_COLORS = [
  { name: 'Black',  hex: '#1a1a1a' },
  { name: 'Red',    hex: '#dc2626' },
  { name: 'Green',  hex: '#16a34a' },
  { name: 'Blue',   hex: '#2563eb' },
  { name: 'Yellow', hex: '#ca8a04' },
]

export function RichTextEditor({ value = '', onChange, placeholder, minHeight = '80px', className = '', style = {}, resizable = false }) {
  const ref      = useRef(null)
  const skipSync = useRef(false)
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false })

  useLayoutEffect(() => {
    if (!ref.current || skipSync.current) return
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value
    }
  })

  useEffect(() => {
    const update = () => {
      if (!ref.current) return
      // Only update when our editor is focused
      const active = document.activeElement
      if (active !== ref.current && !ref.current.contains(active)) return
      setFmt({
        bold:      document.queryCommandState('bold'),
        italic:    document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
      })
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
    // Re-check format state after execCommand
    setFmt({
      bold:      document.queryCommandState('bold'),
      italic:    document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    })
  }

  return (
    <div className={`rte-wrapper ${className}`} style={style}>
      <div className="rte-toolbar">
        <button type="button" className={`rte-btn rte-b${fmt.bold ? ' rte-active' : ''}`} title="Bold"
          onMouseDown={e => { e.preventDefault(); exec('bold') }}>B</button>
        <button type="button" className={`rte-btn rte-i${fmt.italic ? ' rte-active' : ''}`} title="Italic"
          onMouseDown={e => { e.preventDefault(); exec('italic') }}>I</button>
        <button type="button" className={`rte-btn rte-u${fmt.underline ? ' rte-active' : ''}`} title="Underline"
          onMouseDown={e => { e.preventDefault(); exec('underline') }}>U</button>
        <span className="rte-sep" />
        {RTE_COLORS.map(c => (
          <button key={c.hex} type="button" className="rte-color-dot" title={c.name}
            style={{ background: c.hex }}
            onMouseDown={e => { e.preventDefault(); exec('foreColor', c.hex) }} />
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="rte-content"
        data-placeholder={placeholder}
        style={{ minHeight, ...(resizable ? { resize: 'vertical', overflow: 'auto' } : {}) }}
        onInput={emit}
        onBlur={emit}
      />
    </div>
  )
}

// ─── NotesSection ─────────────────────────────────────────────
// Per-exercise (or plan-level) notes panel shown during live lessons.
// Teacher and student can both read and write notes.
export function NotesSection({ planId, exerciseId = null, authorId, authorEmail }) {
  const [notes,    setNotes]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [text,     setText]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [expanded, setExpanded] = useState(true)

  // Load notes whenever planId / exerciseId changes
  useEffect(() => {
    if (!planId) { setLoading(false); return }
    setLoading(true)
    fetchNotesForExercise(planId, exerciseId).then(data => {
      setNotes(data)
      setLoading(false)
    })
  }, [planId, exerciseId])

  const handleSave = async () => {
    const stripped = text.replace(/<[^>]*>/g, '').trim()
    if (!stripped || !authorId) return
    setSaving(true)
    const saved = await saveNote({ planId, exerciseId, authorId, content: text })
    setSaving(false)
    if (saved) {
      // Attach a minimal author object so the note renders immediately
      setNotes(prev => [...prev, { ...saved, author: { id: authorId, email: authorEmail } }])
      setText('')
    }
  }

  const handleDelete = async (noteId) => {
    const ok = await deleteNote(noteId)
    if (ok) setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const displayName = (note) => {
    const meta = note.author?.raw_user_meta_data
    return meta?.name || meta?.full_name || note.author?.email || 'Unknown'
  }

  if (!planId) return null

  return (
    <div className="notes-section no-print">
      <button
        className="notes-section-toggle"
        onClick={() => setExpanded(p => !p)}
      >
        📝 Lesson notes {notes.length > 0 && <span className="notes-count-chip">{notes.length}</span>}
        <span style={{ marginLeft: 'auto', opacity: 0.6, fontSize: '0.75rem' }}>{expanded ? '▲ hide' : '▼ show'}</span>
      </button>

      {expanded && (
        <div className="notes-section-body">
          {/* Existing notes */}
          {loading ? (
            <p className="notes-empty">Loading notes…</p>
          ) : notes.length === 0 ? (
            <p className="notes-empty">No notes yet for this exercise. Add the first one below.</p>
          ) : (
            <div className="notes-list">
              {notes.map(note => (
                <div key={note.id} className="note-item">
                  <div className="note-item-header">
                    <span className="note-author">{displayName(note)}</span>
                    <span className="note-time">{formatTime(note.created_at)}</span>
                    {note.author_id === authorId && (
                      <button
                        className="note-delete-btn"
                        title="Delete this note"
                        onClick={() => handleDelete(note.id)}
                      >✕</button>
                    )}
                  </div>
                  <div className="note-content" dangerouslySetInnerHTML={{ __html: note.content }} />
                </div>
              ))}
            </div>
          )}

          {/* New note input */}
          <div className="notes-input-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <RichTextEditor
              value={text}
              onChange={v => setText(v)}
              placeholder="Write a note for this exercise…"
              minHeight="64px"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
              <button
                className="btn-gold notes-save-btn"
                disabled={saving || !text.replace(/<[^>]*>/g, '').trim()}
                onClick={handleSave}
              >
                {saving ? '…' : 'Save note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ExerciseDemoPlayer (admin — interactive preview) ─────────
export function ExerciseDemoPlayer({ exercise, questions, onBack, embedded = false, lessonPlanId = null, authorId = null, authorEmail = null }) {
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
    : t === 'speaking'      ? 'Speaking'
    : 'Written answer'

  const inner = (
    <>
      <button className="back-btn" onClick={onBack}>{embedded ? '← Back to plan' : '← Back to library'}</button>
      <div className="exercise-demo-badge">🎓 Preview / Demo mode</div>
      <div className="exercise-player-header">
        <h2>{exercise?.title}</h2>
        {exercise?.description && <p className="flow-sub">{exercise.description}</p>}
      </div>

      {exercise?.audio_url && (
        <EmbeddedMedia url={exercise.audio_url} label="🎧 Listen first" />
      )}
      {exercise?.context_text && (
        <div className="exercise-context-text">
          <p className="exercise-context-label">📖 Read this first</p>
          <div className="exercise-context-passage">{exercise.context_text}</div>
        </div>
      )}
      {exercise?.context_images?.length > 0 && !(
        questions?.length > 0 && questions[0].type === 'fill_blank' &&
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
          if (q.type === 'listening' || q.type === 'viewing' || q.type === 'speaking') return null

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
                    words={overlay.words || null}
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
              {q.type !== 'word_choice' && q.type !== 'fill_blank' && <p className="eq-prompt" dangerouslySetInnerHTML={{ __html: q.prompt }} />}
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

      {questions?.length > 0 && !questions.every(q => q.type === 'listening' || q.type === 'viewing') && (
        <div className="exercise-submit-row">
          <button className="btn-ghost" onClick={() => setAnswers({})}>
            ↺ Reset
          </button>
        </div>
      )}

      {lessonPlanId && (
        <NotesSection
          planId={lessonPlanId}
          exerciseId={exercise?.id ?? null}
          authorId={authorId}
          authorEmail={authorEmail}
        />
      )}
    </>
  )

  if (embedded) return inner
  return <div className="flow-card exercise-player-card">{inner}</div>
}

// ─── VocabCaptureBar ──────────────────────────────────────────
export function VocabCaptureBar({ exerciseId, studentId }) {
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
export function StudentSubmissionReview({ assignment, questions, answerMap, onBack, backLabel = '← Back to dashboard' }) {
  const ex = assignment.exercises

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
    <div className="flow-card exercise-player-card">
      <div className="submission-review-toolbar no-print">
        <button className="back-btn" onClick={onBack}>{backLabel}</button>
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
          if (q.type === 'listening' || q.type === 'viewing' || q.type === 'speaking') return null
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

          const matchIsNew = q.type === 'matching' && q.options && !Array.isArray(q.options) && q.options?.v === 2
          const LTRS = ['A','B','C','D','E','F','G','H','I','J']

          return (
            <div key={q.id} className="exercise-question">
              <div className="eq-label">
                <span className="eq-num">Q{idx + 1}</span>
                <span className="eq-type">{typeLabel(q.type)}</span>
                {sa?.is_correct === true  && <span className="demo-mark demo-mark--correct" style={{marginLeft:'auto'}}>✓ Correct</span>}
                {sa?.is_correct === false && <span className="demo-mark demo-mark--wrong"   style={{marginLeft:'auto'}}>✗ Incorrect</span>}
              </div>
              {q.type !== 'word_choice' && q.type !== 'fill_blank' && <p className="eq-prompt" dangerouslySetInnerHTML={{ __html: q.prompt }} />}

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
                      const studentAns = JSON.parse(sa.answer)
                      if (matchIsNew) {
                        const left = q.options.left || [], right = q.options.right || []
                        return left.map((lText, li) => {
                          const ri = studentAns[li] ?? null
                          return (
                            <div key={li} className="review-match-row">
                              <span><strong>{li+1}.</strong> {lText}</span><span>→</span>
                              <span>{ri != null ? <><strong style={{color:'#2563eb'}}>{LTRS[ri]}.</strong> {right[ri]}</> : <em style={{color:'var(--text-dim)'}}>not matched</em>}</span>
                            </div>
                          )
                        })
                      }
                      return (q.options||[]).map(p => (
                        <div key={p.left} className="review-match-row">
                          <span>{p.left}</span><span>→</span>
                          <span>{studentAns[p.left] || <em style={{color:'var(--text-dim)'}}>not matched</em>}</span>
                        </div>
                      ))
                    } catch { return <em>Error reading answer</em> } })()}
                  </div>
                ) : (
                  <div className={`review-answer-box ${!sa?.answer?.trim() ? 'review-answer-empty' : ''}`}>
                    {sa?.answer?.trim() || <em>No answer given</em>}
                  </div>
                )}
                {sa?.teacher_comment && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: '#1e40af',
                    background: '#eff6ff', borderRadius: '6px', padding: '0.35rem 0.6rem',
                    border: '1px solid #bfdbfe' }}>
                    💬 <strong>Note:</strong> {sa.teacher_comment}
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
