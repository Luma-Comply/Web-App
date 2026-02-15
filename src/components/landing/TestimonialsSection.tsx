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
    quote: "No more HIPAA anxiety. We were using ChatGPT before, huge liability. Luma gave us the AI power without the compliance risk.",
    author: "Dr. James Park",
    role: "Practice Owner",
    organization: "Northside Dermatology",
    metric: "100% compliant",
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif text-dark-bg mb-4">
            Trusted by Healthcare Providers
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mb-12">
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
