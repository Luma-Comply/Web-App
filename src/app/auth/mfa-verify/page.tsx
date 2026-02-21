"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LumaLogo } from "@/components/LumaLogo"
import { Shield, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"

function MFAVerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const redirectTo = searchParams.get("next") || "/dashboard"

  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [loading, setLoading] = useState(true)

  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkMFAStatus()
  }, [])

  useEffect(() => {
    if (!loading && codeInputRef.current) {
      codeInputRef.current.focus()
    }
  }, [loading])

  async function checkMFAStatus() {
    try {
      const { data: aalData, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      if (aalError) {
        // Not authenticated at all, redirect to login
        router.replace("/login")
        return
      }

      // If already AAL2, no need for MFA verification
      if (aalData.currentLevel === "aal2") {
        router.replace(redirectTo)
        return
      }

      // If no next level aal2, user doesn't have MFA enrolled
      if (aalData.nextLevel !== "aal2") {
        router.replace(redirectTo)
        return
      }

      // User needs MFA verification
      setLoading(false)
    } catch {
      router.replace("/login")
    }
  }

  async function handleVerify() {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code")
      return
    }

    setVerifying(true)
    setError("")

    try {
      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors()

      if (factorsError) {
        setError("Failed to retrieve MFA factors. Please try again.")
        setVerifying(false)
        return
      }

      const totpFactor = factors.totp[0]
      if (!totpFactor) {
        setError("No authenticator factor found.")
        setVerifying(false)
        return
      }

      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totpFactor.id })

      if (challengeError) {
        setError(challengeError.message)
        setVerifying(false)
        return
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      })

      if (verifyError) {
        setError("Invalid verification code. Please try again.")
        setCode("")
        codeInputRef.current?.focus()
        setVerifying(false)
        return
      }

      // Verification successful - redirect to dashboard
      router.replace(redirectTo)
    } catch (err: any) {
      setError(err.message || "Verification failed. Please try again.")
      setVerifying(false)
    }
  }

  function handleCodeChange(value: string) {
    const cleaned = value.replace(/\D/g, "").slice(0, 6)
    setCode(cleaned)
    setError("")
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-gray flex items-center justify-center px-4">
        <LumaLogo className="w-16 h-16" variant="loading" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-gray flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <LumaLogo className="w-10 h-10" />
          <span className="text-2xl font-serif font-bold text-dark-bg">Luma</span>
        </Link>
      </header>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-2xl p-8 md:p-10 border border-sage-medium/50 shadow-xl">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-full bg-mint/10 flex items-center justify-center">
                <Shield className="w-7 h-7 text-mint" />
              </div>
            </div>

            {/* Heading */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-sans font-semibold text-dark-bg mb-2">
                Two-factor authentication
              </h1>
              <p className="text-gray-600 text-sm">
                Enter the 6-digit code from your authenticator app to continue.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div
                className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2"
                role="alert"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Code input */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfa-code" className="sr-only">
                  Verification code
                </Label>
                <Input
                  ref={codeInputRef}
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && code.length === 6) {
                      handleVerify()
                    }
                  }}
                  className={`text-center text-xl tracking-[0.3em] font-mono h-14 ${
                    error ? "border-red-300 focus-visible:ring-red-500" : ""
                  }`}
                  maxLength={6}
                  aria-describedby={error ? "mfa-verify-error" : undefined}
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={verifying || code.length !== 6}
                className="w-full h-11 text-base bg-dark-bg text-white hover:bg-dark-bg/90"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </div>

            {/* Sign out option */}
            <div className="mt-6 pt-4 border-t border-sage-medium/30 text-center">
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Sign in with a different account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MFAVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-light-gray flex items-center justify-center">
          <LumaLogo className="w-16 h-16" variant="loading" />
        </div>
      }
    >
      <MFAVerifyForm />
    </Suspense>
  )
}
