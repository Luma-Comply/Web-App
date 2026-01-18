"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Mail, Eye, EyeOff } from "lucide-react"

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

  // Password
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
      const emailChanged = email !== originalEmail
      
      // Update user metadata (name)
      const updateData: any = {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      }

      // Only update email if it changed
      if (emailChanged) {
        updateData.email = email
        // Set redirect URL for email change confirmation
        // This ensures the custom email template's redirect link works correctly
        updateData.options = {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback?type=email_change&next=/settings/profile`,
        }
      }

      const { data: updateResponse, error: updateError } = await supabase.auth.updateUser(updateData)

      if (updateError) throw updateError

      // Get current user to check email status
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("User not found")
      }

      // Update public.users table with new email (if changed) and metadata
      const { error: dbError } = await supabase
        .from('users')
        .update({
          email: user.email || email, // Use confirmed email or new email
        })
        .eq('id', user.id)

      if (dbError) {
        console.error("Error updating users table:", dbError)
        // Don't throw - auth update succeeded, DB update is secondary
      }

      // If email changed, check if confirmation is required
      if (emailChanged) {
        // Check if email was actually updated or is pending confirmation
        if (user.email === originalEmail) {
          // Email change is pending confirmation - Supabase will send confirmation email
          toast({
            title: "Email change pending",
            description: `A confirmation email has been sent to ${email}. Please check your inbox and click the link to complete the change.`,
            variant: "default",
          })
        } else {
          // Email was updated immediately (secure email change is disabled)
          setOriginalEmail(user.email || email)
          toast({
            title: "Success",
            description: "Profile updated successfully",
          })
        }
      } else {
        // Only metadata changed, no email change
        setOriginalEmail(user.email || email)
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
    // Validate current password is provided
    if (!currentPassword) {
      toast({
        title: "Error",
        description: "Please enter your current password",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    setUpdatingPassword(true)
    try {
      // First, verify the current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !user.email) {
        throw new Error("User not found")
      }

      // Verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (verifyError) {
        throw new Error("Current password is incorrect")
      }

      // Current password is correct, now update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Password updated successfully",
      })

      // Clear password fields
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      console.error("Error updating password:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      })
    } finally {
      setUpdatingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    )
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
                  className="bg-white border-sage-medium/30"
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
                  className="bg-white border-sage-medium/30"
                />
              </div>
            </div>

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
                  className="pl-10 bg-white border-sage-medium/30"
                />
              </div>
              <p className="text-xs text-gray-500">Changing your email will require verification at the new address.</p>
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
                  className="bg-white border-sage-medium/30 pr-10"
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
                  className="bg-white border-sage-medium/30 pr-10"
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
                  className="bg-white border-sage-medium/30 pr-10"
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
              disabled={updatingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="bg-dark-bg text-white hover:bg-dark-bg/90"
            >
              {updatingPassword ? "Updating..." : "Update password"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
