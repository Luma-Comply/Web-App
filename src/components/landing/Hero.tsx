"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

import { LumaLogo } from "@/components/LumaLogo"
import SignInDialog from "@/components/SignInDialog"
import HeroIllustration from "@/components/landing/HeroIllustration"

export default function Hero() {
  const [signInOpen, setSignInOpen] = useState(false)

  return (
    <header className="relative flex flex-col">
      {/* Nav */}
      <nav className="py-5 bg-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <LumaLogo className="w-10 h-10" />
              <span className="text-2xl font-semibold text-dark-bg tracking-tight">Luma</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setSignInOpen(true)}>
                Log In
              </Button>
              <Link href="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#F4F4EE] to-[#EDEDE7]">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left — Copy */}
            <div>
              <h1 className="font-serif font-normal text-[#0F1629] text-[36px] leading-[40px] md:text-[50px] md:leading-[54px] mb-6">
                AI&#x2011;assisted medical necessity docs for PAs, biologics, and audit responses.
              </h1>

              <p className="text-lg leading-7 text-[#1A2647]/80 mb-6 max-w-[500px]">
                Luma turns payer rules and clinical notes into payer&#x2011;ready documentation for prior authorizations, biologics, and audit letters&nbsp;&mdash; without exposing PHI.
              </p>

              <ul className="text-base leading-7 text-[#1A2647]/80 mb-10 space-y-0 max-w-[500px]">
                <li>&#x2022;&ensp;Medical necessity notes for meds, imaging, and procedures</li>
                <li>&#x2022;&ensp;Prior auth and letter templates tuned to payer criteria</li>
                <li>&#x2022;&ensp;Audit response letters built from your existing chart data</li>
              </ul>

              <Link href="/signup" className="group inline-block">
                <Button size="lg" className="text-lg px-10 py-6 h-auto gap-3 hover:bg-mint/95 [&_svg]:!size-auto">
                  Start Free Trial
                  <span className="inline-block overflow-hidden w-8 h-8 ml-1">
                    <ArrowRight className="w-8 h-8 arrow-loop" strokeWidth={1.5} />
                  </span>
                </Button>
              </Link>
            </div>

            {/* Right — Animated illustration */}
            <HeroIllustration />
          </div>
        </div>
      </section>

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </header>
  )
}
