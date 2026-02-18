import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNewSignupNotification } from '@/lib/email-service'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const practiceName = user.user_metadata?.practice_name || null

    await sendNewSignupNotification({
      userEmail: user.email!,
      practiceName,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in notify-signup:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
