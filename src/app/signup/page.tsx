"use client"

import { Suspense, useState } from "react"
import { useFormStatus } from "react-dom"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { signup } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Zap, Shield, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react"
import { LumaLogo } from "@/components/LumaLogo"
import SignInDialog from "@/components/SignInDialog"

const benefits = [
  "Secure approvals faster for your patients",
  "HIPAA-compliant from day one",
  "Spend more time on care, less on paperwork",
  "Audit-proof documentation you can trust",
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
  return (
    <Suspense>
      <SignupPageContent />
    </Suspense>
  )
}

function SignupPageContent() {
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get("error")
  const [signInOpen, setSignInOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  return (
    <div className="flex min-h-screen bg-light-gray">

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <LumaLogo className="w-10 h-10" />
          <span className="text-2xl font-serif font-bold text-dark-bg">Luma</span>
        </Link>

        <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Branding */}
            <div className="hidden lg:block animate-fade-in-up">
              <h1 className="text-5xl font-serif font-semibold mb-6 leading-[1.1]" style={{ color: "#1A2749" }}>
                Focus on patients,
                <span className="block">not paperwork.</span>
              </h1>
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                Join providers who are getting treatments approved faster while protecting their practice.
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
                  <h2 className="text-3xl font-sans font-semibold text-dark-bg mb-2">
                    Create account
                  </h2>
                  <p className="text-gray-600">
                    Start your free 7-day trial
                  </p>
                </div>

                {errorMessage && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-coral/10 border border-coral/20 mb-6" role="alert">
                    <AlertCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-dark-bg">{errorMessage}</p>
                  </div>
                )}

                <form action={signup} className="space-y-5">
                  <div>
                    <Label htmlFor="practiceName" className="text-dark-bg font-medium">
                      Practice / Organization Name
                    </Label>
                    <Input
                      id="practiceName"
                      name="practiceName"
                      type="text"
                      autoComplete="organization"
                      required
                      className="mt-2 h-11"
                      placeholder="Your Practice Name"
                    />
                  </div>

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
                    <div className="relative mt-2">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        className="h-11 pr-10"
                        placeholder="Create a strong password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
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

            </div>
          </div>
        </div>
      </div>

      {/* Sign In Dialog */}
      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </div>
  )
}
