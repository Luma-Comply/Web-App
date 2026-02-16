import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { stripe } from "@/lib/stripe"
import { FeedbackWidget } from "@/components/FeedbackWidget"
import { SubscriptionGate } from "@/components/dashboard/SubscriptionGate"

/**
 * Fallback: If the user just completed checkout but the webhook hasn't updated the DB yet
 * (or a race condition overwrote the status), verify the checkout session directly with Stripe
 * and sync the subscription status.
 */
async function verifyCheckoutSession(sessionId: string, userId: string): Promise<boolean> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (
      session.status !== "complete" ||
      session.payment_status !== "paid" ||
      session.metadata?.supabase_user_id !== userId
    ) {
      return false
    }

    const subscriptionId = session.subscription as string
    if (!subscriptionId) return false

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return false
    }

    const sub = subscription as any
    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const updateData: Record<string, any> = {
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      subscription_status: subscription.status,
      billing_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      billing_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    }

    if (subscription.status === "active") {
      updateData.trial_ends_at = null
    }

    await adminClient.from("users").update(updateData).eq("id", userId)
    console.log(`[Layout] Checkout session fallback: synced subscription ${subscriptionId} for user ${userId}`)
    return true
  } catch (error) {
    console.error("[Layout] Checkout session verification failed:", error)
    return false
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Check subscription status
  const { data: userData } = await supabase
    .from("users")
    .select("subscription_status, trial_ends_at, stripe_subscription_id")
    .eq("id", user.id)
    .single()

  const status = userData?.subscription_status || "canceled"
  const trialEndsAt = userData?.trial_ends_at
  const trialExpired = status === "trialing" && trialEndsAt && new Date(trialEndsAt) <= new Date()
  const hasHadSubscription = !!userData?.stripe_subscription_id || trialExpired

  // Determine if user has valid access
  const isActive = status === "active"
  const isTrialing =
    status === "trialing" &&
    trialEndsAt &&
    new Date(trialEndsAt) > new Date()
  let hasAccess = isActive || isTrialing

  // Fallback: If no access but session_id is in the URL (user just returned from Stripe checkout),
  // verify the checkout session directly with Stripe and sync subscription status.
  if (!hasAccess) {
    const headersList = await headers()
    const currentUrl = headersList.get("x-url") || ""

    try {
      const parsedUrl = new URL(currentUrl)
      const sessionId = parsedUrl.searchParams.get("session_id")

      if (sessionId) {
        const synced = await verifyCheckoutSession(sessionId, user.id)
        if (synced) {
          hasAccess = true
        }
      }
    } catch {
      // URL parsing failed — no session_id to check
    }
  }

  if (!hasAccess) {
    return <SubscriptionGate hasHadSubscription={hasHadSubscription} />
  }

  return (
    <>
      {children}
      <FeedbackWidget />
    </>
  )
}
