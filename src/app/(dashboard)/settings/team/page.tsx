"use client"

import TeamLoading from "./loading"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { UserPlus, Trash2 } from "lucide-react"

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

  useEffect(() => {
    loadTeamData()
  }, [])

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
          <div className="mb-6 p-4 bg-coral/10 border border-coral/30 rounded-lg">
            <p className="text-sm text-coral">
              You've reached your team limit. <Button variant="link" className="text-coral underline p-0 h-auto" onClick={() => router.push("/settings/billing")}>Upgrade your plan</Button> to add more members.
            </p>
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
