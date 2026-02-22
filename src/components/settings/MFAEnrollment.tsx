"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, Check, AlertCircle } from "lucide-react"

type EnrollmentStep = "idle" | "scanning" | "verifying"

export function MFAEnrollment() {
  const supabase = createClient()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)

  // Enrollment state
  const [step, setStep] = useState<EnrollmentStep>("idle")
  const [qrCode, setQrCode] = useState<string>("")
  const [totpSecret, setTotpSecret] = useState<string>("")
  const [pendingFactorId, setPendingFactorId] = useState<string>("")
  const [verifyCode, setVerifyCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [enrollError, setEnrollError] = useState("")
  const [copiedSecret, setCopiedSecret] = useState(false)

  // Unenroll state
  const [unenrolling, setUnenrolling] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)

  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMFAStatus()
  }, [])

  // Auto-focus code input when scanning step completes
  useEffect(() => {
    if (step === "scanning" && codeInputRef.current) {
      codeInputRef.current.focus()
    }
  }, [step])

  async function loadMFAStatus() {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error

      const verifiedFactors = data.totp.filter((f) => f.status === "verified")
      if (verifiedFactors.length > 0) {
        setMfaEnabled(true)
        setFactorId(verifiedFactors[0].id)
      } else {
        setMfaEnabled(false)
        setFactorId(null)
      }
    } catch (err) {
      console.error("Error loading MFA status:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleStartEnrollment() {
    setEnrollError("")
    setStep("scanning")

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      })

      if (error) {
        setEnrollError(error.message)
        setStep("idle")
        return
      }

      setQrCode(data.totp.qr_code)
      setTotpSecret(data.totp.secret)
      setPendingFactorId(data.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setEnrollError(err.message || "Failed to start MFA enrollment")
      setStep("idle")
    }
  }

  async function handleVerifyEnrollment() {
    if (verifyCode.length !== 6) {
      setEnrollError("Please enter a 6-digit code")
      return
    }

    setVerifying(true)
    setEnrollError("")

    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: pendingFactorId,
        code: verifyCode,
      })

      if (error) {
        setEnrollError(error.message)
        setVerifying(false)
        return
      }

      // Success
      setMfaEnabled(true)
      setFactorId(pendingFactorId)
      setStep("idle")
      setQrCode("")
      setTotpSecret("")
      setPendingFactorId("")
      setVerifyCode("")

      toast({
        title: "MFA enabled",
        description: "Two-factor authentication is now active on your account.",
      })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setEnrollError(err.message || "Verification failed. Please try again.")
    } finally {
      setVerifying(false)
    }
  }

  async function handleCancelEnrollment() {
    // Unenroll the pending factor if one was created
    if (pendingFactorId) {
      await supabase.auth.mfa.unenroll({ factorId: pendingFactorId }).catch(() => {})
    }
    setStep("idle")
    setQrCode("")
    setTotpSecret("")
    setPendingFactorId("")
    setVerifyCode("")
    setEnrollError("")
  }

  async function handleDisableMFA() {
    if (!factorId) return

    setUnenrolling(true)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to disable MFA",
          variant: "destructive",
        })
        return
      }

      setMfaEnabled(false)
      setFactorId(null)
      setConfirmDisable(false)

      toast({
        title: "MFA disabled",
        description: "Two-factor authentication has been removed from your account.",
      })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to disable MFA",
        variant: "destructive",
      })
    } finally {
      setUnenrolling(false)
    }
  }

  function handleCopySecret() {
    navigator.clipboard.writeText(totpSecret)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  function handleCodeChange(value: string) {
    // Only allow digits, max 6
    const cleaned = value.replace(/\D/g, "").slice(0, 6)
    setVerifyCode(cleaned)
    setEnrollError("")
  }

  if (loading) {
    return (
      <Card className="glass-card border border-sage-medium/30 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">Loading security settings...</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="glass-card border border-sage-medium/30 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-dark-bg mb-1">Two-factor authentication</h2>
            <p className="text-sm text-gray-600">
              Add an extra layer of security to your account using an authenticator app.
            </p>
          </div>
          {mfaEnabled ? (
            <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Enabled
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-500 border-gray-300">
              <ShieldOff className="w-3 h-3 mr-1" />
              Disabled
            </Badge>
          )}
        </div>

        {/* MFA Enabled State */}
        {mfaEnabled && step === "idle" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Your account is protected with two-factor authentication.
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  You will be asked for a verification code when signing in.
                </p>
              </div>
            </div>

            {!confirmDisable ? (
              <Button
                variant="outline"
                onClick={() => setConfirmDisable(true)}
                className="border-coral/30 text-coral hover:bg-coral/5 hover:text-coral"
              >
                <ShieldOff className="w-4 h-4 mr-2" />
                Disable MFA
              </Button>
            ) : (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Are you sure you want to disable MFA?
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      This will remove the extra security on your account.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDisable(false)}
                    className="border-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDisableMFA}
                    disabled={unenrolling}
                    className="bg-coral text-white hover:bg-coral/90"
                  >
                    {unenrolling ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Disabling...
                      </>
                    ) : (
                      "Yes, disable MFA"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MFA Disabled - Enable Button */}
        {!mfaEnabled && step === "idle" && (
          <Button
            onClick={handleStartEnrollment}
            className="bg-dark-bg text-white hover:bg-dark-bg/90"
          >
            <Shield className="w-4 h-4 mr-2" />
            Enable MFA
          </Button>
        )}

        {/* Enrollment Flow - QR Code + Verification */}
        {step === "scanning" && (
          <div className="space-y-5">
            {/* Step 1: Scan QR Code */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-dark-bg text-white flex items-center justify-center text-xs font-medium">
                  1
                </div>
                <h3 className="text-sm font-semibold text-dark-bg">
                  Scan QR code with your authenticator app
                </h3>
              </div>
              <p className="text-xs text-gray-500 ml-8">
                Use an app like Google Authenticator, Authy, or 1Password to scan the code below.
              </p>

              {qrCode ? (
                <div className="ml-8 space-y-3">
                  {/* QR Code */}
                  <div className="inline-block p-4 bg-white rounded-lg border border-sage-medium/30 shadow-sm">
                    <img
                      src={qrCode}
                      alt="Scan this QR code with your authenticator app"
                      className="w-48 h-48"
                      width={192}
                      height={192}
                    />
                  </div>

                  {/* Manual entry secret */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-500">
                      Or enter this code manually in your authenticator app:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="px-3 py-2 bg-gray-100 rounded-md text-sm font-mono text-dark-bg tracking-wider select-all break-all max-w-xs">
                        {totpSecret}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopySecret}
                        className="flex-shrink-0 h-8 w-8 p-0"
                        aria-label="Copy secret to clipboard"
                      >
                        {copiedSecret ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ml-8 flex items-center gap-2 py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">Generating QR code...</span>
                </div>
              )}
            </div>

            {/* Step 2: Verify Code */}
            {qrCode && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-dark-bg text-white flex items-center justify-center text-xs font-medium">
                    2
                  </div>
                  <h3 className="text-sm font-semibold text-dark-bg">
                    Enter the 6-digit code from your app
                  </h3>
                </div>

                <div className="ml-8 space-y-3">
                  <div className="space-y-2 max-w-xs">
                    <Label htmlFor="mfa-verify-code" className="sr-only">
                      Verification code
                    </Label>
                    <Input
                      ref={codeInputRef}
                      id="mfa-verify-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={verifyCode}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && verifyCode.length === 6) {
                          handleVerifyEnrollment()
                        }
                      }}
                      className={`text-center text-lg tracking-[0.3em] font-mono h-12 ${
                        enrollError ? "border-coral focus-visible:ring-coral" : ""
                      }`}
                      maxLength={6}
                      aria-describedby={enrollError ? "mfa-enroll-error" : undefined}
                    />
                  </div>

                  {enrollError && (
                    <div
                      id="mfa-enroll-error"
                      className="flex items-center gap-2 text-sm text-coral"
                      role="alert"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {enrollError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEnrollment}
                      className="border-sage-medium/30"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleVerifyEnrollment}
                      disabled={verifying || verifyCode.length !== 6}
                      className="bg-dark-bg text-white hover:bg-dark-bg/90"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify and enable"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
