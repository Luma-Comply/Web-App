'use server'

import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

interface UpdateProfileParams {
    firstName: string
    lastName: string
    email: string
    practiceName?: string
}

export async function updateProfile({ firstName, lastName, email, practiceName }: UpdateProfileParams) {
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
    const practiceNameProvided = practiceName !== undefined

    if (!emailChanged && !nameChanged && !practiceNameProvided) {
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
    const usersUpdateData: any = {
        email: email, // Always ensure email is correct
    }

    // Only update practice_name if provided (i.e., user is a team owner)
    if (practiceNameProvided) {
        // Verify user is actually a team owner (or independent user) before allowing practice_name update
        const { data: userData } = await adminAuth
            .from('users')
            .select('is_team_owner, team_owner_id')
            .eq('id', user.id)
            .single()

        // User can edit practice_name if they're an owner OR if they have no team_owner_id
        // (meaning they're an independent user who owns their account)
        const canEditPracticeName = userData?.is_team_owner || !userData?.team_owner_id
        if (canEditPracticeName) {
            usersUpdateData.practice_name = practiceName
        }
    }

    const { error: dbError } = await adminAuth
        .from('users')
        .update(usersUpdateData)
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
        return { success: false, error: "Passwords do not match" }
    }

    if (newPassword.length < 8) {
        return { success: false, error: "Password must be at least 8 characters" }
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || !user.email) {
        return { success: false, error: "Unauthorized" }
    }

    // 1. Verify current password
    // We do this by trying to sign in with the expected credentials
    const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
    })

    if (verifyError) {
        return { success: false, error: "Current password is incorrect" }
    }

    // 2. Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    })

    if (updateError) {
        return { success: false, error: updateError.message }
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
