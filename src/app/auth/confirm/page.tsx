"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { LumaLogo } from "@/components/LumaLogo"

export default function AuthConfirmPage() {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    handleEmailConfirmation()
  }, [])

  async function handleEmailConfirmation() {
    try {
      // Get the current session after email confirmation
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) throw error

      if (session) {
        setStatus("success")
        setMessage("Your email has been successfully verified!")

        // Redirect to profile page after 2 seconds
        setTimeout(() => {
          router.push("/settings/profile")
        }, 2000)
      } else {
        throw new Error("No session found")
      }
    } catch (error: any) {
      console.error("Email confirmation error:", error)
      setStatus("error")
      setMessage(error.message || "Failed to verify your email. The link may have expired.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-gray to-white flex items-center justify-center p-4">
      <Card className="glass-card border border-sage-medium/30 p-8 max-w-md w-full">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <LumaLogo className="w-12 h-12" />
            <span className="text-3xl font-serif font-bold text-dark-bg">Luma</span>
          </div>

          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 text-mint animate-spin" />
              <h1 className="text-2xl font-serif text-dark-bg">Verifying your email...</h1>
              <p className="text-gray-600">Please wait while we confirm your email address.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-16 h-16 text-mint" />
              <h1 className="text-2xl font-serif text-dark-bg">Email Verified!</h1>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">Redirecting you to your profile...</p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 text-coral" />
              <h1 className="text-2xl font-serif text-dark-bg">Verification Failed</h1>
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
