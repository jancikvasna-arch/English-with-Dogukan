// ── Shared constants and utilities ──────────────────────────
// Imported by App.jsx, PublicPages.jsx, ExerciseComponents.jsx, AdminApp.jsx
import { fetchAllCourses } from './supabase.js'

export const ADMIN_EMAIL = 'dogukan.cy@gmail.com'

export const LABEL_COLORS = [
  { value: '#d4a853', label: 'Gold'   },
  { value: '#60a5fa', label: 'Blue'   },
  { value: '#4ade80', label: 'Green'  },
  { value: '#f87171', label: 'Red'    },
  { value: '#c084fc', label: 'Purple' },
  { value: '#fb923c', label: 'Orange' },
  { value: '#2dd4bf', label: 'Teal'   },
  { value: '#9ca3af', label: 'Gray'   },
]

// Banner colours for the lesson-plan title (Teach + student views). 10 options.
export const LESSON_TITLE_COLORS = [
  { value: '#1c2a3a', label: 'Navy'   },
  { value: '#006699', label: 'Teal'   },
  { value: '#1d4ed8', label: 'Blue'   },
  { value: '#15803d', label: 'Green'  },
  { value: '#0f766e', label: 'Pine'   },
  { value: '#b45309', label: 'Amber'  },
  { value: '#c2410c', label: 'Orange' },
  { value: '#b91c1c', label: 'Red'    },
  { value: '#be185d', label: 'Pink'   },
  { value: '#6d28d9', label: 'Purple' },
]
export const DEFAULT_LESSON_TITLE_COLOR = '#1c2a3a'

export function parseOverlayPrompt(prompt) {
  try {
    const p = JSON.parse(prompt || '')
    if (p && p.overlay === true && Array.isArray(p.blanks)) return p
  } catch {}
  return null
}

// Should the exercise's audio/video link be shown to the student?
//  • show_link_to_student === true  → always show
//  • show_link_to_student === false → always hide
//  • null/undefined (legacy)        → show only for listening/viewing activities
export function exerciseLinkVisibleToStudent(ex, questions = null) {
  if (!ex) return false
  const v = ex.show_link_to_student
  if (v === true) return true
  if (v === false) return false
  const qs = questions || ex.questions || []
  return qs.some(q => q && (q.type === 'listening' || q.type === 'viewing'))
}

// ── Admin courses cache (module-level, shared between App and AdminApp) ──
let _adminCoursesCache = []
export function getAdminCourses() { return _adminCoursesCache }
export function setAdminCoursesCache(courses) { _adminCoursesCache = courses }
export async function loadAdminCoursesCache() {
  try {
    const courses = await fetchAllCourses()
    _adminCoursesCache = courses
  } catch {
    try {
      const stored = localStorage.getItem('admin_courses_v1')
      if (stored && _adminCoursesCache.length === 0) _adminCoursesCache = JSON.parse(stored)
    } catch {}
  }
}

