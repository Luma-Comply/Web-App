"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { LumaLogo } from "@/components/LumaLogo"

function AuthConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    handleEmailConfirmation()
  }, [])

  async function handleEmailConfirmation() {
    try {
      // Get the token hash and type from URL
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      console.log("Confirmation params:", { token_hash, type })

      // If we have a token hash, verify it with Supabase
      if (token_hash && type) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        })

        if (error) {
          console.error("OTP verification error:", error)
          throw error
        }

        console.log("OTP verification success:", data)

        // Notify admin of new signup (fire and forget)
        if (type === 'signup') {
          fetch('/api/notify-signup', { method: 'POST' }).catch(() => {})
        }

        setStatus("success")
        setMessage("Your email has been successfully verified!")

        // Redirect to checkout for new signups, profile for others
        setTimeout(() => {
          router.push(type === 'signup' ? "/checkout" : "/settings/profile")
        }, 2000)
      } else {
        // No token in URL, just check if user has a session
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) throw error

        if (session) {
          setStatus("success")
          setMessage("Your email has been successfully verified!")

          setTimeout(() => {
            router.push("/settings/profile")
          }, 2000)
        } else {
          throw new Error("No verification token found in URL")
        }
      }
    } catch (error: any) {
      console.error("Email confirmation error:", error)
      setStatus("error")
      setMessage(error.message || "Failed to verify your email. The link may have expired.")
    }
  }

  return (
    <div className="min-h-screen bg-light-gray flex items-center justify-center p-4">
      <Card className="glass-card border border-sage-medium/30 p-8 max-w-md w-full">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <LumaLogo className="w-12 h-12" />
            <span className="text-3xl font-serif font-bold text-dark-bg">Luma</span>
          </div>

          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 text-mint animate-spin" />
              <h1 className="text-2xl font-sans font-semibold text-dark-bg">Verifying your email...</h1>
              <p className="text-gray-600">Please wait while we confirm your email address.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-16 h-16 text-mint" />
              <h1 className="text-2xl font-sans font-semibold text-dark-bg">Email Verified!</h1>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">Redirecting you to your profile...</p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 text-coral" />
              <h1 className="text-2xl font-sans font-semibold text-dark-bg">Verification Failed</h1>
              <p className="text-gray-600">{message}</p>
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => router.push("/settings/profile")}
                  variant="outline"
                  className="border-sage-medium/30"
                >
                  Go to Profile
                </Button>
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="bg-dark-bg text-white hover:bg-dark-bg/90"
                >
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-light-gray flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-mint animate-spin" />
      </div>
    }>
      <AuthConfirmContent />
    </Suspense>
  )
}
