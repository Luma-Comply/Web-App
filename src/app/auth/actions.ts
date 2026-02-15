'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const redirectTo = formData.get('redirect') as string || '/dashboard'

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
        redirect('/login?error=' + encodeURIComponent(errorMessage) + (redirectTo !== '/dashboard' ? `&redirect=${encodeURIComponent(redirectTo)}` : ''))
    }

    // Sync practice_name from auth metadata if missing in public.users
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const practiceName = user.user_metadata?.practice_name
        if (practiceName) {
            const { data: userData } = await supabase
                .from('users')
                .select('practice_name')
                .eq('id', user.id)
                .single()
            if (userData && !userData.practice_name) {
                await supabase
                    .from('users')
                    .update({ practice_name: practiceName })
                    .eq('id', user.id)
            }
        }
    }

    revalidatePath('/', 'layout')
    redirect(redirectTo)
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const practiceName = formData.get('practiceName') as string

    if (!email || !password || !practiceName) {
        redirect('/signup?error=Please%20fill%20in%20all%20fields')
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/checkout`,
            data: {
                practice_name: practiceName,
            },
        },
    })

    // If signup succeeded, update the user profile with practice_name and mark as team owner
    // Use upsert to handle the case where the trigger hasn't created the record yet
    if (data?.user && !error) {
        await supabase
            .from('users')
            .upsert({
                id: data.user.id,
                email: email,
                practice_name: practiceName,
                is_team_owner: true  // New signups are team owners by default
            }, {
                onConflict: 'id'
            })
    }

    // Even if there's an error (like user already exists), still show confirm email page
    // The user might need to check their email or resend confirmation
    revalidatePath('/', 'layout')

    // Always redirect to confirmation page - user needs to verify email first
    // If signup failed, they'll see the error on the confirm page or can resend
    redirect(`/signup/confirm-email?email=${encodeURIComponent(email)}${error ? `&error=${encodeURIComponent(error.message)}` : ''}`)
}

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string

    if (!email) {
        redirect('/forgot-password?error=Email is required')
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=recovery`,
    })

    if (error) {
        redirect('/forgot-password?error=' + encodeURIComponent(error.message))
    }

    redirect('/forgot-password?success=Check your email for a password reset link')
}

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()

    const password = formData.get('password') as string

    if (!password) {
        redirect('/update-password?error=Password is required')
    }

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        redirect('/update-password?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function resendVerificationEmail(email: string) {
    const supabase = await createClient()

    const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/checkout`,
        }
    })

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true }
}
