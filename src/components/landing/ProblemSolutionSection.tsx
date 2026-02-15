"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"

const tabs = [
  {
    id: "biologics",
    label: "Biologics",
    headline: "Built for Biologics Documentation",
    description:
      "Biologics require the most rigorous medical necessity justification of any drug class. Luma generates documentation that meets LCD/NCD criteria for every major biologic — Humira, Stelara, Dupixent, Entyvio, and 50+ more.",
    points: [
      "Step therapy and prior treatment failure documentation",
      "Disease activity scoring (CDAI, PASI, DAS28, Mayo) auto-referenced",
      "Lab value integration for monitoring requirements",
      "Biosimilar interchange justification when applicable",
    ],
  },
  {
    id: "prior-auth",
    label: "Prior Authorization",
    headline: "Prior Authorizations, Handled",
    description:
      "The average PA takes 35 minutes to complete manually. Luma generates payer-specific documentation in seconds by cross-referencing your patient's clinical profile against the exact criteria each payer requires.",
    points: [
      "Auto-matches Medicare, Medicaid, and commercial payer formularies",
      "Flags missing clinical criteria before submission",
      "Generates documentation formatted for payer portal upload",
      "Tracks approval rates and identifies denial patterns",
    ],
  },
  {
    id: "appeals",
    label: "Appeal Letters",
    headline: "Win More Appeals",
    description:
      "When a PA is denied, the appeal window is tight and the documentation bar is higher. Luma generates peer-reviewed, citation-backed appeal letters that address the specific denial reason with clinical evidence.",
    points: [
      "Denial reason analysis with targeted counter-arguments",
      "Clinical guideline citations (ACR, AGA, AAD) auto-included",
      "Peer-to-peer review preparation notes",
      "Escalation path recommendations based on payer history",
    ],
  },
  {
    id: "chat",
    label: "Chat with Luma",
    headline: "Talk Through Your Case",
    description:
      "Have a conversation with Luma about any case. Ask questions, surface gaps in your clinical narrative, and refine your approach before generating. Every detail discussed is saved to your case file, so when you generate documentation, the output reflects everything you've covered.",
    points: [
      "Discuss clinical nuances and get real-time guidance",
      "All conversation details auto-saved to case records",
      "Regenerate anytime for an updated output based on new context",
      "Identify weak points in your documentation before submission",
    ],
  },
]

export default function ProblemSolutionSection() {
  const [activeTab, setActiveTab] = useState("biologics")
  const activeContent = tabs.find((t) => t.id === activeTab)!

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif text-dark-bg mb-4">
            What Luma Covers
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mb-12">
            Documentation, research, and guidance. One platform.
          </p>

          {/* Tab Selector */}
          <div className="inline-flex gap-1 mb-12">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative px-6 py-3 text-sm font-medium rounded-lg"
                style={{
                  zIndex: 1,
                  color: activeTab === tab.id ? "#1652C5" : "hsl(215, 16%, 47%)",
                  fontWeight: activeTab === tab.id ? 600 : 400,
                }}
                whileTap={{ scale: 0.98 }}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: "rgba(22, 82, 197, 0.04)",
                      border: "1.5px solid #1652C5",
                      zIndex: -1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      mass: 1,
                    }}
                  />
                )}
                {tab.label}
              </motion.button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="grid md:grid-cols-2 gap-12 items-start">
                <div>
                  <h3 className="text-2xl font-semibold text-dark-bg mb-4">
                    {activeContent.headline}
                  </h3>
                  <p className="text-foreground/80 leading-relaxed">
                    {activeContent.description}
                  </p>
                </div>

                <ul className="space-y-4">
                  {activeContent.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                      <span className="text-foreground/80 leading-relaxed">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
