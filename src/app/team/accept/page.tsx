"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LumaLogo } from "@/components/LumaLogo"
import { CheckCircle, XCircle, Loader2, Users } from "lucide-react"
import Link from "next/link"

function AcceptInvitationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invitationData, setInvitationData] = useState<{
    inviterEmail: string
    inviteeEmail: string
  } | null>(null)
  const [requiresSignup, setRequiresSignup] = useState(false)

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
      // Check if user is authenticated
      const {
        data: { session },
      } = await supabase.auth.getSession()

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

      // Get team owner info
      const { data: ownerData } = await supabase
        .from("users")
        .select("email")
        .eq("id", invitation.team_owner_id)
        .single()

      setInvitationData({
        inviterEmail: ownerData?.email || "Unknown",
        inviteeEmail: invitation.invitee_email,
      })

      // If user is not authenticated, they need to sign up/login
      if (!session) {
        setRequiresSignup(true)
        setLoading(false)
        return
      }

      // Check if user's email matches invitation
      if (session.user.email !== invitation.invitee_email) {
        setError(
          `This invitation was sent to ${invitation.invitee_email}. Please sign in with that email address.`
        )
        setLoading(false)
        return
      }

      setLoading(false)
    } catch (err: any) {
      console.error("Error checking invitation:", err)
      setError("Failed to load invitation details")
      setLoading(false)
    }
  }

  async function handleAcceptInvitation() {
    const token = searchParams.get("token")
    if (!token) return

    setAccepting(true)
    setError(null)

    try {
      const response = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invitation")
      }

      setSuccess(true)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (err: any) {
      console.error("Error accepting invitation:", err)
      setError(err.message || "Failed to accept invitation")
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-light-gray to-white flex items-center justify-center">
        <div className="text-center">
          <LumaLogo className="w-16 h-16 mx-auto mb-4 animate-pulse text-mint" />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-gray to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card border border-sage-medium/30 p-8">
        <div className="text-center mb-6">
          <LumaLogo className="w-12 h-12 mx-auto mb-4 text-dark-bg" />
          <h1 className="text-2xl font-serif font-bold text-dark-bg mb-2">Team Invitation</h1>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 mx-auto text-mint" />
            <div>
              <h2 className="text-xl font-semibold text-dark-bg mb-2">Welcome to the team!</h2>
              <p className="text-gray-600">
                You've successfully joined the team. Redirecting to dashboard...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center space-y-4">
            <XCircle className="w-16 h-16 mx-auto text-coral" />
            <div>
              <h2 className="text-xl font-semibold text-dark-bg mb-2">Invalid Invitation</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Link href="/login">
                <Button className="bg-dark-bg text-white hover:bg-dark-bg/90">
                  Go to Login
                </Button>
              </Link>
            </div>
          </div>
        ) : requiresSignup ? (
          <div className="space-y-6">
            <div className="flex items-center justify-center mb-4">
              <Users className="w-16 h-16 text-mint" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-dark-bg">You've been invited!</h2>
              <p className="text-gray-600">
                <span className="font-medium">{invitationData?.inviterEmail}</span> has invited you
                to join their team on Luma.
              </p>
              <p className="text-sm text-gray-500">
                Invitation sent to: <span className="font-medium">{invitationData?.inviteeEmail}</span>
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Sign in with <span className="font-medium">{invitationData?.inviteeEmail}</span> to accept this invitation.
              </p>
              <Link href={`/login?email=${invitationData?.inviteeEmail}&redirect=/team/accept?token=${searchParams.get("token")}`}>
                <Button className="w-full bg-dark-bg text-white hover:bg-dark-bg/90">
                  Sign In
                </Button>
              </Link>
              <Link href={`/signup?email=${invitationData?.inviteeEmail}&redirect=/team/accept?token=${searchParams.get("token")}`}>
                <Button variant="outline" className="w-full border-sage-medium/30">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-center mb-4">
              <Users className="w-16 h-16 text-mint" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-dark-bg">You've been invited!</h2>
              <p className="text-gray-600">
                <span className="font-medium">{invitationData?.inviterEmail}</span> has invited you
                to join their team on Luma.
              </p>
            </div>
            <Button
              onClick={handleAcceptInvitation}
              disabled={accepting}
              className="w-full bg-dark-bg text-white hover:bg-dark-bg/90"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                "Accept Invitation"
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-light-gray to-white flex items-center justify-center">
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
