const testimonials = [
  {
    quote: "We recovered $847K in a single audit cycle that would've been clawed back. Luma's documentation caught every detail the auditors were looking for.",
    author: "Dr. Priya Nair",
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
    quote: "Our wound care LCD documentation used to get flagged constantly. Since switching to Luma, zero clawbacks and our audit responses practically write themselves.",
    author: "Danielle Kessler, CPC",
    role: "Billing Manager",
    organization: "Advanced Wound Care Specialists",
    metric: "Zero clawbacks",
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-14 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif text-dark-bg mb-2">
            Trusted by Healthcare Providers
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mb-8">
            Real results from practices protecting their revenue
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-8 shadow-elevation-sm flex flex-col"
              >
                {/* Metric */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted self-start mb-6">
                  <span className="text-xs font-sans font-semibold text-foreground uppercase tracking-wide">
                    {testimonial.metric}
                  </span>
                </div>

                {/* Quote */}
                <blockquote className="text-[17px] font-serif text-foreground/80 leading-relaxed mb-6 flex-grow italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="pt-6 border-t border-border mt-auto">
                  <p className="font-semibold text-dark-bg text-sm">
                    {testimonial.author}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {testimonial.role}, {testimonial.organization}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
