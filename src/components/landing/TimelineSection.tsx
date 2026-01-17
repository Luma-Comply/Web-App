import ScrollReveal from "@/components/ScrollReveal"

const steps = [
  {
    number: "01",
    title: "Enter Patient & Clinical Data",
    description:
      "Input patient name, age, state, diagnosis codes, lab values, and prior treatments. No PHI required—keeping you HIPAA compliant.",
  },
  {
    number: "02",
    title: "AI Generates Documentation",
    description:
      "Our Claude-powered AI creates comprehensive medical necessity documentation—prior authorizations, appeals, specialty drugs—in seconds, tailored to your specific payer requirements.",
  },
  {
    number: "03",
    title: "Review & Customize",
    description:
      "Review the generated documentation, make any necessary adjustments, and ensure it meets your practice's standards and style.",
  },
  {
    number: "04",
    title: "Export & Submit",
    description:
      "Download as Word or PDF, or copy directly into your EHR or payer portal. Submit with confidence knowing it's audit-proof.",
  },
]

export default function TimelineSection() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-serif text-dark-bg mb-4">
                How It Works
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                From data entry to submission in minutes, not hours
              </p>
            </div>
          </ScrollReveal>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 md:left-12 top-0 bottom-0 w-0.5 bg-gradient-to-b from-mint via-sage-medium to-mint" />

            <div className="space-y-16">
              {steps.map((step, index) => (
                <ScrollReveal key={index} direction="right" delay={index * 100}>
                  <div className="relative flex gap-8 md:gap-12">
                    {/* Step Number Circle */}
                    <div className="flex-shrink-0 relative z-10">
                      <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-mint border-4 border-white shadow-lg flex items-center justify-center">
                        <span className="text-xl md:text-2xl font-mono font-bold text-white">
                          {step.number}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-8">
                      <h3 className="text-2xl md:text-3xl font-serif text-dark-bg mb-3">
                        {step.title}
                      </h3>
                      <p className="text-lg text-gray-700 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
