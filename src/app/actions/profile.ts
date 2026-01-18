'use server'

import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

interface UpdateProfileParams {
    firstName: string
    lastName: string
    email: string
}

export async function updateProfile({ firstName, lastName, email }: UpdateProfileParams) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        throw new Error("Unauthorized")
    }

    // Check if anything changed
    const currentEmail = user.email
    const currentMetaData = user.user_metadata || {}

    const emailChanged = email !== currentEmail
    const nameChanged = firstName !== currentMetaData.first_name || lastName !== currentMetaData.last_name

    if (!emailChanged && !nameChanged) {
        return { success: true }
    }

    // Create admin client for privileged operations
    const adminAuth = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    const updateData: any = {
        user_metadata: {
            first_name: firstName,
            last_name: lastName
        }
    }

    if (emailChanged) {
        updateData.email = email
        updateData.email_confirm = true // Bypass confirmation
    }

    // Update user via admin api
    const { data: updatedUser, error: updateError } = await adminAuth.auth.admin.updateUserById(
        user.id,
        updateData
    )

    if (updateError) {
        console.error("Error updating user:", updateError)
        throw new Error(updateError.message)
    }

    // Update public.users table to keep in sync
    const { error: dbError } = await adminAuth
        .from('users')
        .update({
            email: email, // Always ensure email is correct
            // We could also update names here if you have columns for them in public.users
        })
        .eq('id', user.id)

    if (dbError) {
        console.error("Error updating public.users:", dbError)
        // We don't throw here as the main auth update succeeded
    }

    // Send notification email (manually since Admin API suppresses it)
    if (emailChanged && currentEmail) {
        try {
            // Import dynamically to avoid circular dependencies if any (though unlikely here)
            const { sendEmailChangeNotification } = await import("@/lib/email-service")
            await sendEmailChangeNotification({
                to: email, // Send to new email
                oldEmail: currentEmail,
                newEmail: email
            })
        } catch (emailError) {
            console.error("Failed to send email change notification:", emailError)
            // Don't fail the request if email sending fails
        }
    }

    revalidatePath('/settings/profile')
    return { success: true, emailChanged }
}

interface UpdatePasswordParams {
    currentPassword: string
    newPassword: string
    confirmPassword: string
}

export async function updatePassword({ currentPassword, newPassword, confirmPassword }: UpdatePasswordParams) {
    if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match")
    }

    if (newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters")
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || !user.email) {
        throw new Error("Unauthorized")
    }

    // 1. Verify current password
    // We do this by trying to sign in with the expected credentials
    const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
    })

    if (verifyError) {
        throw new Error("Current password is incorrect")
    }

    // 2. Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    })

    if (updateError) {
        throw new Error(updateError.message)
    }

    // 3. Send notification
    try {
        const { sendPasswordChangeNotification } = await import("@/lib/email-service")
        await sendPasswordChangeNotification({
            to: user.email,
            email: user.email
        })
    } catch (emailError) {
        console.error("Failed to send password change notification:", emailError)
    }

    return { success: true }
}
