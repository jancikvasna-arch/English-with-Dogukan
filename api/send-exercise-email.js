export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, name, exerciseTitle, mode } = req.body
  if (!email || !exerciseTitle) return res.status(400).json({ error: 'Missing required fields' })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Email service not configured' })

  const firstName = name ? name.split(' ')[0] : 'there'
  const modeLabel = mode === 'class' ? 'in-class exercise' : 'homework exercise'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:14px;border:1px solid #e4e0d4;overflow:hidden;">
    <div style="background:#005580;padding:28px 36px;">
      <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;font-weight:500;letter-spacing:0.04em;">English with Dogukan</p>
    </div>
    <div style="padding:36px;">
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#1a2030;line-height:1.3;">
        Hi ${firstName}, you have a new exercise
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:#5f5e5a;line-height:1.7;">
        Dogukan has assigned you a new ${modeLabel}: <strong style="color:#1a2030;">${exerciseTitle}</strong>.
        Log in to your student dashboard to complete it.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="https://english-with-dogukan.vercel.app/dashboard"
           style="display:inline-block;background:#005580;color:#ffffff;text-decoration:none;
                  font-size:16px;font-weight:600;padding:14px 36px;border-radius:8px;
                  letter-spacing:0.02em;">
          Open my dashboard →
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e4e0d4;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;color:#888780;line-height:1.6;">
        You received this because Dogukan assigned you an exercise as part of your English learning journey.
        If you have any questions, simply reply to this email.
      </p>
    </div>
    <div style="background:#f5f3ee;padding:20px 36px;border-top:1px solid #e4e0d4;">
      <p style="margin:0;font-size:12px;color:#b0ada5;">
        © English with Dogukan &nbsp;·&nbsp; CELTA-certified one-to-one English tuition
      </p>
    </div>
  </div>
</body>
</html>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Dogukan <onboarding@resend.dev>',
        to: [email],
        subject: `New exercise assigned: ${exerciseTitle}`,
        html,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      console.error('[send-exercise-email] Resend error:', data)
      return res.status(500).json({ error: data.message || 'Failed to send email' })
    }
    return res.status(200).json({ success: true, id: data.id })
  } catch (err) {
    console.error('[send-exercise-email] Unexpected error:', err)
    return res.status(500).json({ error: 'Unexpected error sending email' })
  }
}
