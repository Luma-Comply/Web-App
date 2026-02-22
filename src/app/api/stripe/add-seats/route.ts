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

    // Get user data — need subscription ID to modify it directly
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_team_owner, stripe_customer_id, stripe_subscription_id, subscription_status")
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

    if (!userData.stripe_customer_id || !userData.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription. Please subscribe first." },
        { status: 400 }
      )
    }

    if (userData.subscription_status !== "active" && userData.subscription_status !== "trialing") {
      return NextResponse.json(
        { error: "Subscription is not active. Please resubscribe first." },
        { status: 400 }
      )
    }

    // Retrieve the current subscription to check for existing extra seat items
    const subscription = await stripe.subscriptions.retrieve(userData.stripe_subscription_id)

    // Check if there's already an extra seat line item on this subscription
    const existingSeatItem = subscription.items.data.find(
      (item) => item.price?.id === PRICE_IDS.extraSeat
    )

    if (existingSeatItem) {
      // Already has extra seats — increase the quantity on the existing item
      const newQuantity = (existingSeatItem.quantity || 0) + quantity

      await stripe.subscriptions.update(userData.stripe_subscription_id, {
        items: [
          {
            id: existingSeatItem.id,
            quantity: newQuantity,
          },
        ],
        proration_behavior: "create_prorations",
      })

      console.log(
        `Updated extra seats for user ${user.id}: ${existingSeatItem.quantity} → ${newQuantity}`
      )
    } else {
      // No extra seats yet — add a new line item to the existing subscription
      await stripe.subscriptions.update(userData.stripe_subscription_id, {
        items: [
          // Keep existing items intact by not referencing them (Stripe preserves them)
          { price: PRICE_IDS.extraSeat, quantity: quantity },
        ],
        proration_behavior: "create_prorations",
      })

      console.log(`Added ${quantity} extra seats for user ${user.id}`)
    }

    // Stripe will fire customer.subscription.updated webhook,
    // which will recalculate seats_count in the DB.
    // But we also update seats_count directly for immediate UI feedback.
    const totalExtraSeats = existingSeatItem
      ? (existingSeatItem.quantity || 0) + quantity
      : quantity

    const { error: updateError } = await supabase
      .from("users")
      .update({ seats_count: 3 + totalExtraSeats })
      .eq("id", user.id)

    if (updateError) {
      console.error("Failed to update seats_count directly:", updateError)
      // Non-fatal: webhook will eventually sync this
    }

    return NextResponse.json({
      success: true,
      seats_added: quantity,
      total_extra_seats: totalExtraSeats,
      total_seats: 3 + totalExtraSeats,
    })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Add seats error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to add seats" },
      { status: 500 }
    )
  }
}
