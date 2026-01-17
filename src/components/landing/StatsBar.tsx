"use client"

import AnimatedNumber from "@/components/AnimatedNumber"

export default function StatsBar() {
  return (
    <section className="bg-mint py-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
          <div>
            <div className="text-4xl md:text-5xl font-mono font-semibold text-white mb-2">
              <AnimatedNumber value={100} prefix="$" suffix="B+" duration={2000} />
            </div>
            <p className="text-white/90 text-sm md:text-base">
              Lost annually to audit clawbacks
            </p>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-mono font-semibold text-white mb-2">
              <AnimatedNumber value={16} suffix=" hrs" duration={2000} />
            </div>
            <p className="text-white/90 text-sm md:text-base">
              Wasted weekly on paperwork
            </p>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-mono font-semibold text-white mb-2">
              <AnimatedNumber value={1.5} prefix="$" suffix="M+" duration={2000} />
            </div>
            <p className="text-white/90 text-sm md:text-base">
              HIPAA violation fines at risk
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
