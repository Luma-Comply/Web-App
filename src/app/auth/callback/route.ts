import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendNewSignupNotification } from '@/lib/email-service'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const type = searchParams.get('type') // Supabase adds this for email confirmations

    // Get the redirect URL - prioritize "next" param, then default based on type
    let next = searchParams.get('next')
    if (!next) {
        // If it's an email confirmation (type=signup or recovery), go to checkout
        // If it's an email change confirmation, go to profile
        // Otherwise, default to dashboard for other auth flows
        if (type === 'signup') {
            next = '/checkout'
        } else if (type === 'recovery') {
            next = '/update-password'
        } else if (type === 'email_change') {
            next = '/settings/profile?email_confirmed=true'
        } else {
            next = '/dashboard'
        }
    }

    // Use the app URL from env to ensure correct domain
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.session) {
            // Ensure user record exists in public.users table and email is up to date
            const userId = data.session.user.id
            const userEmail = data.session.user.email

            if (userId && userEmail) {
                // Use service role client to bypass RLS and ensure user record exists/updated
                const serviceClient = createServiceClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!,
                    {
                        auth: {
                            autoRefreshToken: false,
                            persistSession: false
                        }
                    }
                )

                // Get practice_name from user metadata (set during signup)
                const userMetadata = data.session.user.user_metadata || {}
                const practiceName = userMetadata.practice_name

                // Check if user exists
                const { data: existingUser } = await serviceClient
                    .from('users')
                    .select('id, email, practice_name')
                    .eq('id', userId)
                    .single()

                if (!existingUser) {
                    // User doesn't exist in public.users, create it with practice_name
                    await serviceClient
                        .from('users')
                        .insert({
                            id: userId,
                            email: userEmail,
                            practice_name: practiceName || null,
                            is_team_owner: true,  // New signups are team owners
                        })
                        .select()

                } else {
                    // User exists - update email if changed, and set practice_name if missing
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const updates: any = {}
                    if (existingUser.email !== userEmail) {
                        updates.email = userEmail
                    }
                    // Only set practice_name if it's currently null and we have one from metadata
                    if (!existingUser.practice_name && practiceName) {
                        updates.practice_name = practiceName
                        updates.is_team_owner = true
                    }

                    if (Object.keys(updates).length > 0) {
                        await serviceClient
                            .from('users')
                            .update(updates)
                            .eq('id', userId)
                    }
                }

                // Notify admin of new signups (fire and forget — don't block the redirect)
                if (type === 'signup') {
                    sendNewSignupNotification({
                        userEmail: userEmail,
                        practiceName: practiceName,
                    }).catch((err) => console.error('Failed to send signup notification:', err))
                }
            }

            // Always use the app URL from env to ensure correct redirect
            return NextResponse.redirect(`${appUrl}${next}`)
        } else {
            console.error('Auth code exchange error:', error)
            // Still redirect to checkout even on error, but log it
            return NextResponse.redirect(`${appUrl}/checkout?error=auth_error`)
        }
    }

    // No code provided - redirect to checkout anyway (might be a direct visit)
    return NextResponse.redirect(`${appUrl}/checkout`)
}
