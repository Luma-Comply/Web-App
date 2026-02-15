"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { LumaLogo } from "@/components/LumaLogo"
import { CheckCircle, XCircle, Loader2, Users, Eye, EyeOff, Check, X } from "lucide-react"

function AcceptInvitationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invitationData, setInvitationData] = useState<{
    practiceName: string
    inviteeEmail: string
    teamOwnerId: string
    token: string
  } | null>(null)

  // Password form state
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Password validation
  const passwordMinLength = password.length >= 8
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  useEffect(() => {
    checkInvitation()
  }, [])

  async function checkInvitation() {
    const token = searchParams.get("token")

    if (!token) {
      setError("Invalid invitation link")
      setLoading(false)
      return
    }

    try {
      // Fetch invitation details
      const { data: invitation, error: inviteError } = await supabase
        .from("team_invitations")
        .select("invitee_email, team_owner_id, status, expires_at")
        .eq("invitation_token", token)
        .single()

      if (inviteError || !invitation) {
        setError("Invalid or expired invitation")
        setLoading(false)
        return
      }

      // Check if invitation is still valid
      if (invitation.status !== "pending") {
        setError("This invitation has already been used")
        setLoading(false)
        return
      }

      if (new Date(invitation.expires_at) < new Date()) {
        setError("This invitation has expired")
        setLoading(false)
        return
      }

      // Get team owner info including practice name
      const { data: ownerData } = await supabase
        .from("users")
        .select("email, practice_name")
        .eq("id", invitation.team_owner_id)
        .single()

      setInvitationData({
        practiceName: ownerData?.practice_name || ownerData?.email || "Unknown",
        inviteeEmail: invitation.invitee_email,
        teamOwnerId: invitation.team_owner_id,
        token: token,
      })

      setLoading(false)
    } catch (err: any) {
      console.error("Error checking invitation:", err)
      setError("Failed to load invitation details")
      setLoading(false)
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()

    if (!invitationData) return
    if (!passwordMinLength || !passwordsMatch) return

    setSubmitting(true)
    setError(null)

    try {
      // 1. Call API to create user with Admin API (email pre-confirmed)
      const response = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: invitationData.token,
          password: password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to create account")
        setSubmitting(false)
        return
      }

      // 2. Sign in with the newly created credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitationData.inviteeEmail,
        password: password,
      })

      if (signInError) {
        console.error("Sign in error after account creation:", signInError)
        // Account was created successfully, but sign-in failed
        // Redirect to login page so they can sign in manually
        setError("Account created! Please sign in with your new credentials.")
        setTimeout(() => {
          router.push("/login")
        }, 2000)
        return
      }

      setSuccess(true)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (err: any) {
      console.error("Error creating account:", err)
      setError(err.message || "Failed to create account")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-gray flex items-center justify-center">
        <div className="text-center">
          <LumaLogo className="w-16 h-16 mx-auto mb-4 animate-pulse text-mint" />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-gray flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card border border-sage-medium/30 p-8">
        <div className="text-center mb-6">
          <LumaLogo className="w-12 h-12 mx-auto mb-4 text-dark-bg" />
          <h1 className="text-2xl font-sans font-bold text-dark-bg mb-2">Team Invitation</h1>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 mx-auto text-mint" />
            <div>
              <h2 className="text-xl font-semibold text-dark-bg mb-2">Welcome to the team!</h2>
              <p className="text-gray-600">
                Your account has been created. Redirecting to dashboard...
              </p>
            </div>
          </div>
        ) : error && !invitationData ? (
          <div className="text-center space-y-4">
            <XCircle className="w-16 h-16 mx-auto text-coral" />
            <div>
              <h2 className="text-xl font-semibold text-dark-bg mb-2">Invalid Invitation</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button
                onClick={() => router.push("/")}
                className="bg-dark-bg text-white hover:bg-dark-bg/90"
              >
                Go to Home
              </Button>
            </div>
          </div>
        ) : invitationData ? (
          <div className="space-y-6">
            <div className="flex items-center justify-center mb-4">
              <Users className="w-16 h-16 text-mint" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-dark-bg">You've been invited!</h2>
              <p className="text-gray-600">
                <span className="font-medium">{invitationData.practiceName}</span> has invited you
                to join their team on Luma.
              </p>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              {/* Email (disabled) */}
              <div>
                <Label htmlFor="email" className="text-dark-bg font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={invitationData.inviteeEmail}
                  disabled
                  className="mt-2 h-11 bg-gray-100 text-gray-600"
                />
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password" className="text-dark-bg font-medium">
                  Create Password
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <Label htmlFor="confirmPassword" className="text-dark-bg font-medium">
                  Confirm Password
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password validation indicators */}
              <div className="space-y-2 text-sm">
                <div className={`flex items-center gap-2 ${passwordMinLength ? 'text-mint' : 'text-gray-400'}`}>
                  {passwordMinLength ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordsMatch ? 'text-mint' : 'text-gray-400'}`}>
                  {passwordsMatch ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  <span>Passwords match</span>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 bg-coral/10 border border-coral/30 rounded-lg">
                  <p className="text-coral text-sm">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                disabled={submitting || !passwordMinLength || !passwordsMatch}
                className="w-full bg-dark-bg text-white hover:bg-dark-bg/90 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Complete Sign Up"
                )}
              </Button>
            </form>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-light-gray flex items-center justify-center">
          <div className="text-center">
            <LumaLogo className="w-16 h-16 mx-auto mb-4 animate-pulse text-mint" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  )
}
