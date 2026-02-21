import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FeedbackWidget } from "@/components/FeedbackWidget"
import { SubscriptionGate } from "@/components/dashboard/SubscriptionGate"
import { LumaLogo } from "@/components/LumaLogo"
import { SessionTimeoutProvider } from "@/components/SessionTimeoutProvider"

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
  const hasAccess = isActive || isTrialing

  if (!hasAccess) {
    // SubscriptionGate uses useSearchParams() which requires Suspense in App Router.
    // Without Suspense, searchParams returns null during SSR and the session_id
    // fallback never triggers.
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-gradient-to-b from-light-gray to-white flex items-center justify-center px-4">
            <LumaLogo className="w-16 h-16" variant="loading" />
          </div>
        }
      >
        <SubscriptionGate hasHadSubscription={hasHadSubscription} />
      </Suspense>
    )
  }

  return (
    <>
      {children}
      <FeedbackWidget />
      <SessionTimeoutProvider />
    </>
  )
}
