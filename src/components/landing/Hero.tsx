"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, FileText, ShieldCheck } from "lucide-react"
import MedicalGrid from "@/components/MedicalGrid"
import { LumaLogo } from "@/components/LumaLogo"
import SignInDialog from "@/components/SignInDialog"
import gsap from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"

export default function Hero() {
  const [signInOpen, setSignInOpen] = useState(false)

  useEffect(() => {
    gsap.registerPlugin(ScrollToPlugin)
  }, [])

  const handleSmoothScroll = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    gsap.to(window, {
      duration: 1.5,
      scrollTo: { y: "#features", offsetY: 80 },
      ease: "power3.inOut",
    })
  }

  return (
    <header className="relative min-h-screen flex flex-col">
      {/* Sticky Header */}
      <nav className="sticky top-0 z-50 border-b border-sage-medium/50 glass-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <LumaLogo className="w-10 h-10" />
            <span className="text-2xl font-serif font-bold text-dark-bg">Luma</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSignInOpen(true)}>
              Log In
            </Button>
            <Link href="/signup">
              <Button size="lg">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <section className="flex-1 relative bg-gradient-to-b from-light-gray to-white overflow-hidden">
        <MedicalGrid intensity="light" animated={false} />

        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-5xl mx-auto">
            {/* Floating HIPAA Badge */}
            <div className="mb-8 animate-fade-in-down">
              <Badge variant="glass" className="text-sm px-4 py-2">
                <ShieldCheck className="w-4 h-4 mr-2 text-mint" />
                HIPAA Compliant from Day One
              </Badge>
            </div>

            {/* Headline with Staggered Animation */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-normal leading-tight text-dark-bg mb-8 text-shadow-soft">
              <span className="block animate-fade-in-up opacity-0 [animation-fill-mode:forwards]">
                AI Documentation
              </span>
              <span className="block animate-fade-in-up opacity-0 [animation-fill-mode:forwards] animation-delay-200">
                That{" "}
                <span className="text-mint relative">
                  Protects Revenue
                  <svg
                    className="absolute -bottom-2 left-0 w-full h-3 text-mint opacity-30"
                    viewBox="0 0 300 12"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 6 Q75 2, 150 6 T300 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-3xl leading-relaxed animate-fade-in-up opacity-0 [animation-fill-mode:forwards] animation-delay-400">
              Generate compliant medical necessity documentation in seconds for prior authorizations, appeals, and specialty medications. Protect your practice from audit clawbacks while keeping patient data safe.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-16 animate-fade-in-up opacity-0 [animation-fill-mode:forwards] animation-delay-500">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto text-lg px-10 py-6 h-auto">
                  Start Free Trial
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-lg px-10 py-6 h-auto"
                onClick={handleSmoothScroll}
              >
                Learn More
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 animate-fade-in-up opacity-0 [animation-fill-mode:forwards] animation-delay-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-mint" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-mint" />
                <span>SOC 2 Type II certified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-mint" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-pulse">
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <span className="text-xs uppercase tracking-wider">Scroll</span>
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Sign In Dialog */}
      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </header>
  )
}
