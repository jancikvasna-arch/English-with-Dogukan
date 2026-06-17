import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, name } = req.body
  if (!email) return res.status(400).json({ error: 'Email required' })

  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return res.status(500).json({ error: 'Server not configured' })

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Send invitation email — Supabase emails them a magic link to set their password
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name: name || '', access_level: 'prospect' }
  })

  if (error) {
    console.error('[invite-student]', error)
    return res.status(500).json({ error: error.message })
  }

  const userId = data.user.id

  // Create profile row with prospect access level
  await admin.from('profiles').upsert({
    id: userId,
    name: name || '',
    email: email,
    access_level: 'prospect',
    role: 'student',
  }, { onConflict: 'id' })

  return res.status(200).json({ success: true, userId })
}
