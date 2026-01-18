import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Invitation token is required" }, { status: 400 })
    }

    // Fetch invitation
    const { data: invitation, error: inviteError } = await supabase
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

    // Verify user's email matches invitation
    if (session.user.email !== invitation.invitee_email) {
      return NextResponse.json(
        { error: "Email mismatch. Please sign in with the invited email address." },
        { status: 403 }
      )
    }

    // Update user to be a team member
    const { error: updateError } = await supabase
      .from("users")
      .update({
        team_owner_id: invitation.team_owner_id,
        is_team_owner: false,
      })
      .eq("id", session.user.id)

    if (updateError) {
      console.error("Error updating user:", updateError)
      return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 })
    }

    // Mark invitation as accepted
    const { error: inviteUpdateError } = await supabase
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
      message: "Invitation accepted successfully",
    })
  } catch (error) {
    console.error("Error in accept endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
