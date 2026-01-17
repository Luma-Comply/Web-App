"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    question: "Do you sign a Business Associate Agreement?",
    answer:
      "A BAA is generally not required because Luma does not collect or process protected health information. We deliberately avoid identifiers like date of birth, medical record numbers, full addresses, phone numbers, insurance member IDs, and exact dates of service. If your organization requires a BAA for internal policy reasons regardless of PHI handling, we can discuss enterprise arrangements.",
  },
  {
    question: "Do you store PHI?",
    answer:
      "No. Luma is designed to generate documentation without storing PHI. We collect only limited patient context: first name, age or age range, state, payer name, diagnosis codes, and clinical details needed for AI generation. We do not collect date of birth, MRN, full street address, contact information, insurance member IDs, or exact service dates.",
  },
  {
    question: "What should we avoid entering into Luma?",
    answer:
      "Do not paste full patient charts or progress notes that contain PHI identifiers. Avoid entering date of birth, medical record numbers, full addresses, phone numbers, email addresses, insurance member IDs, or exact dates of service. When pasting clinical notes, remove or redact these identifiers first. Our system blocks common patterns like Social Security numbers, but users are responsible for ensuring no PHI is entered into free text fields.",
  },
  {
    question: "How does Luma protect my data?",
    answer:
      "All data is encrypted in transit using TLS 1.3 and at rest using AES-256. We use Supabase for database hosting with row-level security policies ensuring users can only access their own cases. Authentication is handled through secure session tokens with automatic expiration. We never share your data with third parties except the AI model provider (OpenAI) under a Business Associate Agreement.",
  },
  {
    question: "Can I export my generated documentation?",
    answer:
      "Yes. All generated documentation can be copied to your clipboard with one click. You can then paste it directly into your EHR, practice management system, or save it as a file. We also provide the ability to edit the AI-generated text before copying to ensure it matches your clinical judgment and documentation standards.",
  },
  {
    question: "What AI models power Luma?",
    answer:
      "Luma uses OpenAI's GPT-4o for documentation generation and Perplexity AI for research-driven tasks like payer policy lookups. Both providers are HIPAA compliant and have signed Business Associate Agreements with us. All prompts are designed to generate clinically accurate, evidence-based documentation that follows payer-specific guidelines and medical necessity criteria.",
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-20 bg-gradient-to-b from-white to-light-gray relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-serif text-dark-bg mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to know about Luma
            </p>
          </div>

          {/* FAQ Accordion */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card
                key={index}
                className="glass-card border border-sage-medium/30 overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/50 transition-colors"
                >
                  <span className="text-lg font-semibold text-dark-bg pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-5 text-gray-700 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-12 text-center">
            <p className="text-gray-600">
              Still have questions?{" "}
              <a
                href="mailto:support@lumacomply.com"
                className="text-mint hover:underline font-medium"
              >
                Contact our team
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
