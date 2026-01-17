"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { LumaLogo } from "@/components/LumaLogo"
import { Mail, CheckCircle } from "lucide-react"
import MedicalGrid from "@/components/MedicalGrid"

function ConfirmEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const error = searchParams.get("error")
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return
    
    try {
      // TODO: Add resend email API endpoint if needed
      setResendCooldown(60) // 60 second cooldown
    } catch (error) {
      console.error("Failed to resend email:", error)
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-light-gray to-white relative overflow-hidden">
      <MedicalGrid intensity="light" />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <LumaLogo className="w-10 h-10" />
          <span className="text-2xl font-serif font-bold text-dark-bg">Luma</span>
        </Link>

        <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="w-full max-w-md">
            <div className="glass-card rounded-2xl p-8 md:p-10 border border-sage-medium/50 shadow-xl text-center">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-full bg-mint/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-mint" />
                </div>
                <h1 className="text-3xl font-serif text-dark-bg mb-2">
                  Check your email
                </h1>
                <p className="text-gray-600">
                  We've sent a confirmation link to
                </p>
                {email && (
                  <p className="text-dark-bg font-semibold mt-1">
                    {email}
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-red-800">
                    <strong>Note:</strong> {error}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    If you already have an account, please check your email for the confirmation link or try signing in.
                  </p>
                </div>
              )}

              <div className="bg-mint/5 border border-mint/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3 text-left">
                  <CheckCircle className="w-5 h-5 text-mint flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1">Next steps:</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-600">
                      <li>Check your inbox (and spam folder)</li>
                      <li>Click the confirmation link in the email</li>
                      <li>Complete your 14-day free trial setup</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {email && (
                  <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="text-sm text-mint hover:text-mint/80 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {resendCooldown > 0
                      ? `Resend email in ${resendCooldown}s`
                      : "Didn't receive the email? Resend"}
                  </button>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Already confirmed?{" "}
                    <Link href="/login" className="text-mint hover:text-mint/80 font-semibold">
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-gradient-to-b from-light-gray to-white items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  )
}
