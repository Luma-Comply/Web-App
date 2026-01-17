"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import Link from "next/link"
import { signup } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Check, Zap, Shield, Loader2 } from "lucide-react"
import MedicalGrid from "@/components/MedicalGrid"
import { LumaLogo } from "@/components/LumaLogo"
import SignInDialog from "@/components/SignInDialog"

const benefits = [
  "Generate documentation in seconds",
  "HIPAA-compliant from day one",
  "Audit-proof medical necessity letters",
  "Export to Word, PDF, or EHR",
]

function SubmitButton() {
  const { pending } = useFormStatus()
  
  return (
    <Button
      type="submit"
      className="w-full h-11 text-base"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Creating account...
        </>
      ) : (
        "Get started free"
      )}
    </Button>
  )
}

export default function SignupPage() {
  const [signInOpen, setSignInOpen] = useState(false)
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-light-gray to-white relative overflow-hidden">
      <MedicalGrid intensity="light" />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <LumaLogo className="w-10 h-10" />
          <span className="text-2xl font-serif font-bold text-dark-bg">Luma</span>
        </Link>

        <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Branding */}
            <div className="hidden lg:block animate-fade-in-up">
              <h1 className="text-5xl font-serif text-dark-bg mb-6 leading-tight">
                Start protecting your
                <span className="text-mint block">revenue today</span>
              </h1>
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                Join healthcare providers who are preventing audit clawbacks with AI-powered documentation.
              </p>

              {/* Benefits */}
              <div className="space-y-3 mb-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-mint/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-mint" />
                    </div>
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 border border-sage-medium/30">
                  <Shield className="w-4 h-4 text-mint" />
                  <span className="text-sm font-medium text-dark-bg">HIPAA Compliant</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 border border-sage-medium/30">
                  <Zap className="w-4 h-4 text-mint" />
                  <span className="text-sm font-medium text-dark-bg">SOC 2 Certified</span>
                </div>
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="animate-fade-in-up">
              <div className="glass-card rounded-2xl p-8 md:p-10 border border-sage-medium/50 shadow-xl">
                <div className="mb-8">
                  <h2 className="text-3xl font-serif text-dark-bg mb-2">
                    Create account
                  </h2>
                  <p className="text-gray-600">
                    Start your free 14-day trial
                  </p>
                </div>

                <form action={signup} className="space-y-5">
                  <div>
                    <Label htmlFor="email" className="text-dark-bg font-medium">
                      Work email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="mt-2 h-11"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-dark-bg font-medium">
                      Password
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="mt-2 h-11"
                      placeholder="Create a strong password"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Must be at least 8 characters
                    </p>
                  </div>

                  <SubmitButton />

                  <p className="text-xs text-gray-500 text-center">
                    By signing up, you agree to our{" "}
                    <Link href="/terms" className="text-mint hover:text-mint/80">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-mint hover:text-mint/80">
                      Privacy Policy
                    </Link>
                  </p>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                  <p className="text-gray-600">
                    Already have an account?{" "}
                    <button
                      onClick={() => setSignInOpen(true)}
                      className="font-semibold text-mint hover:text-mint/80 transition-colors"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </div>

              {/* Trust Message */}
              <p className="text-center text-sm text-gray-500 mt-6">
                🔒 No credit card required • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sign In Dialog */}
      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </div>
  )
}
