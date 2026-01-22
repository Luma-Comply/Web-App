import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LumaLogo } from "@/components/LumaLogo"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Terms of Service - Luma",
  description: "Terms of Service for Luma - Medical Necessity Documentation Platform",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-light-gray">
      {/* Header */}
      <nav className="sticky top-0 z-50 border-b border-sage-medium/50 glass-card">
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
            Terms of Service
          </h1>
          <p className="text-gray-600 mb-12">
            Last updated: January 20, 2026
          </p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing or using Luma (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of the terms, you may not access the Service.
              </p>
              <p className="text-gray-700">
                These Terms apply to all visitors, users, and others who access or use the Service, including healthcare providers, practice staff, and team members.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                Luma is an AI-powered platform that assists healthcare providers in generating medical necessity documentation for prior authorizations, appeals, and other clinical documentation needs. The Service includes:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>AI-generated medical necessity documentation</li>
                <li>Payer requirement research</li>
                <li>Document export (Word, PDF)</li>
                <li>Team collaboration features</li>
                <li>Case management tools</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">3. User Accounts</h2>
              <p className="text-gray-700 mb-4">
                To use the Service, you must create an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the security of your password and account</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
              <p className="text-gray-700 mt-4">
                We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activity.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">4. Acceptable Use</h2>
              <p className="text-gray-700 mb-4">You agree NOT to use the Service to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Generate fraudulent or misleading documentation</li>
                <li>Submit documentation for patients you do not treat</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Enter Protected Health Information (PHI) beyond the limited clinical context the platform is designed to accept</li>
                <li>Attempt to circumvent PHI detection safeguards</li>
                <li>Share account credentials with unauthorized users</li>
                <li>Reverse engineer, decompile, or disassemble the Service</li>
                <li>Use the Service for any illegal or unauthorized purpose</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">5. Healthcare Provider Responsibilities</h2>
              <p className="text-gray-700 mb-4">
                As a healthcare provider using Luma, you acknowledge and agree that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Professional Judgment:</strong> AI-generated documentation is a tool to assist you, not a replacement for your professional clinical judgment. You are responsible for reviewing and approving all documentation before submission.</li>
                <li><strong>Accuracy:</strong> You must verify that all generated documentation accurately reflects the patient&apos;s clinical situation and your medical opinion.</li>
                <li><strong>Compliance:</strong> You are responsible for ensuring that submitted documentation complies with all applicable laws, regulations, and payer requirements.</li>
                <li><strong>Patient Care:</strong> The Service does not provide medical advice. All clinical decisions remain your responsibility.</li>
                <li><strong>Data Entry:</strong> You are responsible for ensuring that no PHI beyond the allowed limited clinical context is entered into the platform.</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">6. Subscription and Payment</h2>
              <p className="text-gray-700 mb-4">
                <strong>Subscription Plans:</strong> The Service is offered on a subscription basis. Current pricing and features are available on our website.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>Free Trial:</strong> New users may be eligible for a free trial period. At the end of the trial, your account will convert to a paid subscription unless you cancel.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>Billing:</strong> Subscriptions are billed monthly. Payment is due at the beginning of each billing cycle.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>Cancellation:</strong> You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. No refunds are provided for partial months.
              </p>
              <p className="text-gray-700">
                <strong>Price Changes:</strong> We reserve the right to modify pricing with 30 days&apos; notice. Continued use after a price change constitutes acceptance.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">7. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                <strong>Our IP:</strong> The Service, including its original content, features, and functionality, is owned by Luma Health and protected by copyright, trademark, and other intellectual property laws.
              </p>
              <p className="text-gray-700">
                <strong>Your Content:</strong> You retain ownership of any content you input into the Service. By using the Service, you grant us a limited license to process your content solely for the purpose of providing the Service.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">8. Disclaimer of Warranties</h2>
              <p className="text-gray-700 mb-4">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
              </p>
              <p className="text-gray-700 mb-4">
                We do not warrant that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>The Service will meet your specific requirements</li>
                <li>The Service will be uninterrupted, timely, secure, or error-free</li>
                <li>Generated documentation will result in payer approval</li>
                <li>AI-generated content will be accurate or complete</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, LUMA HEALTH SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Loss of revenue or profits</li>
                <li>Loss of data</li>
                <li>Denial of prior authorization requests</li>
                <li>Audit findings or clawbacks</li>
                <li>Regulatory penalties</li>
                <li>Any damages arising from your use or inability to use the Service</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Our total liability shall not exceed the amount you paid for the Service in the twelve (12) months preceding the claim.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">10. Indemnification</h2>
              <p className="text-gray-700">
                You agree to indemnify and hold harmless Luma Health, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorney&apos;s fees) arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">11. Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including breach of these Terms.
              </p>
              <p className="text-gray-700">
                Upon termination, your right to use the Service will cease immediately. You may request export of your data within 30 days of termination.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">12. Changes to Terms</h2>
              <p className="text-gray-700">
                We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">13. Governing Law</h2>
              <p className="text-gray-700">
                These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions. Any disputes shall be resolved in the state or federal courts located in Delaware.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">14. Contact Us</h2>
              <p className="text-gray-700">
                If you have any questions about these Terms, please contact us at:{" "}
                <a href="mailto:hello@useluma.io" className="text-mint hover:underline">
                  hello@useluma.io
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-sage-medium/50 bg-sage-light/20 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          © 2026 Luma Health. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
