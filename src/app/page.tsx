import Hero from "@/components/landing/Hero"
import StatsBar from "@/components/landing/StatsBar"
import ProblemSolutionSection from "@/components/landing/ProblemSolutionSection"
import TimelineSection from "@/components/landing/TimelineSection"
import ResultsStrip from "@/components/landing/ResultsStrip"
import SpecialtiesSection from "@/components/landing/SpecialtiesSection"
import TestimonialsSection from "@/components/landing/TestimonialsSection"
import ComplianceSpiralCarousel from "@/components/landing/ComplianceSpiralCarousel"
import { ComplianceSection } from "@/components/landing/ComplianceSection"
import PricingFAQSection from "@/components/landing/PricingFAQSection"
import Footer from "@/components/landing/Footer"
import SmoothScroll from "@/components/landing/SmoothScroll"

export default function Home() {
  return (
    <main className="min-h-screen">
      <SmoothScroll />
      <Hero />
      <StatsBar />
      <ProblemSolutionSection />
      <TimelineSection />
      <ResultsStrip />
      <SpecialtiesSection />
      <TestimonialsSection />
      <ComplianceSpiralCarousel />
      <ComplianceSection />
      <PricingFAQSection />
      <Footer />
    </main>
  )
}
