"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

import { LumaLogo } from "@/components/LumaLogo"
import SignInDialog from "@/components/SignInDialog"

const pillars = [
  {
    title: "No PHI Required",
    description: "Only patient name and clinical data. No BAA needed with AI providers.",
  },
  {
    title: "Payer-Specific Criteria",
    description: "Auto-references Medicare LCD/NCD and commercial payer requirements.",
  },
  {
    title: "Export to Any EHR",
    description: "Word, PDF, or copy-paste directly into your payer portal.",
  },
]

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
          <div className="max-w-5xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif leading-[1.1] text-dark-bg mb-8">
              <span className="block font-normal">Automate Documentation.</span>
              <span className="block font-normal">
                Keep Patients On Life-Saving Therapies.
              </span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-2xl leading-relaxed">
              Generate compliant medical necessity documentation in seconds. So you can secure approvals faster and ensure your patients get the treatments they need. Audit-proof, HIPAA-compliant, and built for care.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-12">
              <Link href="/signup" className="group">
                <Button size="lg" className="text-lg px-10 py-6 h-auto gap-3 hover:bg-mint/95 [&_svg]:!size-auto">
                  Start Free Trial
                  <span className="inline-block overflow-hidden w-8 h-8 ml-1">
                    <ArrowRight className="w-8 h-8 arrow-loop" strokeWidth={1.5} />
                  </span>
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground font-mono tracking-wide">
                7-day free trial · SOC 2 Type II · Cancel anytime
              </p>
            </div>

            {/* Pillar Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pillars.map((pillar, index) => (
                <div
                  key={index}
                  className="bg-white border border-border rounded-lg p-6"
                >
                  <h3 className="text-base font-semibold text-dark-bg mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </header>
  )
}
