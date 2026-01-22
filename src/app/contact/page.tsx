import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LumaLogo } from "@/components/LumaLogo"
import { ArrowLeft, Mail } from "lucide-react"

export const metadata = {
  title: "Contact Us - Luma",
  description: "Contact Luma - Medical Necessity Documentation Platform",
}

export default function ContactPage() {
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
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-mint/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-mint" />
            </div>
            <h1 className="text-4xl md:text-5xl font-sans font-semibold text-dark-bg mb-4">
              Contact Us
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Have questions or need support? We&apos;re here to help.
            </p>
          </div>

          <div className="glass-card rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-sans font-semibold text-dark-bg mb-4">
              Get in Touch
            </h2>
            <p className="text-gray-700 mb-6">
              For general inquiries, support requests, or enterprise arrangements, reach out to us at:
            </p>
            <a
              href="mailto:hello@useluma.io"
              className="inline-flex items-center gap-2 text-2xl font-semibold text-mint hover:text-mint/80 transition-colors"
            >
              <Mail className="w-6 h-6" />
              hello@useluma.io
            </a>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-dark-bg mb-2">
                Support
              </h3>
              <p className="text-gray-600 text-sm">
                Need help with your account or have technical questions? Our team typically responds within 24 hours.
              </p>
            </div>
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-dark-bg mb-2">
                Enterprise
              </h3>
              <p className="text-gray-600 text-sm">
                Interested in enterprise plans or custom BAA arrangements? Let&apos;s discuss your organization&apos;s needs.
              </p>
            </div>
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