// ── Test question banks ──────────────────────────────────────
export const GENERAL_PLACEMENT_QUESTIONS = [
  /* ── A2 ELEMENTARY (Q1–10) ─────────────────────────── */
  /* 1 */ {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"My sister _____ in a hospital. She's a doctor.",
    options:["work","works","is work","working"],answer:1,
    tenseTag:"present_simple",grammarTag:"subject_verb_agreement",vocab:false,writing:false},
  /* 2 */ {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"Look at those clouds! It _____ to rain.",
    options:["is going","goes","will going","go"],answer:0,
    tenseTag:"going_to_future",grammarTag:"going_to_future",vocab:false,writing:false},
  /* 3 */ {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"Sorry, I can't talk right now — I _____ dinner.",
    options:["make","makes","am making","made"],answer:2,
    tenseTag:"present_continuous",grammarTag:"present_continuous",vocab:false,writing:false},
  /* 4 */ {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"We _____ a great film at the cinema last Saturday.",
    options:["see","are seeing","have seen","saw"],answer:3,
    tenseTag:"past_simple",grammarTag:"past_simple_regular_irregular",vocab:false,writing:false},
  /* 5 */ {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"This jacket is _____ than the one I tried on first.",
    options:["more cheap","cheapest","cheaper","most cheap"],answer:2,
    tenseTag:null,grammarTag:"comparatives_superlatives",vocab:false,writing:false},
  /* 6 */ {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"She _____ speak three languages — it's really impressive.",
    options:["can","cans","is able","does"],answer:0,
    tenseTag:null,grammarTag:"modal_can_ability",vocab:false,writing:false},
  /* 7 */ {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"There's _____ milk left in the fridge — we need to buy some.",
    options:["a few","many","a little","few"],answer:2,
    tenseTag:null,grammarTag:"quantifiers_countable_uncountable",vocab:false,writing:false},
  /* 8 */ {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"My birthday is _____ June, _____ the 14th.",
    options:["in / on","on / in","at / on","in / at"],answer:0,
    tenseTag:null,grammarTag:"prepositions_time",vocab:false,writing:false},
  /* 9 */ {section:"Elementary vocabulary",cefr:"A2",level:1,type:"mc",
    vocab:true,writing:false,tenseTag:null,grammarTag:null,
    prompt:"Choose the word that means <strong>to look at something for a long time</strong>:",
    options:["stare","listen","touch","smell"],answer:0},
  /* 10 */ {section:"Elementary vocabulary",cefr:"A2",level:1,type:"mc",
    vocab:true,writing:false,tenseTag:null,grammarTag:null,
    prompt:"Which word completes the sentence? <em>Can you _____ me how to get to the station?</em>",
    options:["say","speak","tell","talk"],answer:2},
  /* ── B1 LOWER INTERMEDIATE (Q11–27) ────────────────── */
  /* 11 */ {section:"Present perfect",cefr:"B1",level:2,type:"mc",
    prompt:"I _____ sushi before — last night was the first time!",
    options:["never ate","have never eaten","never eat","had never eaten"],answer:1,
    tenseTag:"present_perfect",grammarTag:"present_perfect_ever_never",vocab:false,writing:false},
  /* 12 */ {section:"Present perfect",cefr:"B1",level:2,type:"mc",
    prompt:"<strong>A:</strong> <em>Is the report ready?</em><br><strong>B:</strong> Not yet — I _____ it yet.",
    options:["didn't finish","haven't finished","don't finish","hadn't finished"],answer:1,
    tenseTag:"present_perfect",grammarTag:"present_perfect_yet_already",vocab:false,writing:false},
  /* 13 */ {section:"Past tenses",cefr:"B1",level:2,type:"mc",
    prompt:"We _____ to the park when it suddenly started to snow.",
    options:["walked","were walking","have walked","had walked"],answer:1,
    tenseTag:"past_continuous",grammarTag:"past_continuous_interrupted",vocab:false,writing:false},
  /* 14 */ {section:"Past tenses",cefr:"B1",level:2,type:"mc",
    prompt:"When I arrived at the party, most guests _____ already.",
    options:["left","were leaving","have left","had left"],answer:3,
    tenseTag:"past_perfect",grammarTag:"past_perfect_narrative",vocab:false,writing:false},
  /* 15 */ {section:"Past habits",cefr:"B1",level:2,type:"mc",
    prompt:"My grandfather _____ walk five kilometres to school every day when he was young.",
    options:["was used to","used to","would used to","use to"],answer:1,
    tenseTag:null,grammarTag:"used_to_past_habits",vocab:false,writing:false},
  /* 16 */ {section:"Future forms",cefr:"B1",level:2,type:"mc",
    prompt:"I think it _____ a lot warmer by the end of the week.",
    options:["is getting","gets","will get","is going to getting"],answer:2,
    tenseTag:"will_future",grammarTag:"will_future_prediction",vocab:false,writing:false},
  /* 17 */ {section:"First conditional",cefr:"B1",level:2,type:"mc",
    prompt:"If you _____ enough sleep, you'll feel much better tomorrow.",
    options:["get","will get","got","would get"],answer:0,
    tenseTag:null,grammarTag:"first_conditional",vocab:false,writing:false},
  /* 18 */ {section:"Second conditional",cefr:"B1",level:2,type:"mc",
    prompt:"If I _____ more free time, I would take up painting.",
    options:["have","will have","had","would have"],answer:2,
    tenseTag:null,grammarTag:"second_conditional",vocab:false,writing:false},
  /* 19 */ {section:"Modal verbs",cefr:"B1",level:2,type:"mc",
    prompt:"You really _____ see a doctor — that cough has lasted two weeks.",
    options:["must","should","can","shall"],answer:1,
    tenseTag:null,grammarTag:"modal_should_advice",vocab:false,writing:false},
  /* 20 */ {section:"Modal verbs",cefr:"B1",level:2,type:"mc",
    prompt:"Take an umbrella — it _____ rain later, I'm not sure.",
    options:["should","must","might","shall"],answer:2,
    tenseTag:null,grammarTag:"modal_might_possibility",vocab:false,writing:false},
  /* 21 */ {section:"Verb patterns",cefr:"B1",level:2,type:"mc",
    prompt:"Would you mind _____ the window? It's getting cold.",
    options:["to close","close","closing","closed"],answer:2,
    tenseTag:null,grammarTag:"gerund_after_verbs",vocab:false,writing:false},
  /* 22 */ {section:"Verb patterns",cefr:"B1",level:2,type:"mc",
    prompt:"She decided _____ a new language after her trip to Japan.",
    options:["learning","learn","to learn","learned"],answer:2,
    tenseTag:null,grammarTag:"infinitive_after_verbs",vocab:false,writing:false},
  /* 23 */ {section:"Passive voice",cefr:"B1",level:2,type:"mc",
    prompt:"The new sports centre _____ by the mayor last Friday.",
    options:["was opened","is opened","opened","has opened"],answer:0,
    tenseTag:"past_simple",grammarTag:"passive_past_simple",vocab:false,writing:false},
  /* 24 */ {section:"Passive voice",cefr:"B1",level:2,type:"mc",
    prompt:"English _____ as the main language of instruction at this school.",
    options:["uses","used","is used","is using"],answer:2,
    tenseTag:"present_simple",grammarTag:"passive_present_simple",vocab:false,writing:false},
  /* 25 */ {section:"Reported speech",cefr:"B1",level:2,type:"mc",
    prompt:"\"I'm feeling tired,\" he said.<br>He said he _____ tired.",
    options:["is feeling","feels","was feeling","had felt"],answer:2,
    tenseTag:"past_continuous",grammarTag:"reported_speech_backshift",vocab:false,writing:false},
  /* 26 */ {section:"Present perfect continuous",cefr:"B1",level:2,type:"mc",
    prompt:"She _____ for this company for nearly three years now.",
    options:["works","has worked","has been working","is working"],answer:2,
    tenseTag:"present_perfect_continuous",grammarTag:"present_perfect_continuous",vocab:false,writing:false},
  /* 27 */ {section:"B1 vocabulary",cefr:"B1",level:2,type:"mc",
    vocab:true,writing:false,tenseTag:null,grammarTag:null,
    prompt:"Choose the correct word: <em>The company has made a _____ to reduce its carbon emissions by 2030.</em>",
    options:["promise","commitment","deal","contract"],answer:1},
  /* ── B1 WORD FORMS (Q28–29) ─────────────────────────── */
  /* 28 */ {section:"Word forms",cefr:"B1",level:2,type:"mc",
    vocab:true,writing:false,tenseTag:null,grammarTag:null,
    prompt:"<em>The team's _____ (perform) in the final was outstanding.</em>",
    options:["perform","performance","performer","performed"],answer:1},
  /* 29 */ {section:"Word forms",cefr:"B1",level:2,type:"mc",
    vocab:true,writing:false,tenseTag:null,grammarTag:null,
    prompt:"<em>Living in a big city can be very _____ (stress) if you aren't used to it.</em>",
    options:["stress","stressed","stressful","stressing"],answer:2},
  /* ── B2 UPPER INTERMEDIATE (Q30–38) ─────────────────── */
  /* 30 */ {section:"Third conditional",cefr:"B2",level:3,type:"mc",
    prompt:"If we _____ earlier, we wouldn't have missed the start of the concert.",
    options:["left","had left","would leave","have left"],answer:1,
    tenseTag:"past_perfect",grammarTag:"third_conditional",vocab:false,writing:false},
  /* 31 */ {section:"Wish / If only",cefr:"B2",level:3,type:"mc",
    prompt:"I wish I _____ harder for the exam last week. I really regret it.",
    options:["studied","have studied","had studied","would study"],answer:2,
    tenseTag:"past_perfect",grammarTag:"wish_if_only",vocab:false,writing:false},
  /* 32 */ {section:"Relative clauses",cefr:"B2",level:3,type:"mc",
    prompt:"The colleague _____ helped me with the project has just been promoted.",
    options:["which","whose","who","whom"],answer:2,
    tenseTag:null,grammarTag:"defining_relative_clauses",vocab:false,writing:false},
  /* 33 */ {section:"Relative clauses",cefr:"B2",level:3,type:"mc",
    prompt:"My sister, _____ lives in Berlin, is visiting us next month.",
    options:["that","which","whose","who"],answer:3,
    tenseTag:null,grammarTag:"non_defining_relative_clauses",vocab:false,writing:false},
  /* 34 */ {section:"Causative",cefr:"B2",level:3,type:"mc",
    prompt:"We _____ the whole house repainted before we moved in.",
    options:["made","had","did","got done"],answer:1,
    tenseTag:null,grammarTag:"causative_have_get",vocab:false,writing:false},
  /* 35 */ {section:"Linkers & discourse",cefr:"B2",level:3,type:"mc",
    prompt:"She studied very hard. _____, she didn't pass the exam.",
    options:["Therefore","However","Besides","Furthermore"],answer:1,
    tenseTag:null,grammarTag:"linkers_contrast",vocab:false,writing:false},
  /* 36 */ {section:"B2 vocabulary",cefr:"B2",level:3,type:"mc",
    vocab:true,writing:false,tenseTag:null,grammarTag:null,
    prompt:"Choose the most precise word: <em>The politician refused to give a straight answer — her response was deliberately _____.</em>",
    options:["unclear","vague","evasive","confusing"],answer:2},
  /* 37 */ {section:"B2 vocabulary",cefr:"B2",level:3,type:"mc",
    vocab:true,writing:false,tenseTag:null,grammarTag:null,
    prompt:"Which word collocates correctly? <em>The new policy was met with widespread _____ from the public.</em>",
    options:["opposition","objection","protest","resistance"],answer:0},
  /* ── WRITING TASKS (Q38–40) ──────────────────────────── */
  /* 38 */ {section:"Writing — sentence",cefr:"B1",level:2,type:"text",
    writing:true,vocab:false,tenseTag:null,grammarTag:null,
    minWords:5,tag:"passive_transform",
    prompt:"Rewrite the sentence below in the <strong>passive voice</strong>.<br><em>\"The manager gave all the employees a pay rise.\"</em><br><br>Type your answer here:"},
  /* 39 */ {section:"Writing — sentence",cefr:"B2",level:3,type:"text",
    writing:true,vocab:false,tenseTag:null,grammarTag:null,
    minWords:8,tag:"third_cond_write",
    prompt:"Write a <strong>third conditional</strong> sentence using this idea:<br><em>You didn't study → you didn't pass the exam.</em><br><br>Type your sentence here:"},
  /* 40 */ {section:"Writing — paragraph",cefr:"B2",level:3,type:"text",
    writing:true,vocab:false,tenseTag:null,grammarTag:null,
    minWords:35,tag:"para_opinion",
    prompt:"Write 3–5 sentences giving your opinion on the following statement. Use at least one linking word (e.g. <em>however, although, on the other hand</em>).<br><br><strong>\"People learn more from making mistakes than from their successes.\"</strong>"},
]

