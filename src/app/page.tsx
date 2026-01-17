import Hero from "@/components/landing/Hero"
import StatsBar from "@/components/landing/StatsBar"
import ProblemSection from "@/components/landing/ProblemSection"
import FeaturesSection from "@/components/landing/FeaturesSection"
import TimelineSection from "@/components/landing/TimelineSection"
import TestimonialsSection from "@/components/landing/TestimonialsSection"
import PricingSection from "@/components/landing/PricingSection"
import { ComplianceSection } from "@/components/landing/ComplianceSection"
import { FAQSection } from "@/components/landing/FAQSection"
import CTASection from "@/components/landing/CTASection"
import Footer from "@/components/landing/Footer"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <StatsBar />
      <ProblemSection />
      <FeaturesSection />
      <TimelineSection />
      <TestimonialsSection />
      <PricingSection />
      <ComplianceSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  )
}
