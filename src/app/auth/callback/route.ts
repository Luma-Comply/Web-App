import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
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
