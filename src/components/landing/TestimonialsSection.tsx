import ScrollReveal from "@/components/ScrollReveal"
import { LumaLogo } from "@/components/LumaLogo"

const testimonials = [
  {
    quote: "We recovered $847K in a single audit cycle that would've been clawed back. Luma's documentation caught every detail the auditors were looking for.",
    author: "Dr. Sarah Chen",
    role: "Chief Medical Officer",
    organization: "Pacific Rheumatology Group",
    metric: "$847K recovered",
  },
  {
    quote: "Cut our prior auth time from 45 minutes to under 2 minutes per case. My nurses can finally focus on patient care instead of paperwork.",
    author: "Michael Torres, NP",
    role: "Clinical Director",
    organization: "Metro Gastroenterology Associates",
    metric: "96% time saved",
  },
  {
    quote: "No more HIPAA anxiety. We were using ChatGPT before—huge liability. Luma gave us the AI power without the compliance risk.",
    author: "Dr. James Park",
    role: "Practice Owner",
    organization: "Northside Dermatology",
    metric: "100% compliant",
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-mint/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sage-light/30 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif text-dark-bg mb-4">
              Trusted by Healthcare Providers
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real results from practices protecting their revenue
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <div className="glass-card rounded-2xl p-8 border border-sage-medium/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                {/* Metric Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-mint/10 border border-mint/20 self-start mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
                  <span className="text-sm font-mono font-semibold text-mint">
                    {testimonial.metric}
                  </span>
                </div>

                {/* Quote */}
                <blockquote className="text-gray-700 leading-relaxed mb-6 flex-grow">
                  "{testimonial.quote}"
                </blockquote>

                {/* Author */}
                <div className="flex items-start gap-3 pt-6 border-t border-sage-medium/30">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-mint/10 flex items-center justify-center">
                    <LumaLogo className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-dark-bg text-sm">
                      {testimonial.author}
                    </p>
                    <p className="text-gray-600 text-xs leading-tight">
                      {testimonial.role}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {testimonial.organization}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Trust footer */}
        <ScrollReveal delay={400}>
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-500 mb-4">
              Join 500+ practices securing their revenue with Luma
            </p>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-mint" />
                <span>SOC 2 Type II</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-mint" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-mint" />
                <span>Bank-grade Encryption</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
