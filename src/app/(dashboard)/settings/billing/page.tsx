"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckCircle,
  CreditCard,
  Calendar,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react"

interface BillingInfo {
  subscription_status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_tier: string
  trial_ends_at: string | null
  billing_period_start: string | null
  billing_period_end: string | null
  cancel_at_period_end: boolean
  cases_remaining: number
  seats_count: number
}

export default function BillingPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    loadBillingInfo()
  }, [])

  async function loadBillingInfo() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      const { data: userData } = await supabase
        .from("users")
        .select(
          "subscription_status, stripe_customer_id, stripe_subscription_id, subscription_tier, trial_ends_at, billing_period_start, billing_period_end, cancel_at_period_end, cases_remaining, seats_count"
        )
        .eq("id", session.user.id)
        .single()

      if (userData) {
        setBillingInfo(userData as BillingInfo)
      }
    } catch (error) {
      console.error("Error loading billing info:", error)
      toast({
        title: "Error",
        description: "Failed to load billing information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleManageBilling() {
    setRedirecting(true)
    try {
      const response = await fetch("/api/stripe/create-portal", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to access billing portal")
      }

      // Redirect to Stripe portal
      window.location.href = data.url
    } catch (error: any) {
      console.error("Error accessing billing portal:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to access billing portal",
        variant: "destructive",
      })
      setRedirecting(false)
    }
  }

  async function handleCancelSubscription() {
    setCanceling(true)
    try {
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription")
      }

      toast({
        title: "Subscription Canceled",
        description: "Your subscription will end at the end of the current billing period.",
      })

      setCancelDialogOpen(false)
      loadBillingInfo()
    } catch (error: any) {
      console.error("Error canceling subscription:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      })
    } finally {
      setCanceling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    )
  }

  const isTrialing = billingInfo?.subscription_status === "trialing"
  const isActive = billingInfo?.subscription_status === "active"
  const isCanceled = billingInfo?.subscription_status === "canceled"
  const isPastDue = billingInfo?.subscription_status === "past_due"

  // Check if there is an active trial period, regardless of status label
  const hasActiveTrial = billingInfo?.trial_ends_at && new Date(billingInfo.trial_ends_at) > new Date();

  return (
    <div className="space-y-6">
      {/* Subscription Status Card */}
      <Card className="glass-card border border-sage-medium/30 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-dark-bg mb-1">Subscription</h2>
            <p className="text-sm text-gray-600">Manage your subscription and billing details.</p>
          </div>
          {billingInfo?.stripe_customer_id && (
            <Button
              onClick={handleManageBilling}
              disabled={redirecting}
              variant="outline"
              className="border-sage-medium/30"
            >
              {redirecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Billing
                  <ExternalLink className="w-3 h-3 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>

        {/* Status Badge */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {isActive && !hasActiveTrial && <CheckCircle className="w-8 h-8 text-mint" />}
            {hasActiveTrial && <Calendar className="w-8 h-8 text-blue-500" />}
            {(isCanceled || isPastDue) && <AlertCircle className="w-8 h-8 text-coral" />}
            {!isActive && !hasActiveTrial && !isCanceled && !isPastDue && (
              <AlertCircle className="w-8 h-8 text-gray-400" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-dark-bg">
                  {hasActiveTrial && "Free Trial"}
                  {isActive && !hasActiveTrial && "Professional Plan"}
                  {isCanceled && "Subscription Canceled"}
                  {isPastDue && "Payment Failed"}
                  {!isActive && !hasActiveTrial && !isCanceled && !isPastDue && "Subscription"}
                </h3>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${isActive && !hasActiveTrial
                      ? "bg-mint/10 text-mint"
                      : hasActiveTrial
                        ? "bg-blue-100 text-blue-700"
                        : isCanceled || isPastDue
                          ? "bg-coral/10 text-coral"
                          : "bg-gray-100 text-gray-600"
                    }`}
                >
                  {hasActiveTrial ? 'Trialing' :
                    billingInfo?.subscription_status === 'active' ? 'Active' :
                      billingInfo?.subscription_status || 'Unknown'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {hasActiveTrial &&
                  billingInfo?.trial_ends_at &&
                  `Trial ends ${new Date(billingInfo.trial_ends_at).toLocaleDateString()}`}
                {isActive && !hasActiveTrial && !billingInfo?.cancel_at_period_end && "$149/month"}
                {isActive &&
                  !hasActiveTrial &&
                  billingInfo?.cancel_at_period_end &&
                  billingInfo?.billing_period_end &&
                  `Ends ${new Date(billingInfo.billing_period_end).toLocaleDateString()}`}
                {isCanceled && "Subscription has been canceled"}
                {isPastDue && "Please update your payment method"}
                {!isActive && !hasActiveTrial && !isCanceled && !isPastDue && "Current subscription status"}
              </p>
            </div>
          </div>

          {/* Plan Details */}
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-sage-medium/30">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Plan Features</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-mint" />
                    50 cases per month
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-mint" />
                    {billingInfo?.seats_count || 3} team seats
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-mint" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-mint" />
                    Advanced analytics
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Usage</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cases Remaining</span>
                    <span className="font-semibold text-dark-bg">
                      {/* Show explicitly 50 if the subscription is just created, otherwise show DB value */}
                      {/* For now, relying on DB value which we fixed in webhook to default to 50 */}
                      {billingInfo?.cases_remaining ?? 50}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Team Seats</span>
                    <span className="font-semibold text-dark-bg">
                      {billingInfo?.seats_count ?? 3}
                    </span>
                  </div>
                </div>
              </div>

              {billingInfo?.billing_period_end && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Billing Period</p>
                  <p className="text-sm text-gray-700">
                    {billingInfo?.billing_period_start &&
                      new Date(billingInfo.billing_period_start).toLocaleDateString()}
                    {" - "}
                    {new Date(billingInfo.billing_period_end).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
      {/* Cancel Subscription Section */}
      {/* Show cancel button if user has a subscription ID and it's not already scheduled for cancellation */}
      {/* We check stripe_subscription_id to handle all active-like states (active, trialing, incomplete, pust_due) */}
      {billingInfo?.stripe_subscription_id && !billingInfo?.cancel_at_period_end && billingInfo?.subscription_status !== 'canceled' && (
        <Card className="glass-card border border-coral/30 p-6 bg-coral/5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-dark-bg mb-1">Cancel Subscription</h3>
              <p className="text-sm text-gray-600">
                You can cancel your subscription at any time. You'll continue to have access until
                the end of your current billing period.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(true)}
              className="border-coral text-coral hover:bg-coral/10"
            >
              Cancel Plan
            </Button>
          </div>
        </Card>
      )}

      {/* Canceled Notice */}
      {billingInfo?.cancel_at_period_end && billingInfo?.billing_period_end && (
        <Card className="glass-card border border-amber-300/30 p-6 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-dark-bg mb-1">Subscription Ending</h3>
              <p className="text-sm text-gray-600">
                Your subscription will end on{" "}
                <span className="font-semibold">
                  {new Date(billingInfo.billing_period_end).toLocaleDateString()}
                </span>
                . You can reactivate it anytime by managing your billing.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancel Subscription?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? You'll continue to have access
              until the end of your current billing period.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <p className="text-sm font-medium text-dark-bg">What happens next:</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Access continues until{" "}
                  {billingInfo?.billing_period_end &&
                    new Date(billingInfo.billing_period_end).toLocaleDateString()}
                </li>
                <li>No further charges will be made</li>
                <li>You can reactivate anytime</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              className="border-sage-medium/30"
            >
              Keep Subscription
            </Button>
            <Button
              onClick={handleCancelSubscription}
              disabled={canceling}
              className="bg-coral text-white hover:bg-coral/90"
            >
              {canceling ? "Canceling..." : "Cancel Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
