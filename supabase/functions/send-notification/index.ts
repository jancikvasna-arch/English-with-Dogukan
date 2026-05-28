/**
 * Supabase Edge Function: send-notification
 *
 * Sends transactional emails via Resend (https://resend.com — free tier: 3,000/month).
 *
 * Setup (one-time):
 *   1. Sign up at resend.com and get your API key
 *   2. In Supabase dashboard → Settings → Edge Functions → Secrets, add:
 *        RESEND_API_KEY = re_xxxxxxxxxxxx
 *        RESEND_FROM    = English with Dogukan <lessons@yourdomain.com>
 *   3. Deploy: supabase functions deploy send-notification
 *
 * Call from the frontend (supabase.functions.invoke):
 *   await supabase.functions.invoke('send-notification', {
 *     body: {
 *       type: 'exercise_assigned',
 *       to:   'student@email.com',
 *       data: { studentName: 'Ana', exerciseTitle: 'Present Perfect', note: '...' }
 *     }
 *   })
 *
 * Supported notification types:
 *   exercise_assigned    — new exercise or lesson plan assigned to student
 *   lesson_scheduled     — lesson date/time confirmed
 *   feedback_added       — teacher left feedback on a submission
 *   badge_earned         — student earned a new badge
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_ADDRESS   = Deno.env.get('RESEND_FROM')    ?? 'English with Dogukan <noreply@englishwithdogukan.com>'
const SITE_URL       = 'https://englishwithdogukan.com'

// ─── Email templates ──────────────────────────────────────────

function exerciseAssigned(data: Record<string, string>) {
  return {
    subject: `📚 New exercise assigned — ${data.exerciseTitle}`,
    html: `
      <p>Hi ${data.studentName || 'there'},</p>
      <p>Dogukan has assigned a new exercise to you:</p>
      <p style="font-size:18px;font-weight:bold;color:#006699;">${data.exerciseTitle}</p>
      ${data.note ? `<p><em>Note from Dogukan: ${data.note}</em></p>` : ''}
      <p><a href="${SITE_URL}" style="display:inline-block;background:#006699;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Open my portal →</a></p>
      <p style="color:#888;font-size:13px;">Log in at ${SITE_URL} to complete it.</p>
    `,
  }
}

function lessonScheduled(data: Record<string, string>) {
  return {
    subject: `📅 Lesson confirmed — ${data.lessonDate}`,
    html: `
      <p>Hi ${data.studentName || 'there'},</p>
      <p>Your English lesson with Dogukan is confirmed:</p>
      <p style="font-size:18px;font-weight:bold;color:#006699;">${data.lessonDate} · ${data.lessonTime}</p>
      ${data.duration ? `<p>Duration: ${data.duration}</p>` : ''}
      ${data.title ? `<p>Topic: ${data.title}</p>` : ''}
      <p><a href="${SITE_URL}" style="display:inline-block;background:#006699;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">View my portal →</a></p>
    `,
  }
}

function feedbackAdded(data: Record<string, string>) {
  return {
    subject: `⭐ Dogukan left feedback on your exercise`,
    html: `
      <p>Hi ${data.studentName || 'there'},</p>
      <p>Dogukan has reviewed your submission for <strong>${data.exerciseTitle}</strong> and left feedback.</p>
      <p><a href="${SITE_URL}" style="display:inline-block;background:#006699;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">View feedback →</a></p>
    `,
  }
}

function badgeEarned(data: Record<string, string>) {
  return {
    subject: `🏅 You earned a new badge — ${data.badgeName}!`,
    html: `
      <p>Hi ${data.studentName || 'there'},</p>
      <p>You've just earned a new achievement:</p>
      <p style="font-size:24px;">${data.badgeEmoji} <strong>${data.badgeName}</strong></p>
      <p style="color:#888;">${data.badgeDescription}</p>
      <p><a href="${SITE_URL}" style="display:inline-block;background:#006699;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">See my achievements →</a></p>
    `,
  }
}

const templates: Record<string, (d: Record<string, string>) => { subject: string; html: string }> = {
  exercise_assigned: exerciseAssigned,
  lesson_scheduled:  lessonScheduled,
  feedback_added:    feedbackAdded,
  badge_earned:      badgeEarned,
}

// ─── Handler ─────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { type, to, data = {} } = await req.json()

    if (!RESEND_API_KEY) {
      console.warn('[send-notification] RESEND_API_KEY not set — email skipped')
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 })
    }

    if (!type || !to) {
      return new Response(JSON.stringify({ error: 'Missing type or to' }), { status: 400 })
    }

    const template = templates[type]
    if (!template) {
      return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), { status: 400 })
    }

    const { subject, html } = template(data)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('[send-notification] Resend error:', result)
      return new Response(JSON.stringify({ error: result }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-notification] Unhandled error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
