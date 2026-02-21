"use client"

import ProfileLoading from "./loading"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Mail, Eye, EyeOff, Building2 } from "lucide-react"
import { updateProfile, updatePassword } from "@/app/actions/profile"
import { MFAEnrollment } from "@/components/settings/MFAEnrollment"

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Personal info
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [originalEmail, setOriginalEmail] = useState("")

  // Organization info
  const [practiceName, setPracticeName] = useState("")
  const [isTeamOwner, setIsTeamOwner] = useState(false)

  // Password
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Password Requirements State
  const [hasMinLength, setHasMinLength] = useState(false)
  const [hasUpperCase, setHasUpperCase] = useState(false)
  const [hasNumber, setHasNumber] = useState(false)
  const [hasSpecialChar, setHasSpecialChar] = useState(false)
  const [passwordsMatch, setPasswordsMatch] = useState(false)

  // Real-time validation effect
  useEffect(() => {
    setHasMinLength(newPassword.length >= 8)
    setHasUpperCase(/[A-Z]/.test(newPassword))
    setHasNumber(/[0-9]/.test(newPassword))
    setHasSpecialChar(/[!@#$%^&*(),.?":{}|<>]/.test(newPassword))
    setPasswordsMatch(newPassword === confirmPassword && newPassword !== "")
  }, [newPassword, confirmPassword])

  const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar && passwordsMatch

  useEffect(() => {
    loadUserProfile()
  }, [])

  async function loadUserProfile() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      const userEmail = session.user.email || ""
      setEmail(userEmail)
      setOriginalEmail(userEmail)

      // Load user metadata if available
      const metadata = session.user.user_metadata || {}
      setFirstName(metadata.first_name || "")
      setLastName(metadata.last_name || "")

      // Load organization info from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("practice_name, is_team_owner, team_owner_id")
        .eq("id", session.user.id)
        .single()

      if (!userError && userData) {
        // User is considered an owner if is_team_owner=true OR if they have no team_owner_id
        // (meaning they signed up independently and own their own account)
        const isOwner = userData.is_team_owner || !userData.team_owner_id
        setIsTeamOwner(isOwner)

        // If user is a team member (has a team_owner_id), fetch owner's practice name
        if (userData.team_owner_id) {
          const { data: ownerData } = await supabase
            .from("users")
            .select("practice_name")
            .eq("id", userData.team_owner_id)
            .single()

          setPracticeName(ownerData?.practice_name || "")
        } else {
          // User is independent/owner - use their own practice_name
          setPracticeName(userData.practice_name || "")
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error)
      toast({
        title: "Error",
        description: "Failed to load profile information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const result = await updateProfile({
        firstName,
        lastName,
        email,
        practiceName: isTeamOwner ? practiceName : undefined,
      })

      if (result.success) {
        // Update local state
        const { data: { session } } = await supabase.auth.refreshSession()
        if (session?.user) {
          setEmail(session.user.email || email)
          setOriginalEmail(session.user.email || email)
        } else {
          // Fallback if refresh doesn't immediately reflect
          setOriginalEmail(email)
        }

        toast({
          title: "Success",
          description: "Profile updated successfully",
        })
      }
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdatePassword() {
    setUpdatingPassword(true)
    try {
      const result = await updatePassword({
        currentPassword,
        newPassword,
        confirmPassword
      })

      if (result.success) {
        toast({
          title: "Success",
          description: "Password updated successfully",
        })

        // Clear password fields
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update password",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error updating password:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setUpdatingPassword(false)
    }
  }

  if (loading) {
    return <ProfileLoading />
  }

  return (
    <div className="space-y-8">
      {/* Personal Info Section */}
      <Card className="glass-card border border-sage-medium/30 p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-dark-bg mb-1">Personal info</h2>
            <p className="text-sm text-gray-600">Update your photo and personal details here.</p>
          </div>

          <div className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-dark-bg">
                  First Name <span className="text-coral">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-dark-bg">
                  Last Name <span className="text-coral">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Organization Name Field - Only shown for team owners */}
            {isTeamOwner && (
              <div className="space-y-2">
                <Label htmlFor="practiceName" className="text-sm font-medium text-dark-bg">
                  Organization / Practice Name <span className="text-coral">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="practiceName"
                    type="text"
                    value={practiceName}
                    onChange={(e) => setPracticeName(e.target.value)}
                    className="pl-10"
                    placeholder="Your Practice Name"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-dark-bg">
                Email address <span className="text-coral">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-sage-medium/30">
            <Button
              variant="outline"
              onClick={() => loadUserProfile()}
              className="border-sage-medium/30"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-dark-bg text-white hover:bg-dark-bg/90"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Password Section */}
      <Card className="glass-card border border-sage-medium/30 p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-dark-bg mb-1">Password</h2>
            <p className="text-sm text-gray-600">Please enter your current password to change your password.</p>
          </div>

          <div className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-sm font-medium text-dark-bg">
                Current password <span className="text-coral">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium text-dark-bg">
                New password <span className="text-coral">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">Your new password must be more than 8 characters.</p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-dark-bg">
                Confirm new password <span className="text-coral">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`pr-10 ${confirmPassword && !passwordsMatch ? "border-coral focus-visible:ring-coral" : ""
                    }`}
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

            {/* Validation Checklist */}
            <div className="space-y-2 pt-2 text-sm">
              <p className="font-medium text-gray-700">Password requirements:</p>
              <ul className="space-y-1 text-xs sm:text-sm">
                <li className={`flex items-center gap-2 ${hasMinLength ? "text-green-600" : "text-gray-500"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? "bg-green-600" : "bg-gray-300"}`} />
                  At least 8 characters
                </li>
                <li className={`flex items-center gap-2 ${hasUpperCase ? "text-green-600" : "text-gray-500"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${hasUpperCase ? "bg-green-600" : "bg-gray-300"}`} />
                  At least one uppercase letter (A-Z)
                </li>
                <li className={`flex items-center gap-2 ${hasNumber ? "text-green-600" : "text-gray-500"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${hasNumber ? "bg-green-600" : "bg-gray-300"}`} />
                  At least one number (0-9)
                </li>
                <li className={`flex items-center gap-2 ${hasSpecialChar ? "text-green-600" : "text-gray-500"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${hasSpecialChar ? "bg-green-600" : "bg-gray-300"}`} />
                  At least one special character (!@#$...)
                </li>
                <li className={`flex items-center gap-2 ${passwordsMatch ? "text-green-600" : "text-gray-500"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${passwordsMatch ? "bg-green-600" : "bg-gray-300"}`} />
                  Passwords match
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-sage-medium/30">
            <Button
              variant="outline"
              onClick={() => {
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
              }}
              className="border-sage-medium/30"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={updatingPassword || !isPasswordValid || !currentPassword}
              className="bg-dark-bg text-white hover:bg-dark-bg/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updatingPassword ? "Updating..." : "Update password"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Two-Factor Authentication Section */}
      <MFAEnrollment />
    </div>
  )
}
