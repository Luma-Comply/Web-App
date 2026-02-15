import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FeedbackWidget } from "@/components/FeedbackWidget"
import { SubscriptionGate } from "@/components/dashboard/SubscriptionGate"

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
  const hasHadSubscription = !!userData?.stripe_subscription_id

  // Determine if user has valid access
  const isActive = status === "active"
  const isTrialing =
    status === "trialing" &&
    trialEndsAt &&
    new Date(trialEndsAt) > new Date()
  const hasAccess = isActive || isTrialing

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
