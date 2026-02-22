import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    const { data: caseData, error } = await supabase
      .from("cases")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (error || !caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    return NextResponse.json(caseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error fetching case:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch case" },
      { status: 500 }
    )
  }
}