export const HOSPITALITY_PLACEMENT_QUESTIONS = [
  {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"The front desk receptionist _____ guests every morning at check-in.",
    options:["welcome","welcomes","welcoming","is welcome"],answer:1,
    tenseTag:"present_simple",grammarTag:"subject_verb_agreement",vocab:false,writing:false},
  {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"We _____ a special gala dinner next month &mdash; the event team is already planning it.",
    options:["are going to hold","go to hold","will going to hold","hold"],answer:0,
    tenseTag:"going_to_future",grammarTag:"going_to_future",vocab:false,writing:false},
  {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"I'm sorry, I can't come to the phone right now &mdash; I _____ a guest at the front desk.",
    options:["help","helps","am helping","helped"],answer:2,
    tenseTag:"present_continuous",grammarTag:"present_continuous",vocab:false,writing:false},
  {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"The hotel _____ its one-hundredth anniversary with a large banquet last year.",
    options:["celebrate","is celebrating","has celebrated","celebrated"],answer:3,
    tenseTag:"past_simple",grammarTag:"past_simple_regular_irregular",vocab:false,writing:false},
  {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"The deluxe room is _____ than the standard room, but it has a much better view.",
    options:["more expensive","expensiver","most expensive","expensivest"],answer:0,
    tenseTag:null,grammarTag:"comparatives_superlatives",vocab:false,writing:false},
  {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"Our concierge _____ arrange restaurant reservations, transport, and theatre tickets for guests.",
    options:["can","cans","is able","does"],answer:0,
    tenseTag:null,grammarTag:"modal_can_ability",vocab:false,writing:false},
  {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"There are only _____ rooms available this weekend &mdash; the hotel is almost fully booked.",
    options:["a little","much","a few","less"],answer:2,
    tenseTag:null,grammarTag:"quantifiers_countable_uncountable",vocab:false,writing:false},
  {section:"Elementary grammar",cefr:"A2",level:1,type:"mc",
    prompt:"The conference begins _____ Monday _____ 9 a.m. sharp. Please be ready.",
    options:["on / at","in / at","at / on","on / in"],answer:0,
    tenseTag:null,grammarTag:"prepositions_time",vocab:false,writing:false},
  {section:"Functional language",cefr:"A2",level:1,type:"mc",
    vocab:false,writing:false,tenseTag:null,grammarTag:"functional_greeting",
    prompt:"A guest walks up to the front desk. Which is the most appropriate greeting?",
    options:["What do you want?","Good morning! How may I help you today?","Yes?","Come here, please."],answer:1},
  {section:"Functional language",cefr:"A2",level:1,type:"mc",
    vocab:true,writing:false,tenseTag:null,grammarTag:null,
    prompt:"Which word completes the sentence correctly? <em>Could you _____ me your booking reference number, please?</em>",
    options:["say","speak","tell","talk"],answer:2},
  {section:"Present perfect",cefr:"B1",level:2,type:"mc",
    prompt:"This guest _____ at our hotel before &mdash; her profile shows she is a first-time visitor.",
    options:["never stayed","has never stayed","never stays","had never stayed"],answer:1,
    tenseTag:"present_perfect",grammarTag:"present_perfect_ever_never",vocab:false,writing:false},
  {section:"Present perfect",cefr:"B1",level:2,type:"mc",
    prompt:"<strong>Guest:</strong> <em>Is Room 412 ready?</em><br><strong>Receptionist:</strong> I'm sorry, housekeeping _____ it yet.",
    options:["didn't clean","hasn't cleaned","doesn't clean","hadn't cleaned"],answer:1,
    tenseTag:"present_perfect",grammarTag:"present_perfect_yet_already",vocab:false,writing:false},
  {section:"Past tenses",cefr:"B1",level:2,type:"mc",
    prompt:"The receptionist _____ a phone reservation when the fire alarm went off.",
    options:["processed","was processing","has processed","had processed"],answer:1,
    tenseTag:"past_continuous",grammarTag:"past_continuous_interrupted",vocab:false,writing:false},
  {section:"Past tenses",cefr:"B1",level:2,type:"mc",
    prompt:"By the time the manager arrived, the unhappy guest _____ already.",
    options:["checked out","was checking out","has checked out","had checked out"],answer:3,
    tenseTag:"past_perfect",grammarTag:"past_perfect_narrative",vocab:false,writing:false},
  {section:"Past habits",cefr:"B1",level:2,type:"mc",
    prompt:"This hotel _____ give guests a printed newspaper every morning, but now it sends a digital version.",
    options:["was used to","used to","would used to","use to"],answer:1,
    tenseTag:null,grammarTag:"used_to_past_habits",vocab:false,writing:false},
  {section:"Future forms",cefr:"B1",level:2,type:"mc",
    prompt:"According to our bookings system, next weekend _____ the busiest of the whole season.",
    options:["is getting","gets","will be","is going to being"],answer:2,
    tenseTag:"will_future",grammarTag:"will_future_prediction",vocab:false,writing:false},
  {section:"First conditional",cefr:"B1",level:2,type:"mc",
    prompt:"If the guest _____ unhappy with the room, we will offer an immediate upgrade.",
    options:["is","will be","was","would be"],answer:0,
    tenseTag:null,grammarTag:"first_conditional",vocab:false,writing:false},
  {section:"Second conditional",cefr:"B1",level:2,type:"mc",
    prompt:"If we _____ more staff on duty tonight, we would be able to serve all the tables faster.",
    options:["have","will have","had","would have"],answer:2,
    tenseTag:null,grammarTag:"second_conditional",vocab:false,writing:false},
  {section:"Modal verbs",cefr:"B1",level:2,type:"mc",
    prompt:"When a guest makes a complaint, staff _____ always listen carefully and apologise before offering a solution.",
    options:["must","should","can","shall"],answer:1,
    tenseTag:null,grammarTag:"modal_should_advice",vocab:false,writing:false},
  {section:"Modal verbs",cefr:"B1",level:2,type:"mc",
    prompt:"The VIP guest _____ request a late check-out &mdash; we should keep the room available just in case.",
    options:["should","must","might","shall"],answer:2,
    tenseTag:null,grammarTag:"modal_might_possibility",vocab:false,writing:false},
  {section:"Functional language — phone",cefr:"B1",level:2,type:"mc",
    prompt:"A caller asks to speak to the manager. What is the most professional response?<br><em>\"Would you mind _____ for just a moment while I connect you?\"</em>",
    options:["to hold","hold","holding","held"],answer:2,
    tenseTag:null,grammarTag:"gerund_after_verbs",vocab:false,writing:false},
  {section:"Functional language — service",cefr:"B1",level:2,type:"mc",
    prompt:"The duty manager decided _____ the guest a complimentary room upgrade after the mix-up.",
    options:["offering","offer","to offer","offered"],answer:2,
    tenseTag:null,grammarTag:"infinitive_after_verbs",vocab:false,writing:false},
  {section:"Passive voice",cefr:"B1",level:2,type:"mc",
    prompt:"All guest rooms _____ before the new season began.",
    options:["were refurbished","are refurbished","refurbished","have refurbished"],answer:0,
    tenseTag:"past_simple",grammarTag:"passive_past_simple",vocab:false,writing:false},
  {section:"Passive voice",cefr:"B1",level:2,type:"mc",
    prompt:"A complimentary breakfast _____ to all guests who book the executive package.",
    options:["offers","offered","is offered","is offering"],answer:2,
    tenseTag:"present_simple",grammarTag:"passive_present_simple",vocab:false,writing:false},
  {section:"Reported speech",cefr:"B1",level:2,type:"mc",
    prompt:"The guest said, \"The air conditioning isn't working.\"<br>The guest said that the air conditioning _____ working.",
    options:["isn't","wasn't","hasn't been","wouldn't be"],answer:1,
    tenseTag:"past_continuous",grammarTag:"reported_speech_backshift",vocab:false,writing:false},
  {section:"Present perfect continuous",cefr:"B1",level:2,type:"mc",
    prompt:"The chef _____ in this kitchen for over six months and has already made some impressive changes.",
    options:["works","has worked","has been working","is working"],answer:2,
    tenseTag:"present_perfect_continuous",grammarTag:"present_perfect_continuous",vocab:false,writing:false},
  {section:"Hospitality vocabulary",cefr:"B1",level:2,type:"mc",
    vocab:true,writing:false,tenseTag:null,grammarTag:null,
    prompt:"Choose the correct word: <em>The hotel has made a _____ to providing exceptional service to every guest.</em>",
    options:["promise","commitment","deal","contract"],answer:1},
  {section:"Word forms",cefr:"B1",level:2,type:"mc",
    vocab:true,writing:false,tenseTag:null,grammarTag:null,
    prompt:"<em>The _____ (accommodate) of large conference groups requires careful advance planning.</em>",
    options:["accommodate","accommodating","accommodation","accommodated"],answer:2},
  {section:"Word forms",cefr:"B1",level:2,type:"mc",
    vocab:true,writing:false,tenseTag:null,grammarTag:null,
    prompt:"<em>Working in a hotel requires staff to be highly _____ (profession) at all times.</em>",
    options:["profession","professional","professionalism","professing"],answer:1},
  {section:"Third conditional",cefr:"B2",level:3,type:"mc",
    prompt:"If the front desk _____ the booking in time, the guest wouldn't have been given the wrong room.",
    options:["checked","had checked","would check","has checked"],answer:1,
    tenseTag:"past_perfect",grammarTag:"third_conditional",vocab:false,writing:false},
  {section:"Wish / If only",cefr:"B2",level:3,type:"mc",
    prompt:"The hotel manager said, 'I wish we _____ more staff available during the peak season last summer.'",
    options:["had","have had","had had","would have"],answer:2,
    tenseTag:"past_perfect",grammarTag:"wish_if_only",vocab:false,writing:false},
  {section:"Relative clauses",cefr:"B2",level:3,type:"mc",
    prompt:"The guest _____ complained about the noise last night has requested a room change.",
    options:["which","whose","who","whom"],answer:2,
    tenseTag:null,grammarTag:"defining_relative_clauses",vocab:false,writing:false},
  {section:"Relative clauses",cefr:"B2",level:3,type:"mc",
    prompt:"The Royal Suite, _____ has a private terrace and butler service, is our most requested room.",
    options:["that","which","whose","who"],answer:1,
    tenseTag:null,grammarTag:"non_defining_relative_clauses",vocab:false,writing:false},
  {section:"Causative",cefr:"B2",level:3,type:"mc",
    prompt:"The hotel manager _____ all the conference rooms deep-cleaned before the event.",
    options:["made","had","did","got done"],answer:1,
    tenseTag:null,grammarTag:"causative_have_get",vocab:false,writing:false},
  {section:"Linkers & discourse",cefr:"B2",level:3,type:"mc",
    prompt:"The hotel received excellent reviews for its location and design. _____, several guests commented that the service was slow.",
    options:["Therefore","However","Besides","Furthermore"],answer:1,
    tenseTag:null,grammarTag:"linkers_contrast",vocab:false,writing:false},
  {section:"Functional language — email",cefr:"B2",level:3,type:"mc",
    vocab:false,writing:false,tenseTag:null,grammarTag:"functional_email_register",
    prompt:"Which sentence is most appropriate for a formal reply to a guest complaint by email?",
    options:["Sorry about that, we'll try to do better.","We are writing to express our sincerest apologies for the inconvenience you experienced during your recent stay.","It wasn't really our fault but OK.","We got your email about the problem."],answer:1},
  {section:"Hospitality vocabulary",cefr:"B2",level:3,type:"mc",
    vocab:true,writing:false,tenseTag:null,grammarTag:null,
    prompt:"Choose the correct collocation: <em>The hotel aims to _____ the highest standards of customer service at all times.</em>",
    options:["keep","hold","maintain","support"],answer:2},
  {section:"Writing — sentence",cefr:"B1",level:2,type:"text",
    writing:true,vocab:false,tenseTag:null,grammarTag:null,
    minWords:5,tag:"passive_transform",
    prompt:"Rewrite the sentence below in the <strong>passive voice</strong>.<br><em>\"The housekeeper cleaned all the rooms before midday.\"</em><br><br>Type your answer here:"},
  {section:"Writing — sentence",cefr:"B2",level:3,type:"text",
    writing:true,vocab:false,tenseTag:null,grammarTag:null,
    minWords:8,tag:"third_cond_write",
    prompt:"Write a <strong>third conditional</strong> sentence using this idea:<br><em>The staff didn't inform the guest about the building works → the guest left a negative review.</em><br><br>Type your sentence here:"},
  {section:"Writing — guest communication",cefr:"B2",level:3,type:"text",
    writing:true,vocab:false,tenseTag:null,grammarTag:null,
    minWords:40,tag:"complaint_response",
    prompt:"A guest has sent this message: <em>\"I was very disappointed with my stay. The room was noisy, the breakfast was cold, and no one seemed to care when I complained.\"</em><br><br>Write a short professional response (4–6 sentences) on behalf of the hotel. Apologise, acknowledge the specific issues, and offer a solution. Use formal language."}
]

