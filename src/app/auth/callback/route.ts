import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const type = searchParams.get('type') // Supabase adds this for email confirmations
    
    // Get the redirect URL - prioritize "next" param, then default to checkout for email confirmations
    let next = searchParams.get('next')
    if (!next) {
        // If it's an email confirmation (type=signup or recovery), go to checkout
        // Otherwise, default to dashboard for other auth flows
        next = (type === 'signup' || type === 'recovery') ? '/checkout' : '/dashboard'
    }

    // Use the app URL from env to ensure correct domain
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (!error && data.session) {
            // Ensure user record exists in public.users table
            // The trigger should create it, but let's make sure it exists
            const userId = data.session.user.id
            const userEmail = data.session.user.email

            if (userId && userEmail) {
                // Use service role client to bypass RLS and ensure user record exists
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

                // Check if user exists, if not create it
                const { data: existingUser } = await serviceClient
                    .from('users')
                    .select('id')
                    .eq('id', userId)
                    .single()

                if (!existingUser) {
                    // User doesn't exist in public.users, create it
                    await serviceClient
                        .from('users')
                        .insert({
                            id: userId,
                            email: userEmail,
                        })
                        .select()
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
