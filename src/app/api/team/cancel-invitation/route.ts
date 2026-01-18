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

    const { invitationId } = await request.json()

    if (!invitationId) {
      return NextResponse.json({ error: "Invitation ID is required" }, { status: 400 })
    }

    // Check if user is a team owner
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_team_owner")
      .eq("id", session.user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "Failed to load user data" }, { status: 500 })
    }

    if (!userData.is_team_owner) {
      return NextResponse.json({ error: "Only team owners can cancel invitations" }, { status: 403 })
    }

    // Delete the invitation
    const { error: deleteError } = await supabase
      .from("team_invitations")
      .delete()
      .eq("id", invitationId)
      .eq("team_owner_id", session.user.id) // Ensure it belongs to this team owner

    if (deleteError) {
      console.error("Error deleting invitation:", deleteError)
      return NextResponse.json({ error: "Failed to cancel invitation" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Invitation canceled successfully",
    })
  } catch (error) {
    console.error("Error in cancel-invitation endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
