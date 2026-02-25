import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: audit, error } = await supabase
      .from("audits")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (error || !audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 })
    }

    return NextResponse.json(audit)
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch audit" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only allow updating checklist_edits and recommendation_edits
    const updateData: Record<string, unknown> = {}
    if (body.checklist_edits !== undefined) {
      updateData.checklist_edits = body.checklist_edits
    }
    if (body.recommendation_edits !== undefined) {
      updateData.recommendation_edits = body.recommendation_edits
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    const { data: audit, error } = await supabase
      .from("audits")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select("id, checklist_edits, recommendation_edits")
      .single()

    if (error || !audit) {
      return NextResponse.json(
        { error: "Failed to update audit" },
        { status: 500 }
      )
    }

    return NextResponse.json(audit)
  } catch {
    return NextResponse.json(
      { error: "Failed to update audit" },
      { status: 500 }
    )
  }
}
