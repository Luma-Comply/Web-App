'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        redirect('/login?error=' + encodeURIComponent('Please enter both email and password'))
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        // Provide more specific error messages
        let errorMessage = 'Invalid email or password'
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password'
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please confirm your email address before signing in'
        } else {
            errorMessage = error.message || 'Could not sign in. Please try again.'
        }
        redirect('/login?error=' + encodeURIComponent(errorMessage))
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        redirect('/signup?error=Please%20fill%20in%20all%20fields')
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/checkout`,
        },
    })

    // Even if there's an error (like user already exists), still show confirm email page
    // The user might need to check their email or resend confirmation
    revalidatePath('/', 'layout')
    
    // Always redirect to confirmation page - user needs to verify email first
    // If signup failed, they'll see the error on the confirm page or can resend
    redirect(`/signup/confirm-email?email=${encodeURIComponent(email)}${error ? `&error=${encodeURIComponent(error.message)}` : ''}`)
}
