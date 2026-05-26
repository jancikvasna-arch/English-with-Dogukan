/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  content.js — All editable site content in one place
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  HOW TO EDIT (no coding required):
 *  1. Open this file on GitHub (github.com → your repo → src/content.js)
 *  2. Click the pencil icon (Edit this file) in the top-right
 *  3. Change the text you want to update — be careful to keep the quotes intact
 *  4. Click "Commit changes" at the bottom — the site updates automatically
 *
 *  RULES:
 *  - Text values are always wrapped in single quotes: 'Like this'
 *  - If the text itself contains an apostrophe (e.g. "won't"), use a
 *    backslash before it:  'You won\'t regret it'
 *  - Do NOT remove commas, brackets, or curly braces { }
 *  - Do NOT change the names on the left side of the colon (e.g. "title:")
 *  ─────────────────────────────────────────────────────────────────────────────
 */

// ─── WhatsApp ──────────────────────────────────────────────────────────────────
// Set your WhatsApp number here (include country code, no spaces or dashes).
// Example: '+447911123456'  or  '+905551234567'
// Leave as '' to hide the WhatsApp button.
export const WHATSAPP_NUMBER = ''

// ─── About Me ─────────────────────────────────────────────────────────────────
export const ABOUT = {
  paragraphs: [
    'I am a certified English language teacher with a CELTA qualification obtained from International House, London — one of the most respected teacher training centres in the world. I teach Elementary, Intermediate and Advanced level classes, following the latest methodologies and learning materials published by Oxford University Press and Cambridge University Press.',
    'My lessons place a strong emphasis on speaking and real-life communication, drawing on a communicative approach that gets you using English from the very first class, so you won\'t be learning just grammar. Whether you are looking to improve your everyday communication, prepare for an exam, or build confidence in professional settings, I offer tailored lessons designed around your specific goals.',
    'With years of experience in higher education in international contexts, I bring curiosity, patience, and a structured approach to every lesson. Get in touch to book a free introductory session and start your learning journey today.',
  ],
  credentials: [
    'CELTA — International House, London',
    'Oxford University Press & Cambridge University Press',
  ],
}

// ─── How It Works steps ───────────────────────────────────────────────────────
export const HOW_IT_WORKS_STEPS = [
  {
    num: '1',
    title: 'Tell me about your learning needs',
    desc: 'Please answer a few quick questions or book a free 15-minute consultation call. I will use your answers to understand your exact needs and design your trial lesson, should you request one.',
  },
  {
    num: '2',
    title: 'Free Level Test',
    desc: '12 questions, about 10 minutes. Helps pinpoint your exact level. Completely optional.',
  },
  {
    num: '3',
    title: 'Your first lesson is free',
    desc: 'A 60-minute lesson built specifically around what you told me. No payment, no commitment — just good teaching.',
  },
  {
    num: '4',
    title: 'Start your course',
    desc: 'If you enjoyed it, choose a lesson package and start making real, measurable progress.',
  },
]

// ─── Pricing ──────────────────────────────────────────────────────────────────
export const PRICING_PLANS = [
  {
    name: 'Free first lesson',
    price: '£0',
    per: 'no commitment',
    desc: 'Try before you commit. A 60-minute lesson designed around you — no payment required.',
    features: ['60-minute lesson', 'Built around your goals', 'No credit card needed'],
    cta: 'Get started',
    featured: false,
  },
  {
    name: 'Pay as you go',
    price: '£40',
    per: 'per lesson',
    desc: 'Full flexibility. Pay per lesson, cancel or pause anytime.',
    features: [
      '60-minute lessons',
      'Lesson notes & resources',
      'WhatsApp support between lessons',
      'Flexible scheduling',
    ],
    cta: 'Book now',
    featured: true,
  },
  {
    name: 'Lesson bundle',
    price: '£420',
    per: '12 lessons',
    desc: 'Best value. Commit to consistent progress and save £60.',
    features: [
      '12 × 60-minute lessons',
      'Personalised learning plan',
      'Progress tracking',
      'Priority scheduling',
      'Save £60 vs pay-as-you-go',
    ],
    cta: 'Book bundle',
    featured: false,
  },
]

