"use client"

export function ComplianceSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif text-dark-bg mb-4">
            Built to Avoid PHI
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mb-12">
            Luma collects only the minimum clinical context needed for AI generation.
            <br />
            No protected health information required.
          </p>

          {/* Two column grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* What we do NOT collect */}
            <div className="bg-white border border-border rounded-lg p-8">
              <h3 className="text-xl font-semibold text-dark-bg mb-6">
                What we do not collect
              </h3>
              <ul className="space-y-3 text-foreground/80">
                <li className="flex items-start gap-3">
                  <span className="text-coral mt-0.5 font-medium">×</span>
                  <span>Date of birth</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-coral mt-0.5 font-medium">×</span>
                  <span>Medical record numbers</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-coral mt-0.5 font-medium">×</span>
                  <span>Full street addresses</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-coral mt-0.5 font-medium">×</span>
                  <span>Phone numbers or email addresses</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-coral mt-0.5 font-medium">×</span>
                  <span>Insurance member IDs</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-coral mt-0.5 font-medium">×</span>
                  <span>Exact dates of service</span>
                </li>
              </ul>
            </div>

            {/* What we DO collect */}
            <div className="bg-white border border-border rounded-lg p-8">
              <h3 className="text-xl font-semibold text-dark-bg mb-6">
                What we do collect
              </h3>
              <ul className="space-y-3 text-foreground/80">
                <li className="flex items-start gap-3">
                  <span className="text-mint mt-0.5 font-medium">✓</span>
                  <span>Age or age range</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-mint mt-0.5 font-medium">✓</span>
                  <span>State only (no city or zip)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-mint mt-0.5 font-medium">✓</span>
                  <span>Payer name (insurance company)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-mint mt-0.5 font-medium">✓</span>
                  <span>Diagnosis codes and clinical details</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-mint mt-0.5 font-medium">✓</span>
                  <span>Treatment history and medication names</span>
                </li>
              </ul>
            </div>
          </div>

          {/* BAA Statement */}
          <div className="bg-white border border-border rounded-lg p-8">
            <p className="text-foreground/80">
              <strong className="text-dark-bg">Business Associate Agreement:</strong>{" "}
              Because PHI is not collected or processed in this workflow, a BAA is generally not required. For organizations with internal policies requiring a BAA regardless of PHI handling, we can discuss enterprise arrangements.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Users are responsible for ensuring they do not paste PHI into free text fields. Our platform blocks common PHI patterns like Social Security numbers and dates of birth.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// Compact version for sidebar
export function ComplianceBlock() {
  return (
    <div className="bg-white border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-dark-bg mb-2">
        HIPAA Compliant by Design
      </h3>
      <p className="text-sm text-foreground/80 mb-3">
        Luma collects only limited patient context (age, state, diagnosis) and does not store PHI such as date of birth, MRN, full address, or insurance member IDs.
      </p>
      <p className="text-xs text-muted-foreground">
        <strong>BAA:</strong> Generally not required for this workflow. Enterprise arrangements available.
      </p>
    </div>
  )
}
