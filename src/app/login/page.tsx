import Link from "next/link"
import { login } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Shield, Lock } from "lucide-react"
import MedicalGrid from "@/components/MedicalGrid"
import { LumaLogo } from "@/components/LumaLogo"

export default function LoginPage() {
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
                Welcome back to
                <span className="text-mint block">Luma</span>
              </h1>
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                HIPAA-compliant medical necessity documentation for healthcare providers.
              </p>

              {/* Trust Indicators */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-mint/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-mint" />
                  </div>
                  <div>
                    <p className="font-semibold text-dark-bg">HIPAA Compliant</p>
                    <p className="text-gray-600 text-sm">Your data is encrypted and secure</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-mint/10 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-mint" />
                  </div>
                  <div>
                    <p className="font-semibold text-dark-bg">SOC 2 Type II Certified</p>
                    <p className="text-gray-600 text-sm">Enterprise-grade security standards</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="animate-fade-in-up animation-delay-200">
              <div className="glass-card rounded-2xl p-8 md:p-10 border border-sage-medium/50 shadow-xl">
                <div className="mb-8">
                  <h2 className="text-3xl font-serif text-dark-bg mb-2">
                    Sign in
                  </h2>
                  <p className="text-gray-600">
                    Access your account
                  </p>
                </div>

                <form className="space-y-5">
                  <div>
                    <Label htmlFor="email" className="text-dark-bg font-medium">
                      Email address
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
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="password" className="text-dark-bg font-medium">
                        Password
                      </Label>
                      <Link
                        href="/forgot-password"
                        className="text-sm text-mint hover:text-mint/80 transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="h-11"
                      placeholder="Enter your password"
                    />
                  </div>

                  <Button
                    formAction={login}
                    className="w-full h-11 text-base"
                  >
                    Sign in
                  </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                  <p className="text-gray-600">
                    Don't have an account?{" "}
                    <Link
                      href="/signup"
                      className="font-semibold text-mint hover:text-mint/80 transition-colors"
                    >
                      Sign up for free
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
