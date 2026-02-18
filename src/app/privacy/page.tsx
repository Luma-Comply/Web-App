import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LumaLogo } from "@/components/LumaLogo"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Privacy Policy - Luma",
  description: "Privacy Policy for Luma - Medical Necessity Documentation Platform",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F4F4EE" }}>
      {/* Header */}
      <nav className="sticky top-0 z-50 border-b border-border" style={{ backgroundColor: "#F4F4EE" }}>
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <LumaLogo className="w-10 h-10" />
            <span className="text-2xl font-serif font-bold text-dark-bg">Luma</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-sans font-semibold text-dark-bg mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-600 mb-12">
            Last updated: January 20, 2026
          </p>

          <div className="prose max-w-none prose-p:text-base prose-li:text-base">
            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">Introduction</h2>
              <p className="text-gray-700 mb-4">
                Luma Health (&quot;Luma,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our medical necessity documentation platform.
              </p>
              <p className="text-gray-700">
                By using Luma, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">Information We Collect</h2>

              <h3 className="text-xl font-semibold text-dark-bg mb-3">Account Information</h3>
              <p className="text-gray-700 mb-4">
                When you create an account, we collect:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
                <li>Email address</li>
                <li>Name</li>
                <li>Practice name</li>
                <li>NPI number (optional)</li>
                <li>Specialty</li>
              </ul>

              <h3 className="text-xl font-semibold text-dark-bg mb-3">Patient Data (Limited Clinical Context)</h3>
              <p className="text-gray-700 mb-4">
                Luma is designed to operate without Protected Health Information (PHI). We collect only the minimum clinical context needed for documentation generation:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
                <li>Age or age range (not date of birth)</li>
                <li>State of residence (no full address)</li>
                <li>Payer/insurance company name</li>
                <li>Diagnosis codes (ICD-10)</li>
                <li>Clinical details and treatment history</li>
                <li>Medication names and dosages</li>
              </ul>

              <h3 className="text-xl font-semibold text-dark-bg mb-3">Information We Do NOT Collect</h3>
              <p className="text-gray-700 mb-4">
                To maintain HIPAA compliance through the Safe Harbor de-identification method, we do not collect:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
                <li>Dates of birth</li>
                <li>Social Security numbers</li>
                <li>Medical record numbers (MRN)</li>
                <li>Full street addresses</li>
                <li>Phone numbers or email addresses of patients</li>
                <li>Insurance member IDs</li>
                <li>Exact dates of service</li>
                <li>Any other HIPAA-defined identifiers</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Provide and maintain our documentation generation service</li>
                <li>Process and manage your account</li>
                <li>Generate medical necessity documentation using AI</li>
                <li>Research payer requirements and policies</li>
                <li>Process payments and subscriptions</li>
                <li>Send transactional emails (password resets, account notifications)</li>
                <li>Improve our services and develop new features</li>
                <li>Respond to customer support requests</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">AI Processing and Third-Party Services</h2>
              <p className="text-gray-700 mb-4">
                Luma uses AI services to generate documentation. Our AI providers maintain strict data handling practices:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
                <li>Zero data retention policies for API requests</li>
                <li>SOC 2 Type II certified infrastructure</li>
                <li>No PHI is sent to AI providers — all patient identifiers are stripped before any outbound API call</li>
                <li>Compliance with HIPAA security and privacy requirements</li>
              </ul>
              <p className="text-gray-700">
                Data sent to AI providers is processed in real-time and is not stored or used for model training.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>SOC 2 Type II certified infrastructure</li>
                <li>End-to-end encryption for data in transit (TLS 1.3)</li>
                <li>Encryption at rest (AES-256)</li>
                <li>Regular security audits and penetration testing</li>
                <li>Role-based access controls</li>
                <li>Automated PHI pattern detection and blocking</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your data as follows:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Account data:</strong> Retained while your account is active and for 30 days after deletion request</li>
                <li><strong>Generated documentation:</strong> Stored until you delete the case or your account</li>
                <li><strong>Payment records:</strong> Retained as required by law (typically 7 years)</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">Your Rights</h2>
              <p className="text-gray-700 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your account and data</li>
                <li>Export your data in a portable format</li>
                <li>Opt out of marketing communications</li>
              </ul>
              <p className="text-gray-700 mt-4">
                To exercise these rights, contact us at{" "}
                <a href="mailto:hello@useluma.io" className="text-mint hover:underline">
                  hello@useluma.io
                </a>
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">HIPAA Compliance</h2>
              <p className="text-gray-700 mb-4">
                Luma is designed to operate without collecting Protected Health Information (PHI) as defined by HIPAA. By using the Safe Harbor de-identification method, the limited patient context we collect (clinical data) does not constitute PHI.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>Business Associate Agreement (BAA):</strong> Because PHI is not collected or processed in our standard workflow, a BAA is generally not required. For organizations with internal policies requiring a BAA regardless of PHI handling, we offer enterprise arrangements.
              </p>
              <p className="text-gray-700">
                <strong>User Responsibility:</strong> Users are responsible for ensuring they do not enter PHI into free text fields. Our platform includes automated detection that blocks common PHI patterns such as Social Security numbers and dates of birth.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">Cookies and Tracking</h2>
              <p className="text-gray-700 mb-4">
                We use essential cookies to maintain your session and preferences. We do not use third-party advertising cookies or sell your data to advertisers.
              </p>
              <p className="text-gray-700">
                We may use privacy-respecting analytics to understand how our service is used and to improve the user experience.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">Contact Us</h2>
              <p className="text-gray-700">
                If you have any questions about this Privacy Policy, please contact us at:{" "}
                <a href="mailto:hello@useluma.io" className="text-mint hover:underline">
                  hello@useluma.io
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          © 2026 Luma Health. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
