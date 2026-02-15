"use client"

import { LumaLogo } from "@/components/LumaLogo"
import { SubscribeButton } from "@/components/SubscribeButton"

export function SubscriptionGate({
  hasHadSubscription,
}: {
  hasHadSubscription: boolean
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-light-gray to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <LumaLogo className="w-16 h-16 mx-auto mb-6" />
        <h1 className="text-2xl font-sans font-semibold text-dark-bg mb-3">
          {hasHadSubscription
            ? "Your Subscription Has Ended"
            : "Your Trial Has Ended"}
        </h1>
        <p className="text-gray-600 mb-8">
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
