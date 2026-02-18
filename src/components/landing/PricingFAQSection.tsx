"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Check, ChevronDown } from "lucide-react"
import CheckoutButton from "@/components/CheckoutButton"

const features = [
  "Unlimited cases",
  "3 total seats",
  "All documentation types",
  "Word & PDF export",
  "Priority support",
  "SOC 2 Type II certified",
]

const addOns = [{ name: "Extra Seat", price: "+$15/mo" }]

const faqs = [
  {
    question: "Do you sign a Business Associate Agreement?",
    answer:
      "A BAA is generally not required because Luma does not collect or process protected health information. We deliberately avoid identifiers like date of birth, medical record numbers, full addresses, phone numbers, insurance member IDs, and exact dates of service. If your organization requires a BAA for internal policy reasons regardless of PHI handling, we can discuss enterprise arrangements.",
  },
  {
    question: "Do you store PHI?",
    answer:
      "No. Luma is designed to generate documentation without storing PHI. We collect only limited patient context: age or age range, state, payer name, diagnosis codes, and clinical details needed for AI generation.",
  },
  {
    question: "What should we avoid entering into Luma?",
    answer:
      "Do not paste full patient charts or progress notes that contain PHI identifiers. Avoid entering date of birth, medical record numbers, full addresses, phone numbers, email addresses, insurance member IDs, or exact dates of service. Our system blocks common patterns like Social Security numbers, but users are responsible for ensuring no PHI is entered into free text fields.",
  },
  {
    question: "How does Luma protect my data?",
    answer:
      "All data is encrypted in transit using TLS 1.3 and at rest using AES-256. We use row-level security policies ensuring users can only access their own cases. Authentication is handled through secure session tokens with automatic expiration.",
  },
  {
    question: "Can I export my generated documentation?",
    answer:
      "Yes. All generated documentation can be copied to your clipboard with one click, or exported as Word or PDF. You can paste directly into your EHR, practice management system, or payer portal.",
  },
  {
    question: "What AI models power Luma?",
    answer:
      "We use a handful of AI LLMs to provide research, documentation, and generative analysis so that we can give you the best outcome possible, all while staying fully in line with HIPAA compliance.",
  },
]

export default function PricingFAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-24 bg-muted">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif text-dark-bg mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mb-12">
            Everything you need to secure your revenue
          </p>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Pricing Card */}
            <div className="bg-white border border-border rounded-lg p-8">
              {/* Price */}
              <div className="mb-6">
                <div className="flex items-start gap-1 mb-2">
                  <span className="text-xl text-muted-foreground mt-2">$</span>
                  <span className="text-6xl font-mono font-bold text-dark-bg">
                    399
                  </span>
                  <span className="text-xl text-muted-foreground mt-6">/mo</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  3 seats · Unlimited cases
                </p>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                      <Check className="w-3 h-3 text-foreground" />
                    </div>
                    <span className="text-foreground/80 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Add-ons */}
              <div className="border-t border-border pt-5 mb-6">
                <p className="font-semibold text-dark-bg text-sm mb-3">
                  Need more?
                </p>
                {addOns.map((addOn, index) => (
                  <div
                    key={index}
                    className="flex justify-between text-sm text-muted-foreground"
                  >
                    <span>{addOn.name}</span>
                    <span className="font-semibold text-dark-bg">
                      {addOn.price}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <CheckoutButton />
            </div>

            {/* FAQ Accordion */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-dark-bg mb-4">
                Common Questions
              </h3>
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white border border-border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setOpenIndex(openIndex === index ? null : index)
                    }
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-dark-bg pr-4">
                      {faq.question}
                    </span>
                    <motion.div
                      animate={{ rotate: openIndex === index ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {openIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 text-sm text-foreground/80 leading-relaxed">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              <p className="text-sm text-muted-foreground pt-4">
                Still have questions?{" "}
                <a
                  href="mailto:support@lumacomply.com"
                  className="text-accent hover:underline font-medium"
                >
                  Contact our team
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
