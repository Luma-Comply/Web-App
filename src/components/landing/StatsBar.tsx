"use client"

export default function StatsBar() {
  return (
    <section className="py-12" style={{ backgroundColor: "#182040" }}>
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-center">
          <div>
            <div className="text-4xl md:text-5xl font-mono font-semibold text-white mb-2">
              $100B+
            </div>
            <p className="text-white/90 text-sm md:text-base whitespace-nowrap">
              Lost annually to audit clawbacks
            </p>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-mono font-semibold text-white mb-2">
              16 hrs
            </div>
            <p className="text-white/90 text-sm md:text-base">
              Wasted weekly on paperwork
            </p>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-mono font-semibold text-white mb-2">
              $1.5M+
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
