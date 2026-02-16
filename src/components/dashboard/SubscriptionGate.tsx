"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { LumaLogo } from "@/components/LumaLogo"
import { SubscribeButton } from "@/components/SubscribeButton"

export function SubscriptionGate({
  hasHadSubscription,
}: {
  hasHadSubscription: boolean
}) {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [verifying, setVerifying] = useState(!!sessionId)

  useEffect(() => {
    if (!sessionId) return

    async function verifySession() {
      try {
        const res = await fetch("/api/stripe/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        })

        if (res.ok) {
          // Subscription synced — reload to get past the gate
          window.location.href = "/dashboard"
          return
        }
      } catch (error) {
        console.error("Session verification failed:", error)
      }

      // If verification failed, show the gate normally
      setVerifying(false)
    }

    verifySession()
  }, [sessionId])

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-light-gray to-white flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <LumaLogo className="w-16 h-16 mx-auto mb-6" variant="loading" />
          <h1 className="text-2xl font-sans font-semibold text-dark-bg mb-3">
            Activating your subscription...
          </h1>
          <p className="text-gray-600">
            Please wait while we confirm your payment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-gray to-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <LumaLogo className="w-16 h-16 mx-auto mb-6" />
        <h1 className="text-2xl font-sans font-semibold text-dark-bg mb-3">
          {hasHadSubscription
            ? "Your Subscription Has Ended"
            : "Your Trial Has Ended"}
        </h1>
        <p className="text-gray-600 mb-8 whitespace-nowrap">
          {hasHadSubscription
            ? "Subscribe to regain access to your dashboard and continue creating cases."
            : "Subscribe to access your dashboard and start creating cases."}
        </p>
        <SubscribeButton
          className="w-full"
          isReturningUser={hasHadSubscription}
        />
      </div>
    </div>
  )
}
