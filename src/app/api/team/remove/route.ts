import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit-log"

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

    const { memberId } = await request.json()

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 })
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
      return NextResponse.json({ error: "Only team owners can remove members" }, { status: 403 })
    }

    // Check if the member exists and belongs to this team
    const { data: memberData, error: memberError } = await supabase
      .from("users")
      .select("id, is_team_owner, team_owner_id")
      .eq("id", memberId)
      .single()

    if (memberError || !memberData) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Prevent removing the team owner
    if (memberData.is_team_owner) {
      return NextResponse.json({ error: "Cannot remove the team owner" }, { status: 403 })
    }

    // Verify the member belongs to this team
    if (memberData.team_owner_id !== session.user.id) {
      return NextResponse.json({ error: "This member does not belong to your team" }, { status: 403 })
    }

    // Remove the team member (set them as independent user)
    const { error: updateError } = await supabase
      .from("users")
      .update({
        team_owner_id: null,
        is_team_owner: true, // Make them an independent user
      })
      .eq("id", memberId)

    if (updateError) {
      console.error("Error removing team member:", updateError)
      return NextResponse.json({ error: "Failed to remove team member" }, { status: 500 })
    }

    logAudit({
      action: 'team_member_removed',
      resourceType: 'team',
      userId: session.user.id,
      metadata: { removed_member_id: memberId },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: "Team member removed successfully",
    })
  } catch (error) {
    console.error("Error in remove endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
