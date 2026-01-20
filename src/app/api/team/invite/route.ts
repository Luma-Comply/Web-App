import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { sendInvitationEmail } from "@/lib/email"

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

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Check if user is a team owner
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_team_owner, seats_count, practice_name")
      .eq("id", session.user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "Failed to load user data" }, { status: 500 })
    }

    if (!userData.is_team_owner) {
      return NextResponse.json({ error: "Only team owners can invite members" }, { status: 403 })
    }

    // Check current team size
    const { data: teamMembers, error: teamError } = await supabase
      .from("users")
      .select("id")
      .or(`id.eq.${session.user.id},team_owner_id.eq.${session.user.id}`)

    if (teamError) {
      return NextResponse.json({ error: "Failed to check team size" }, { status: 500 })
    }

    // Check pending invitations
    const { data: pendingInvites, error: invitesError } = await supabase
      .from("team_invitations")
      .select("id")
      .eq("team_owner_id", session.user.id)
      .eq("status", "pending")

    if (invitesError) {
      return NextResponse.json({ error: "Failed to check pending invitations" }, { status: 500 })
    }

    const totalUsedSeats = (teamMembers?.length || 0) + (pendingInvites?.length || 0)
    const seatsCount = userData.seats_count || 3

    if (totalUsedSeats >= seatsCount) {
      return NextResponse.json(
        { error: "Team limit reached. Upgrade your plan to add more members." },
        { status: 403 }
      )
    }

    // Check if user is already a team member
    const { data: existingMember } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a team member" },
        { status: 400 }
      )
    }

    // Check if there's already a pending invitation
    const { data: existingInvite } = await supabase
      .from("team_invitations")
      .select("id")
      .eq("team_owner_id", session.user.id)
      .eq("invitee_email", email)
      .eq("status", "pending")
      .single()

    if (existingInvite) {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email" },
        { status: 400 }
      )
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString("hex")

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("team_invitations")
      .insert({
        team_owner_id: session.user.id,
        invitee_email: email,
        invitation_token: invitationToken,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single()

    if (inviteError) {
      console.error("Error creating invitation:", inviteError)
      return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 })
    }

    // Send invitation email
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/team/accept?token=${invitationToken}`
    const practiceName = userData.practice_name || session.user.email || "A team"

    await sendInvitationEmail({
      to: email,
      inviterEmail: session.user.email || "unknown",
      practiceName,
      invitationLink,
    })

    console.log(`Invitation created for ${email}: ${invitationLink}`)

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      invitation_link: invitationLink, // Remove this in production
    })
  } catch (error) {
    console.error("Error in invite endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
