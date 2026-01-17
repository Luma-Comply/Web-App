"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LumaLogo } from "@/components/LumaLogo"
import {
  ArrowLeft,
  Loader2,
  Copy,
  Sparkles,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

export default function NewCasePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [pastedText, setPastedText] = useState("")
  const [showFileUpload, setShowFileUpload] = useState(false)

  const [formData, setFormData] = useState({
    doc_type: "biologics_pa",
    patient_first_name: "",
    patient_last_name: "",
    patient_age: "",
    patient_state: "",
    claim_amount: "",
    payer_name: "",
  })

  // Basic change handler for flat inputs
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target

    if (name === "claim_amount") {
      const numericValue = value.replace(/,/g, "")
      setFormData((prev) => ({ ...prev, [name]: numericValue }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const formatCurrency = (value: string) => {
    if (!value) return ""
    const numeric = value.replace(/[^\d.]/g, "")
    const parts = numeric.split(".")
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0]
  }

  // Submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Basic validation
    if (!pastedText || pastedText.length < 50) {
      setError("Please paste detailed clinical notes (at least 50 characters).")
      return
    }

    setLoading(true)
    setError("")

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      // Check subscription status and cases remaining
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("subscription_status, cases_remaining, trial_ends_at")
        .eq("id", session.user.id)
        .single()

      if (userError || !user) {
        setError("Failed to verify subscription status. Please try again.")
        setLoading(false)
        return
      }

      // Check if user has access (trial or active subscription)
      const now = new Date()
      const trialEnded = user.trial_ends_at ? new Date(user.trial_ends_at) < now : true
      const hasActiveSubscription = user.subscription_status === "active"
      const isTrialing = user.subscription_status === "trialing" && !trialEnded

      if (!hasActiveSubscription && !isTrialing) {
        setError("Your trial has ended. Please subscribe to continue creating cases.")
        setLoading(false)
        router.push("/dashboard") // Redirect to dashboard to show upgrade prompt
        return
      }

      // Check if user has cases remaining
      if (user.cases_remaining <= 0) {
        setError("You've used all 50 cases this month. Upgrade or wait until next billing period.")
        setLoading(false)
        return
      }

      // Prepare case data
      // We map the pasted text to 'disease_activity' (primary context field)
      // and 'prior_treatments' (secondary) to ensure AI sees it.
      // Other specific fields like 'diagnosis_codes' get a default placeholder
      // so the AI Generator knows to extract them from the text.
      const caseInsert: any = {
        user_id: session.user.id,
        status: "draft",

        // 1. Key Fields Input Manually
        doc_type: formData.doc_type,
        patient_first_name: formData.patient_first_name,
        patient_last_name: formData.patient_last_name,
        patient_age: formData.patient_age ? parseInt(formData.patient_age) : 0,
        patient_state: formData.patient_state,
        claim_amount: formData.claim_amount ? parseFloat(formData.claim_amount.replace(/,/g, "")) : 0,
        payer_name: formData.payer_name, // User input

        // 2. Data from PASTE (The Source of Truth)
        // We put the full text in disease_activity as the main context carrier
        disease_activity: pastedText,

        // 3. Placeholders (AI will ignore these or use defaults)
        diagnosis_codes: ["See Notes"],
        lab_values: "See Clinical Notes",
        prior_treatments: "See Clinical Notes",
        requested_medication: "See Notes",
        medication_dose: "See Notes",
        payer_type: "commercial", // Default, can be inferred


        // 4. Metadata for UI to know this was a paste-only case
        metadata: {
          creation_method: "paste_only",
          original_pasted_text: pastedText
        },
      }

      // Create case
      const { data: caseData, error: insertError } = await supabase
        .from("cases")
        .insert(caseInsert)
        .select()
        .single()

      if (insertError) {
        throw new Error(insertError.message || insertError.hint || "Failed to create case")
      }

      if (!caseData) {
        throw new Error("Case was created but no data was returned")
      }

      // Decrement cases remaining (usage will be counted when AI generates)
      await supabase
        .from("users")
        .update({
          cases_remaining: user.cases_remaining - 1,
          cases_used_this_period: (user as any).cases_used_this_period + 1,
        })
        .eq("id", session.user.id)

      // Redirect to case processing/AI generation
      // This matches User intent: "go straight to perplexity ai" (conceptually)
      router.push(`/cases/${caseData.id}`)

    } catch (err: any) {
      console.error("Error creating case:", err)
      setError(err.message || "Failed to create case")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-gray to-white">
      {/* Header */}
      <header className="border-b border-sage-medium/50 glass-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LumaLogo className="w-8 h-8" />
            <span className="text-xl font-serif font-bold text-dark-bg">Luma</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-serif text-dark-bg mb-2">Create New Case</h1>
          <p className="text-gray-600">
            Select document type and paste clinical notes. Our AI will handle the rest.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-coral/10 border border-coral/20 text-coral">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ============================================== */}
          {/* 1. DOCUMENT TYPE (Top Priority)                */}
          {/* ============================================== */}
          <Card className="p-6 glass-card border border-sage-medium/30">
            <h2 className="text-xl font-serif text-dark-bg mb-4">1. Document Type</h2>
            <Label htmlFor="doc_type">What document do you need generated?</Label>
            <select
              id="doc_type"
              name="doc_type"
              value={formData.doc_type}
              onChange={handleChange}
              className="w-full mt-2 h-11 px-4 rounded-md border border-sage-medium bg-white focus:border-mint focus:ring-2 focus:ring-mint focus:ring-offset-0 outline-none"
            >
              <option value="biologics_pa">Biologics Prior Authorization</option>
              <option value="medical_necessity">Medical Necessity Letter</option>
              <option value="appeal">Appeal Letter</option>
            </select>
          </Card>

          {/* ============================================== */}
          {/* 2. KEY CONTEXT (Patient & Claim)               */}
          {/* ============================================== */}
          <Card className="p-6 glass-card border border-sage-medium/30">
            <h2 className="text-xl font-serif text-dark-bg mb-4">2. Patient & Claim Info</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Patient Name */}
              <div>
                <Label htmlFor="patient_first_name">First Name</Label>
                <Input
                  id="patient_first_name"
                  name="patient_first_name"
                  value={formData.patient_first_name}
                  onChange={handleChange}
                  placeholder="John"
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="patient_last_name">Last Name</Label>
                <Input
                  id="patient_last_name"
                  name="patient_last_name"
                  value={formData.patient_last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  className="mt-2"
                  required
                />
              </div>

              {/* Age & State */}
              <div>
                <Label htmlFor="patient_age">Age</Label>
                <Input
                  id="patient_age"
                  name="patient_age"
                  type="number"
                  value={formData.patient_age}
                  onChange={handleChange}
                  placeholder="45"
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="patient_state">State</Label>
                <Input
                  id="patient_state"
                  name="patient_state"
                  value={formData.patient_state}
                  onChange={handleChange}
                  placeholder="CA"
                  maxLength={2}
                  className="mt-2"
                  required
                />
              </div>

              {/* Insurance Payer - CRITICAL for AI */}
              <div className="md:col-span-2">
                <Label htmlFor="payer_name">Insurance Payer (Required for Research)</Label>
                <Input
                  id="payer_name"
                  name="payer_name"
                  value={formData.payer_name}
                  onChange={handleChange}
                  placeholder="e.g. Blue Cross Blue Shield, Aetna, Cigna"
                  className="mt-2"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The AI will research the specific policy for this payer.
                </p>
              </div>

              {/* Claim Amount */}
              <div className="md:col-span-2">
                <Label htmlFor="claim_amount">Estimated Claim Amount</Label>
                <div className="relative mt-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    id="claim_amount"
                    name="claim_amount"
                    type="text"
                    value={formatCurrency(formData.claim_amount)}
                    onChange={handleChange}
                    placeholder="35,808.23"
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* ============================================== */}
          {/* 3. PASTE CLINICAL RECORDS (The Source)         */}
          {/* ============================================== */}
          <Card className="p-6 glass-card border border-mint/30 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Copy className="w-5 h-5 text-mint" />
                  <h2 className="text-xl font-serif text-dark-bg">3. Paste Clinical Notes</h2>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Paste the full clinical context here (Progress Note, H&P, Previous Denial).
                  Our AI will read this to generate the letter.
                </p>
              </div>
              {pastedText.length > 0 && (
                <Badge variant="default" className="bg-mint text-white">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {pastedText.length} chars
                </Badge>
              )}
            </div>

            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="PASTE HERE... 

Example:
Patient is a 45yo male with RA. 
Failed Methotrexate (3 months) and Humira (6 months).
Current DAS28 is 5.2. 
Requesting Rinvoq 15mg daily."
              className="min-h-[300px] font-mono text-sm mb-4 bg-white/80"
            />
          </Card>





          {/* Submit Buttons */}
          <div className="flex gap-4 justify-end pt-4">
            <Link href="/dashboard">
              <Button type="button" variant="outline" size="lg">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="gap-2 bg-dark-bg hover:bg-dark-bg/90 text-white min-w-[200px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Case...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Documentation
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
