"use client"

import AnimatedNumber from "@/components/AnimatedNumber"

const STATS = [
  { value: 96, suffix: "%", label: "less time spent on documentation" },
  { value: 847000, prefix: "$", label: "in clawbacks prevented" },
  { value: 72, suffix: "%", label: "reduction in denied claims or rework" },
]

export default function ResultsStrip() {
  return (
    <section className="py-24 bg-dark-bg">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif font-normal text-white text-3xl md:text-4xl text-center mb-16">
            What practices see with Luma
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <AnimatedNumber
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  duration={2}
                  className="text-5xl md:text-6xl font-serif font-normal text-white"
                />
                <p className="text-base text-white/70 mt-3 max-w-[240px] mx-auto">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
