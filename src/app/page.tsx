import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Shield, Zap, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-light-gray">
      {/* Header */}
      <header className="border-b border-sage-medium bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-mint" />
            <span className="text-2xl font-bold text-dark-bg">Luma</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-6 text-5xl font-bold leading-tight text-dark-bg">
            Stop Losing Money to
            <span className="text-mint"> Audit Clawbacks</span>
          </h1>
          <p className="mb-8 text-xl text-gray-600">
            HIPAA-compliant AI that generates medical necessity documentation
            for biologics - preventing billions in audit recoupments while
            keeping your patient data safe.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="text-lg">
                Start Free Trial
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-dark-bg">
              The Problem
            </h2>
            <p className="mb-8 text-lg text-gray-600">
              Healthcare providers are risking HIPAA violations by using ChatGPT
              with patient data, and losing millions to audit clawbacks due to
              insufficient documentation.
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg border border-coral bg-coral/5 p-6">
                <h3 className="mb-2 text-xl font-semibold text-coral">
                  $100B+ Lost Annually
                </h3>
                <p className="text-gray-600">
                  Medicare/Medicaid improper payments due to documentation
                  issues
                </p>
              </div>
              <div className="rounded-lg border border-coral bg-coral/5 p-6">
                <h3 className="mb-2 text-xl font-semibold text-coral">
                  HIPAA Violations
                </h3>
                <p className="text-gray-600">
                  Providers using ChatGPT with PHI face $1.5M+ fines
                </p>
              </div>
              <div className="rounded-lg border border-coral bg-coral/5 p-6">
                <h3 className="mb-2 text-xl font-semibold text-coral">
                  12-16 Hours Weekly
                </h3>
                <p className="text-gray-600">
                  Wasted on prior authorization paperwork
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-12 text-center text-3xl font-bold text-dark-bg">
              How Luma Helps
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <Shield className="h-8 w-8 text-mint" />
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-dark-bg">
                    HIPAA Compliant from Day One
                  </h3>
                  <p className="text-gray-600">
                    No PHI required - only patient name and clinical data.
                    SOC 2 Type II certified infrastructure.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <Zap className="h-8 w-8 text-mint" />
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-dark-bg">
                    Generate in Seconds
                  </h3>
                  <p className="text-gray-600">
                    AI-powered documentation that meets Medicare LCD/NCD
                    requirements and commercial payer criteria.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-mint" />
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-dark-bg">
                    Audit-Proof Documentation
                  </h3>
                  <p className="text-gray-600">
                    Built-in compliance checklists ensure you have everything
                    auditors look for.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-mint" />
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-dark-bg">
                    Export Anywhere
                  </h3>
                  <p className="text-gray-600">
                    Download as Word or PDF, or copy-paste directly into your
                    EHR or payer portals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-12 text-center text-3xl font-bold text-dark-bg">
              Simple, Transparent Pricing
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-lg border-2 border-sage-medium p-8">
                <h3 className="mb-2 text-2xl font-bold text-dark-bg">Solo</h3>
                <p className="mb-4 text-gray-600">
                  For individual providers
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-dark-bg">$149</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <ul className="mb-8 space-y-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>50 cases/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>All documentation types</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>Word & PDF export</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>1 provider seat</span>
                  </li>
                </ul>
                <Link href="/signup" className="block">
                  <Button className="w-full" variant="outline">
                    Get Started
                  </Button>
                </Link>
              </div>

              <div className="rounded-lg border-2 border-mint bg-mint/5 p-8">
                <div className="mb-2 inline-block rounded-full bg-mint px-3 py-1 text-sm font-semibold text-white">
                  Most Popular
                </div>
                <h3 className="mb-2 text-2xl font-bold text-dark-bg">
                  Practice
                </h3>
                <p className="mb-4 text-gray-600">For small to mid-size practices</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-dark-bg">$249</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <ul className="mb-8 space-y-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>200 cases/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>All documentation types</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>Word & PDF export</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>Up to 5 provider seats</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Link href="/signup" className="block">
                  <Button className="w-full">Get Started</Button>
                </Link>
              </div>

              <div className="rounded-lg border-2 border-sage-medium p-8">
                <h3 className="mb-2 text-2xl font-bold text-dark-bg">Group</h3>
                <p className="mb-4 text-gray-600">
                  For large practices & hospitals
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-dark-bg">$599</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <ul className="mb-8 space-y-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>1000 cases/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>All documentation types</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>Word & PDF export</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>Up to 20 provider seats</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>Dedicated support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-mint" />
                    <span>API access</span>
                  </li>
                </ul>
                <Link href="/signup" className="block">
                  <Button className="w-full" variant="outline">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl rounded-lg bg-mint p-12 text-center text-white">
            <h2 className="mb-4 text-3xl font-bold">
              Ready to Stop Losing Money to Audits?
            </h2>
            <p className="mb-8 text-lg">
              Join healthcare providers who are protecting their revenue with
              compliant AI documentation.
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-white text-mint hover:bg-light-gray"
              >
                Start Your Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sage-medium bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-mint" />
              <span className="text-xl font-bold text-dark-bg">Luma</span>
            </div>
            <p className="text-gray-600">
              © 2026 Luma. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="text-gray-600 hover:text-mint"
              >
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-600 hover:text-mint">
                Terms
              </Link>
              <Link
                href="/contact"
                className="text-gray-600 hover:text-mint"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
