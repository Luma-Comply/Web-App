import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    // Auth: require super admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from("users")
      .select("is_super_admin")
      .eq("id", user.id)
      .single()

    if (!userData?.is_super_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const token = process.env.CLARITY_API_TOKEN
    if (!token) {
      return NextResponse.json({ error: "Clarity API token not configured" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const numOfDays = searchParams.get("numOfDays") || "3"
    const dimension1 = searchParams.get("dimension1") || ""

    const params = new URLSearchParams({ numOfDays })
    if (dimension1) params.set("dimension1", dimension1)

    const response = await fetch(
      `https://www.clarity.ms/export-data/api/v1/project-live-insights?${params.toString()}`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      const status = response.status
      if (status === 401) return NextResponse.json({ error: "Invalid or expired Clarity token" }, { status: 401 })
      if (status === 429) return NextResponse.json({ error: "Clarity daily request limit reached (10/day)" }, { status: 429 })
      return NextResponse.json({ error: `Clarity API error (${status})` }, { status: status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Clarity insights error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
