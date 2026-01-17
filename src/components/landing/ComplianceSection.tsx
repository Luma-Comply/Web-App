"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck } from "lucide-react"

export function ComplianceSection() {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-light-gray/30 to-white pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <ShieldCheck className="w-4 h-4 mr-2" />
              HIPAA Compliant
            </Badge>
            <h2 className="text-4xl md:text-5xl font-serif text-dark-bg mb-6">
              Built to avoid PHI
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Luma is designed so your clinic can generate compliant documentation without entering protected health information. We collect only the minimum clinical context needed for AI generation.
            </p>
          </div>

          {/* Two column grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* What we do NOT collect */}
            <Card className="p-6 glass-card border border-coral/20">
              <h3 className="text-xl font-serif text-dark-bg mb-4">
                What we do not collect
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-coral mr-3 mt-1">×</span>
                  <span>Date of birth</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral mr-3 mt-1">×</span>
                  <span>Medical record numbers</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral mr-3 mt-1">×</span>
                  <span>Full street addresses</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral mr-3 mt-1">×</span>
                  <span>Phone numbers or email addresses</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral mr-3 mt-1">×</span>
                  <span>Insurance member IDs</span>
                </li>
                <li className="flex items-start">
                  <span className="text-coral mr-3 mt-1">×</span>
                  <span>Exact dates of service</span>
                </li>
              </ul>
            </Card>

            {/* What we DO collect */}
            <Card className="p-6 glass-card border border-mint/20">
              <h3 className="text-xl font-serif text-dark-bg mb-4">
                What we do collect
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-mint mr-3 mt-1">✓</span>
                  <span>First name only</span>
                </li>
                <li className="flex items-start">
                  <span className="text-mint mr-3 mt-1">✓</span>
                  <span>Age or age range</span>
                </li>
                <li className="flex items-start">
                  <span className="text-mint mr-3 mt-1">✓</span>
                  <span>State only (no city or zip)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-mint mr-3 mt-1">✓</span>
                  <span>Payer name (insurance company)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-mint mr-3 mt-1">✓</span>
                  <span>Diagnosis codes and clinical details</span>
                </li>
                <li className="flex items-start">
                  <span className="text-mint mr-3 mt-1">✓</span>
                  <span>Treatment history and medication names</span>
                </li>
              </ul>
            </Card>
          </div>

          {/* BAA Statement */}
          <Card className="p-6 glass-card border border-sage-medium/30 text-center">
            <p className="text-gray-700 mb-2">
              <strong>Business Associate Agreement:</strong> Because PHI is not collected or processed in this workflow, a BAA is generally not required. For organizations with internal policies requiring a BAA regardless of PHI handling, we can discuss enterprise arrangements.
            </p>
            <p className="text-sm text-gray-600 mt-4">
              Users are responsible for ensuring they do not paste PHI into free text fields. Our platform blocks common PHI patterns like Social Security numbers and dates of birth.
            </p>
          </Card>

          {/* AI Models Section */}
          <Card className="p-6 glass-card border border-mint/20 mt-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-mint flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-serif text-dark-bg mb-3">
                  HIPAA-Compliant AI Models
                </h3>
                <p className="text-gray-700 mb-3">
                  Luma uses two HIPAA-compliant AI providers with signed Business Associate Agreements:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-mint mr-3 mt-1">✓</span>
                    <span><strong>OpenAI GPT-4o</strong> for clinical documentation generation with zero data retention</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-mint mr-3 mt-1">✓</span>
                    <span><strong>Perplexity AI</strong> for research-driven tasks like payer policy lookups and medical literature search</span>
                  </li>
                </ul>
                <p className="text-sm text-gray-600 mt-3">
                  Both providers maintain SOC 2 Type II certification and meet all HIPAA security and privacy requirements.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}

// Compact version for pricing page or sidebar
export function ComplianceBlock() {
  return (
    <Card className="p-6 glass-card border border-sage-medium/30">
      <div className="flex items-start gap-3 mb-4">
        <ShieldCheck className="w-6 h-6 text-mint flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-lg font-serif text-dark-bg mb-2">
            HIPAA Compliant by Design
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            Luma collects only limited patient context (first name, age, state, diagnosis) and does not store PHI such as date of birth, MRN, full address, or insurance member IDs.
          </p>
          <p className="text-xs text-gray-600">
            <strong>BAA:</strong> Generally not required for this workflow. Enterprise arrangements available for organizations with specific policy requirements.
          </p>
        </div>
      </div>
    </Card>
  )
}
