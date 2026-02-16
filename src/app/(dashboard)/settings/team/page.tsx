"use client"

import TeamLoading from "./loading"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UserPlus, Trash2, Loader2, ChevronDown } from "lucide-react"

interface TeamMember {
  id: string
  email: string
  is_team_owner: boolean
  created_at: string
}

interface TeamInvitation {
  id: string
  invitee_email: string
  status: string
  created_at: string
  expires_at: string
}

export default function TeamPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [isTeamOwner, setIsTeamOwner] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [seatsCount, setSeatsCount] = useState(3)
  const [seatsUsed, setSeatsUsed] = useState(0)

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")

  // Remove dialog state
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)

  // Add seats state
  const [seatQuantity, setSeatQuantity] = useState(3)
  const [addingSeats, setAddingSeats] = useState(false)
  const [seatsExpanded, setSeatsExpanded] = useState(false)

  useEffect(() => {
    loadTeamData()
  }, [])

  // Show success toast when returning from Stripe checkout
  useEffect(() => {
    if (searchParams.get("seats_added") === "true") {
      toast({
        title: "Seats added successfully!",
        description: "You can now invite more team members.",
      })
      // Clean up URL param
      router.replace("/settings/team", { scroll: false })
    }
  }, [searchParams])

  async function loadTeamData() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      // Load user profile to check if they're a team owner
      const { data: userData } = await supabase
        .from("users")
        .select("is_team_owner, seats_count, team_owner_id")
        .eq("id", session.user.id)
        .single()

      if (userData) {
        setIsTeamOwner(userData.is_team_owner)
        setSeatsCount(userData.seats_count || 3)

        // If user is a team owner, load their team members
        if (userData.is_team_owner) {
          // Load team members
          const { data: members } = await supabase
            .from("users")
            .select("id, email, is_team_owner, created_at")
            .or(`id.eq.${session.user.id},team_owner_id.eq.${session.user.id}`)
            .order("created_at", { ascending: true })

          if (members) {
            setTeamMembers(members)
            setSeatsUsed(members.length)
          }

          // Load pending invitations
          const { data: invites } = await supabase
            .from("team_invitations")
            .select("*")
            .eq("team_owner_id", session.user.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false })

          if (invites) {
            setInvitations(invites)
          }
        } else {
          // If user is a team member, show their team owner's info
          const { data: ownerData } = await supabase
            .from("users")
            .select("id, email, is_team_owner, created_at")
            .eq("id", userData.team_owner_id)
            .single()

          if (ownerData) {
            const { data: allMembers } = await supabase
              .from("users")
              .select("id, email, is_team_owner, created_at")
              .or(`id.eq.${userData.team_owner_id},team_owner_id.eq.${userData.team_owner_id}`)
              .order("created_at", { ascending: true })

            if (allMembers) {
              setTeamMembers(allMembers)
              setSeatsUsed(allMembers.length)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading team data:", error)
      toast({
        title: "Error",
        description: "Failed to load team information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleInviteTeamMember() {
    if (!inviteEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      })
      return
    }

    // Check if user has reached their seat limit
    const totalUsedSeats = seatsUsed + invitations.length
    if (totalUsedSeats >= seatsCount) {
      toast({
        title: "Seat limit reached",
        description: `You've reached your team limit (${seatsCount} seats). Upgrade your plan to add more members.`,
        variant: "destructive",
      })
      return
    }

    setInviting(true)
    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation")
      }

      toast({
        title: data.email_failed ? "Warning" : "Success",
        description: data.message || `Invitation sent to ${inviteEmail}`,
        variant: data.email_failed ? "destructive" : "default",
      })

      setInviteEmail("")
      setInviteDialogOpen(false)
      loadTeamData()
    } catch (error: any) {
      console.error("Error inviting team member:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      })
    } finally {
      setInviting(false)
    }
  }

  async function handleRemoveTeamMember() {
    if (!memberToRemove) return

    try {
      const response = await fetch("/api/team/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: memberToRemove.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove team member")
      }

      toast({
        title: "Success",
        description: "Team member removed successfully",
      })

      setRemoveDialogOpen(false)
      setMemberToRemove(null)
      loadTeamData()
    } catch (error: any) {
      console.error("Error removing team member:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member",
        variant: "destructive",
      })
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    try {
      const response = await fetch("/api/team/cancel-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel invitation")
      }

      toast({
        title: "Success",
        description: "Invitation canceled",
      })

      loadTeamData()
    } catch (error: any) {
      console.error("Error canceling invitation:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invitation",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <TeamLoading />
  }

  const availableSeats = seatsCount - seatsUsed - invitations.length

  return (
    <div className="space-y-6">
      {/* Team Overview Card */}
      <Card className="glass-card border border-sage-medium/30 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-dark-bg mb-1">Team Members</h2>
            <p className="text-sm text-gray-600">
              {isTeamOwner
                ? "Manage your team members and invitations."
                : "View your team members. Contact your team owner to manage the team."}
            </p>
          </div>
          {isTeamOwner && (
            <Button
              onClick={() => setInviteDialogOpen(true)}
              disabled={availableSeats <= 0}
              className="bg-dark-bg text-white hover:bg-dark-bg/90"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>

        {/* Seats Info */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-sage-light/20 rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium text-dark-bg">Team Seats</p>
            <p className="text-xs text-gray-600 mt-1">
              {seatsUsed} of {seatsCount} seats used • {invitations.length} pending invitation{invitations.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-bold text-dark-bg">{availableSeats}</p>
            <p className="text-xs text-gray-600">available</p>
          </div>
        </div>

        {availableSeats <= 0 && isTeamOwner && (
          <div className="mb-6 border border-border rounded-lg overflow-hidden">
            {/* Collapsed bar */}
            <button
              type="button"
              onClick={() => setSeatsExpanded(!seatsExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-foreground/[0.04] transition-colors"
              aria-expanded={seatsExpanded}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-sm text-foreground/60">
                  <strong className="text-foreground font-semibold">All seats in use.</strong>{" "}
                  Need more room?
                </span>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-mint">
                Add seats
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    seatsExpanded ? "rotate-180" : ""
                  }`}
                />
              </span>
            </button>

            {/* Expandable panel */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                seatsExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border px-4 py-4">
                  <div className="flex items-start gap-6">
                    {/* Left: copy + selector */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground mb-1">
                        Add team seats
                      </p>
                      <p className="text-xs text-foreground/50 leading-relaxed mb-3">
                        Each seat is <strong className="text-foreground font-semibold">$15/month</strong>,
                        billed to the card on file. New seats are available
                        immediately and can be removed anytime from Billing.
                      </p>
                      <div className="flex items-center gap-3">
                        <label
                          htmlFor="seat-select"
                          className="text-xs font-medium text-foreground/50 whitespace-nowrap"
                        >
                          How many?
                        </label>
                        <select
                          id="seat-select"
                          value={seatQuantity}
                          onChange={(e) => setSeatQuantity(Number(e.target.value))}
                          className="h-9 rounded-md border border-input bg-white px-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2710%27%20height%3D%276%27%20viewBox%3D%270%200%2010%206%27%20fill%3D%27none%27%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%3E%3Cpath%20d%3D%27M1%201L5%205L9%201%27%20stroke%3D%27%231a274980%27%20stroke-width%3D%271.5%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[center_right_0.75rem] cursor-pointer"
                          aria-label="Number of seats to add"
                        >
                          {[1, 2, 3, 5, 10].map((n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? "seat" : "seats"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Right: price summary + CTA */}
                    <div className="shrink-0 bg-foreground/[0.04] rounded-lg px-5 py-4 text-center min-w-[140px]">
                      <p className="text-2xl font-semibold text-foreground leading-none font-serif">
                        ${seatQuantity * 15}
                      </p>
                      <p className="text-[11px] text-foreground/50 mt-0.5 mb-3">
                        per month
                      </p>
                      <Button
                        size="sm"
                        disabled={addingSeats}
                        onClick={async () => {
                          setAddingSeats(true)
                          try {
                            const res = await fetch("/api/stripe/add-seats", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ quantity: seatQuantity }),
                            })
                            const data = await res.json()
                            if (!res.ok) throw new Error(data.error)
                            if (data.url) window.location.href = data.url
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: error.message || "Failed to start checkout",
                              variant: "destructive",
                            })
                          } finally {
                            setAddingSeats(false)
                          }
                        }}
                        className="w-full bg-dark-bg text-white hover:bg-dark-bg/90"
                      >
                        {addingSeats ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Add Seats"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Members Table */}
        <div className="border border-sage-medium/30 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-sage-medium/10 hover:bg-sage-medium/10">
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {isTeamOwner && <TableHead className="w-[100px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isTeamOwner ? 4 : 3} className="h-32 text-center text-gray-500">
                    No team members found
                  </TableCell>
                </TableRow>
              ) : (
                teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <span className="font-medium">{member.email}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          member.is_team_owner
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {member.is_team_owner ? "Owner" : "Member"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(member.created_at).toLocaleDateString()}
                    </TableCell>
                    {isTeamOwner && (
                      <TableCell>
                        {!member.is_team_owner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMemberToRemove(member)
                              setRemoveDialogOpen(true)
                            }}
                            className="text-coral hover:text-coral hover:bg-coral/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pending Invitations */}
      {isTeamOwner && invitations.length > 0 && (
        <Card className="glass-card border border-sage-medium/30 p-6">
          <h3 className="text-lg font-semibold text-dark-bg mb-4">Pending Invitations</h3>
          <div className="border border-sage-medium/30 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-sage-medium/10 hover:bg-sage-medium/10">
                  <TableHead>Email</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <span>{invitation.invitee_email}</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(invitation.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                        className="text-gray-600 hover:text-coral hover:bg-coral/10"
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to add a new team member. They'll receive an email with instructions to join your team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleInviteTeamMember()
                  }
                }}
              />
            </div>
            <p className="text-xs text-gray-500">
              Available seats: {availableSeats} of {seatsCount}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setInviteDialogOpen(false)
                setInviteEmail("")
              }}
              className="border-sage-medium/30"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteTeamMember}
              disabled={inviting || !inviteEmail}
              className="bg-dark-bg text-white hover:bg-dark-bg/90"
            >
              {inviting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this team member? They will lose access to the account immediately.
            </DialogDescription>
            {memberToRemove && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="font-medium text-sm text-dark-bg">{memberToRemove.email}</p>
              </div>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRemoveDialogOpen(false)
                setMemberToRemove(null)
              }}
              className="border-sage-medium/30"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemoveTeamMember}
              className="bg-coral text-white hover:bg-coral/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
