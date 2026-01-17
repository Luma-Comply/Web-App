"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CreditCard, CheckCircle, Clock, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface SubscriptionBannerProps {
  subscriptionStatus: string
  trialEndsAt: string | null
  casesRemaining: number
  casesUsedThisPeriod: number
  billingPeriodEnd: string | null
}

export function SubscriptionBanner({
  subscriptionStatus,
  trialEndsAt,
  casesRemaining,
  casesUsedThisPeriod,
  billingPeriodEnd,
}: SubscriptionBannerProps) {
  const [loading, setLoading] = useState(false)

  const handleManageBilling = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/stripe/create-portal", {
        method: "POST",
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error)
      alert("Failed to open billing portal. Please try again.")
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Failed to start checkout:", error)
      alert("Failed to start checkout. Please try again.")
      setLoading(false)
    }
  }

  // Trial expired or canceled
  if (subscriptionStatus === "canceled" || (subscriptionStatus === "trialing" && trialEndsAt && new Date(trialEndsAt) < new Date())) {
    return (
      <Card className="p-6 glass-card border-2 border-coral/50 bg-coral/5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className="w-6 h-6 text-coral flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-serif text-dark-bg mb-1">
                {subscriptionStatus === "canceled" ? "Subscription Canceled" : "Trial Ended"}
              </h3>
              <p className="text-gray-700 mb-3">
                {subscriptionStatus === "canceled"
                  ? "Your subscription has been canceled. Upgrade to continue creating cases."
                  : "Your 14-day free trial has ended. Subscribe to continue using Luma."}
              </p>
              <Button onClick={handleUpgrade} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Subscribe Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Active trial
  if (subscriptionStatus === "trialing" && trialEndsAt) {
    const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

    return (
      <Card className="p-6 glass-card border-2 border-mint/50 bg-mint/5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Clock className="w-6 h-6 text-mint flex-shrink-0 mt-1" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-serif text-dark-bg">Free Trial Active</h3>
                <Badge variant="outline" className="bg-mint/10 text-mint border-mint/30">
                  {daysLeft} days left
                </Badge>
              </div>
              <p className="text-gray-700 mb-2">
                Your trial ends {formatDistanceToNow(new Date(trialEndsAt), { addSuffix: true })}.
                You have <strong>{casesRemaining} cases</strong> remaining this period.
              </p>
              <p className="text-sm text-gray-600">
                After your trial, you'll be charged $149/month. Cancel anytime.
              </p>
            </div>
          </div>
          <Button onClick={handleManageBilling} variant="outline" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              "Manage Billing"
            )}
          </Button>
        </div>
      </Card>
    )
  }

  // Active subscription - show usage
  if (subscriptionStatus === "active") {
    const percentUsed = ((50 - casesRemaining) / 50) * 100
    const isLowOnCases = casesRemaining <= 10

    return (
      <Card className={`p-6 glass-card border-2 mb-6 ${isLowOnCases ? "border-coral/50 bg-coral/5" : "border-sage-medium/30"}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <CheckCircle className={`w-6 h-6 flex-shrink-0 mt-1 ${isLowOnCases ? "text-coral" : "text-mint"}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-serif text-dark-bg">Professional Plan</h3>
                <Badge variant="outline" className="bg-mint/10 text-mint border-mint/30">
                  Active
                </Badge>
              </div>

              {/* Usage Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-700">
                    <strong>{casesRemaining} cases</strong> remaining this month
                  </span>
                  <span className="text-gray-600">
                    {casesUsedThisPeriod} / 50 used
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${isLowOnCases ? "bg-coral" : "bg-mint"}`}
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
              </div>

              {isLowOnCases && (
                <p className="text-sm text-coral mb-2">
                  You're running low on cases! Need more? Extra cases are $3 each.
                </p>
              )}

              <p className="text-sm text-gray-600">
                Next billing: {billingPeriodEnd ? formatDistanceToNow(new Date(billingPeriodEnd), { addSuffix: true }) : "N/A"}
              </p>
            </div>
          </div>
          <Button onClick={handleManageBilling} variant="outline" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              "Manage Billing"
            )}
          </Button>
        </div>
      </Card>
    )
  }

  // Past due
  if (subscriptionStatus === "past_due") {
    return (
      <Card className="p-6 glass-card border-2 border-coral/50 bg-coral/5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className="w-6 h-6 text-coral flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-serif text-dark-bg mb-1">Payment Failed</h3>
              <p className="text-gray-700 mb-3">
                Your last payment failed. Please update your payment method to continue using Luma.
              </p>
              <Button onClick={handleManageBilling} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Update Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return null
}
