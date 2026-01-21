import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Invitation token is required" }, { status: 400 })
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    // Use service role client for admin operations
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Fetch invitation
    const { data: invitation, error: inviteError } = await serviceClient
      .from("team_invitations")
      .select("*")
      .eq("invitation_token", token)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 })
    }

    // Verify invitation is still valid
    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "This invitation has already been used" }, { status: 400 })
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invitation has expired" }, { status: 400 })
    }

    // Check if user already exists in auth
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === invitation.invitee_email.toLowerCase()
    )

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 400 }
      )
    }

    // Create user with Admin API - email is pre-confirmed
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email: invitation.invitee_email,
      password: password,
      email_confirm: true, // This skips email confirmation
    })

    if (createError || !newUser?.user) {
      console.error("Error creating user:", createError)
      return NextResponse.json(
        { error: createError?.message || "Failed to create account" },
        { status: 500 }
      )
    }

    // Double-check: explicitly update user to confirm email (belt and suspenders)
    // Some Supabase configurations ignore email_confirm on createUser
    const { error: updateError } = await serviceClient.auth.admin.updateUserById(
      newUser.user.id,
      { email_confirm: true }
    )

    if (updateError) {
      console.error("Error confirming email:", updateError)
      // Non-fatal, continue - the email_confirm on create might have worked
    }

    // Update user record in public.users table to link to team
    // The trigger on auth.users may have already created the base record,
    // so we use upsert to handle both cases
    const { error: upsertError } = await serviceClient.from("users").upsert(
      {
        id: newUser.user.id,
        email: invitation.invitee_email,
        team_owner_id: invitation.team_owner_id,
        is_team_owner: false,
      },
      { onConflict: "id" }
    )

    if (upsertError) {
      console.error("Error creating/updating user record:", upsertError)
      // Try to clean up the auth user if DB operation failed
      await serviceClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({
        error: `Failed to create user record: ${upsertError.message || upsertError.code || 'Unknown error'}`
      }, { status: 500 })
    }

    // Mark invitation as accepted
    const { error: inviteUpdateError } = await serviceClient
      .from("team_invitations")
      .update({
        status: "accepted",
      })
      .eq("id", invitation.id)

    if (inviteUpdateError) {
      console.error("Error updating invitation:", inviteUpdateError)
      // Not critical, continue
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      email: invitation.invitee_email,
    })
  } catch (error) {
    console.error("Error in accept endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
