import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's Stripe subscription ID
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("stripe_subscription_id, subscription_status")
      .eq("id", session.user.id)
      .single()

    if (userError || !user || !user.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      )
    }

    if (user.subscription_status !== "active") {
      return NextResponse.json(
        { error: "Subscription is not active" },
        { status: 400 }
      )
    }

    // Cancel subscription at period end (don't cancel immediately)
    const subscription = await stripe.subscriptions.update(
      user.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    )

    // Update database
    await supabase
      .from("users")
      .update({
        cancel_at_period_end: true,
      })
      .eq("id", session.user.id)

    return NextResponse.json({
      success: true,
      message: "Subscription will be canceled at the end of the billing period",
      cancel_at: subscription.cancel_at,
    })
  } catch (error: any) {
    console.error("Stripe cancel error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    )
  }
}