// ─── Courses ──────────────────────────────────────────────────────────────────
export const COURSES_DATA = [
  {
    name: 'Elementary English',
    tag: 'A1 → A2',
    color: '#3b82f6',
    desc: 'Build a solid foundation in English. Covers essential grammar, vocabulary, and communication skills for everyday situations.',
    schedule: '6 weeks · 2 lessons/week · 90 min/lesson',
    modules: [
      {
        title: 'Module 1 — Getting Started (Lessons 1–2)',
        lessons: [
          'Lesson 1: Greetings, introductions, alphabet, numbers 1–20',
          'Lesson 2: Countries & nationalities, verb to be (I am / You are / He is)',
        ],
      },
      {
        title: 'Module 2 — People & Descriptions (Lessons 3–4)',
        lessons: [
          'Lesson 3: Family members, possessive adjectives (my, your, his, her)',
          'Lesson 4: Physical descriptions, adjectives, verb to have (She has brown hair)',
        ],
      },
      {
        title: 'Module 3 — Daily Life (Lessons 5–6)',
        lessons: [
          'Lesson 5: Jobs & workplaces, present simple (I work / She works)',
          'Lesson 6: Daily routines, time expressions (at 7am, every day, usually)',
        ],
      },
      {
        title: 'Module 4 — Places & Movement (Lessons 7–8)',
        lessons: [
          'Lesson 7: Places in a city, there is / there are, prepositions of place',
          'Lesson 8: Directions & transport, can for ability/requests',
        ],
      },
      {
        title: 'Module 5 — Food & Shopping (Lessons 9–10)',
        lessons: [
          'Lesson 9: Food & drink, countable/uncountable nouns, some / any',
          'Lesson 10: Shopping, prices, would like, polite requests',
        ],
      },
      {
        title: 'Module 6 — Past & Future (Lessons 11–12)',
        lessons: [
          'Lesson 11: Past simple (was/were + regular verbs), talking about yesterday/last week',
          'Lesson 12: Future plans (going to), review + end-of-course activity',
        ],
      },
    ],
  },
  {
    name: 'Intermediate English',
    tag: 'B1 → B2',
    color: '#d4a853',
    desc: 'Expand your grammar, fluency, and confidence. From telling stories to discussing opinions — structured progress at an intermediate level.',
    schedule: '6 weeks · 2 lessons/week · 90 min/lesson',
    modules: [
      {
        title: 'Module 1 — Identity & Experience (Lessons 1–2)',
        lessons: [
          'Lesson 1: Talking about yourself, present simple vs. continuous review, frequency adverbs',
          'Lesson 2: Life experiences, present perfect (have you ever…?), past simple contrast',
        ],
      },
      {
        title: 'Module 2 — Storytelling & the Past (Lessons 3–4)',
        lessons: [
          'Lesson 3: Narrative tenses — past simple, past continuous (was doing when…)',
          'Lesson 4: Past perfect (had already left), sequencing a story, time linkers',
        ],
      },
      {
        title: 'Module 3 — People & Relationships (Lessons 5–6)',
        lessons: [
          'Lesson 5: Describing personality, comparative & superlative adjectives, intensifiers',
          'Lesson 6: Relationships & social language, verb patterns (want someone to / enjoy -ing)',
        ],
      },
      {
        title: 'Module 4 — Work & Ambition (Lessons 7–8)',
        lessons: [
          'Lesson 7: Jobs & career, present perfect continuous (I\'ve been working here for…)',
          'Lesson 8: Future forms — will, going to, present continuous for arrangements, predictions',
        ],
      },
      {
        title: 'Module 5 — World & Society (Lessons 9–10)',
        lessons: [
          'Lesson 9: Passives (present & past), news topics, formal vs. informal register',
          'Lesson 10: Conditionals — zero, first, and second (If I had more time, I would…)',
        ],
      },
      {
        title: 'Module 6 — Opinions & Reflection (Lessons 11–12)',
        lessons: [
          'Lesson 11: Modal verbs for obligation, advice & speculation (must, should, might, can\'t)',
          'Lesson 12: Reported speech basics, review + debate or discussion task',
        ],
      },
    ],
  },
  {
    name: 'Business English',
    tag: 'Elementary or Intermediate level',
    color: '#10b981',
    desc: 'Professional English for the workplace. Emails, meetings, presentations, negotiations — lessons built around what you actually need at work.',
    schedule: '6 weeks · 2 lessons/week · 90 min/lesson',
    modules: [
      {
        title: 'Module 1 — Professional Identity (Lessons 1–2)',
        lessons: [
          'Lesson 1: Introductions & small talk, professional register, company descriptions (We specialize in / Our core business is)',
          'Lesson 2: Talking about your role & responsibilities, present simple & continuous in professional contexts, workplace vocabulary',
        ],
      },
      {
        title: 'Module 2 — Communication at Work (Lessons 3–4)',
        lessons: [
          'Lesson 3: Business emails — structure, tone, formality levels; functional phrases for requests, follow-ups, and apologies',
          'Lesson 4: Telephoning & video calls — opening/closing calls, clarifying & confirming, dealing with problems on a call',
        ],
      },
      {
        title: 'Module 3 — Meetings & Negotiations (Lessons 5–6)',
        lessons: [
          'Lesson 5: Meeting language — agreeing/disagreeing diplomatically, interrupting politely, making & responding to suggestions',
          'Lesson 6: Negotiation basics — conditionals in negotiation (If you could lower the price, we would…), compromise language, win-win framing',
        ],
      },
      {
        title: 'Module 4 — Data & Presentations (Lessons 7–8)',
        lessons: [
          'Lesson 7: Describing trends & data — graphs, charts, numbers; language of change (rose sharply, fell slightly, remained stable)',
          'Lesson 8: Presentations — structuring a talk, signposting language (Moving on to… / To summarize…), handling Q&A',
        ],
      },
      {
        title: 'Module 5 — Business Topics (Lessons 9–10)',
        lessons: [
          'Lesson 9: Marketing & branding — target audience, USPs, passive voice in professional writing (The product was launched / is sold in…)',
          'Lesson 10: HR & recruitment — job ads, interview language, modal verbs for requirements & expectations (must, should, be expected to)',
        ],
      },
      {
        title: 'Module 6 — Strategy & Review (Lessons 11–12)',
        lessons: [
          'Lesson 11: Business plans & future strategies — future forms (will, going to, planning to), problem-solution structures, SWOT discussion',
          'Lesson 12: Case study or role-play — full simulation (pitch, negotiation, or meeting), error correction, course review',
        ],
      },
    ],
  },
]