export const TEST_DEFINITIONS = [
  { id: 'general_placement_v1',     label: 'General English Diagnostic Test',            desc: '40 questions · A2–B2 · ~25 min' },
  { id: 'hospitality_placement_v1', label: 'Business & Hospitality Diagnostic Test',     desc: '40 questions · A2–B2 · ~25 min · hotel/business contexts' },
]

export function getEffectiveQuestions(testId) {
  const defaults = testId === 'hospitality_placement_v1'
    ? HOSPITALITY_PLACEMENT_QUESTIONS
    : GENERAL_PLACEMENT_QUESTIONS
  try {
    const stored = localStorage.getItem('tq_' + testId)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return defaults
}

export function saveQuestions(testId, questions) {
  try { localStorage.setItem('tq_' + testId, JSON.stringify(questions)) } catch {}
}

export function resetQuestions(testId) {
  try { localStorage.removeItem('tq_' + testId) } catch {}
}

// ── Stage types (used by StudentDashboard AND AdminApp) ──────
export const STAGE_TYPES = [
  { value: 'controlled_exercise', label: 'Controlled Exercise', icon: '✏️',  hasExercise: true,  hasQuestions: true  },
  { value: 'free_exercise',       label: 'Free Exercise',       icon: '🗣️', hasExercise: true,  hasQuestions: true  },
  { value: 'lead_in',             label: 'Lead-in',             icon: '📥', hasExercise: false, hasQuestions: false },
  { value: 'feedback',            label: 'Feedback',            icon: '💬', hasExercise: false, hasQuestions: false },
  { value: 'instruction',         label: 'Instruction',         icon: '📋', hasExercise: false, hasQuestions: false },
  { value: 'clarification',       label: 'Clarification',       icon: '❓', hasExercise: false, hasQuestions: false },
]
