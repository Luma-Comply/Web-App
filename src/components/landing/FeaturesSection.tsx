import ScrollReveal from "@/components/ScrollReveal"
import { Card } from "@/components/ui/card"
import { Shield, Zap, CheckCircle, FileText } from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "HIPAA Compliant from Day One",
    description:
      "No PHI required—only patient name and clinical data. Built on SOC 2 Type II certified infrastructure with end-to-end encryption. No Business Associate Agreement needed with AI providers.",
  },
  {
    icon: Zap,
    title: "Generate in Seconds",
    description:
      "AI-powered documentation that meets Medicare LCD/NCD requirements and commercial payer criteria. What takes 30+ minutes manually now takes seconds with higher quality.",
  },
  {
    icon: CheckCircle,
    title: "Audit-Proof Documentation",
    description:
      "Built-in compliance checklists ensure you have everything auditors look for. Includes proper medical necessity justification, diagnosis codes, lab values, and prior treatment history.",
  },
  {
    icon: FileText,
    title: "Export Anywhere",
    description:
      "Download as Word or PDF, or copy-paste directly into your EHR or payer portals. Works for biologics, specialty drugs, medical necessity letters, and appeals—all in one platform.",
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-white relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-light-gray/20 to-white pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif text-dark-bg mb-4">
                How Luma Helps
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                AI-powered documentation that's compliant, fast, and audit-proof
              </p>
            </div>
          </ScrollReveal>

          {/* Grid layout instead of alternating sides */}
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <Card className="p-8 glass-card border border-sage-medium/30 h-full hover:border-mint/40 transition-all duration-300 hover:shadow-lg group">
                  {/* Icon */}
                  <div className="mb-6">
                    <div className="w-16 h-16 rounded-xl bg-mint/10 border border-mint/20 flex items-center justify-center group-hover:bg-mint/20 transition-colors">
                      <feature.icon className="w-8 h-8 text-mint" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-serif text-dark-bg mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
