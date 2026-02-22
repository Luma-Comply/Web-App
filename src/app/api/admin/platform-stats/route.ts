import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

const BASE_PRICE = 399
const EXTRA_SEAT_PRICE = 15
const BASE_SEATS = 3

export async function GET() {
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

    // Service-role client to bypass RLS and query all users
    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: allUsers, error } = await adminClient
      .from("users")
      .select("id, subscription_status, seats_count, is_team_owner, is_super_admin, created_at")

    if (error) {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    // Only count team owners for subscription/revenue stats (team members share owner's sub)
    const owners = allUsers.filter((u: Record<string, unknown>) => u.is_team_owner !== false)

    // Exclude super admins from revenue calculations (founder uses coupon, not full price)
    const payingOwners = owners.filter((u: Record<string, unknown>) => !u.is_super_admin)

    const statusBreakdown = { active: 0, trialing: 0, canceled: 0, past_due: 0 }
    let totalExtraSeats = 0
    let payingActiveSubscribers = 0

    for (const u of owners) {
      const status = (u.subscription_status as string) || "canceled"
      if (status in statusBreakdown) {
        statusBreakdown[status as keyof typeof statusBreakdown]++
      }
    }

    // MRR only from paying (non-super-admin) owners
    for (const u of payingOwners) {
      const status = (u.subscription_status as string) || "canceled"
      if (status === "active") {
        payingActiveSubscribers++
        totalExtraSeats += Math.max(0, ((u.seats_count as number) || BASE_SEATS) - BASE_SEATS)
      }
    }

    const mrr = (payingActiveSubscribers * BASE_PRICE) + (totalExtraSeats * EXTRA_SEAT_PRICE)

    // Signups this month
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const signupsThisMonth = allUsers.filter((u: Record<string, unknown>) =>
      u.created_at && new Date(u.created_at as string) >= monthStart
    ).length

    return NextResponse.json({
      totalUsers: allUsers.length,
      activeSubscribers: statusBreakdown.active,
      trialingUsers: statusBreakdown.trialing,
      mrr,
      statusBreakdown,
      signupsThisMonth,
    })
  } catch (error) {
    console.error("Platform stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
