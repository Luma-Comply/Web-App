import ScrollReveal from "@/components/ScrollReveal"
import { AlertTriangle, DollarSign, Clock } from "lucide-react"

const problems = [
  {
    icon: DollarSign,
    title: "$100B+ Lost Annually",
    description:
      "Medicare/Medicaid improper payments due to documentation issues. One audit can wipe out months of revenue.",
    color: "from-coral/10 to-coral/5",
    borderColor: "border-l-coral",
  },
  {
    icon: AlertTriangle,
    title: "HIPAA Violations",
    description:
      "Providers using ChatGPT with PHI face $1.5M+ fines. Standard AI tools aren't built for healthcare compliance.",
    color: "from-coral/10 to-coral/5",
    borderColor: "border-l-coral",
  },
  {
    icon: Clock,
    title: "12-16 Hours Weekly",
    description:
      "Wasted on prior authorization paperwork. Time that could be spent on patient care instead of documentation.",
    color: "from-coral/10 to-coral/5",
    borderColor: "border-l-coral",
  },
]

export default function ProblemSection() {
  return (
    <section className="py-24 bg-white relative">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif text-dark-bg mb-4">
                The Problem
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Healthcare providers are risking HIPAA violations and losing
                millions to audit clawbacks due to insufficient documentation.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {problems.map((problem, index) => (
              <ScrollReveal
                key={index}
                direction="up"
                delay={index * 100}
              >
                <div
                  className={`glass-card rounded-lg p-8 border-l-4 ${problem.borderColor} hover:-translate-y-2 transition-transform duration-300`}
                >
                  <div className="flex flex-col h-full">
                    <div className="w-14 h-14 rounded-lg bg-coral/10 flex items-center justify-center mb-6">
                      <problem.icon className="w-7 h-7 text-coral" />
                    </div>
                    <h3 className="text-xl font-semibold text-coral mb-3">
                      {problem.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {problem.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
