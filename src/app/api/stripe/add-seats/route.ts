import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe, PRICE_IDS } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { quantity } = await req.json()

    if (!quantity || quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: "Quantity must be between 1 and 10" },
        { status: 400 }
      )
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_team_owner, stripe_customer_id")
      .eq("id", user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!userData.is_team_owner) {
      return NextResponse.json(
        { error: "Only team owners can purchase seats" },
        { status: 403 }
      )
    }

    if (!userData.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active subscription. Please subscribe first." },
        { status: 400 }
      )
    }

    // Create checkout session for extra seats
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: userData.stripe_customer_id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: PRICE_IDS.extraSeat,
          quantity: quantity,
        },
      ],
      metadata: {
        supabase_user_id: user.id,
        type: "extra_seats",
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          type: "extra_seats",
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/team?seats_added=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/team`,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error("Add seats checkout error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
