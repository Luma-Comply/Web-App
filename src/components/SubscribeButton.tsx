"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function SubscribeButton({
  className,
  isReturningUser = false,
}: {
  className?: string
  isReturningUser?: boolean
}) {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      // Verify we have an active session before calling the API
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error("No active session:", sessionError)
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
        return
      }

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include cookies for session
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Session expired or auth issue - redirect to login
          console.error("Auth error:", data)
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
          return
        }
        throw new Error(data.error || "Failed to create checkout session")
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL received")
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Checkout error:", error)
      alert(error.message || "Failed to start checkout. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleSubscribe}
      disabled={loading}
      size="lg"
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <CreditCard className="w-5 h-5 mr-2" />
          {isReturningUser ? "Subscribe Now" : "Start 7-Day Free Trial"}
        </>
      )}
    </Button>
  )
}
