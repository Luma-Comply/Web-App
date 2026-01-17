"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard } from "lucide-react"
import { useRouter } from "next/navigation"

export function SubscribeButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      console.error("Checkout error:", error)
      alert(error.message || "Failed to start checkout")
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
          Start 14-Day Free Trial
        </>
      )}
    </Button>
  )
}
