import Link from "next/link"
import { Button } from "@/components/ui/button"
import TextureOverlay from "@/components/TextureOverlay"
import ScrollReveal from "@/components/ScrollReveal"

export default function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-mint" />
      <TextureOverlay intensity="medium" color="rgba(255, 255, 255, 0.05)" />

      <div className="container mx-auto px-4 relative">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-serif text-white mb-6">
              Get Back to What Matters: Patient Care
            </h2>
            <p className="text-xl text-white/90 mb-10 leading-relaxed">
              Join providers who've reclaimed their time and ensured their patients get the treatments they need. Start your 14-day free trial today.
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-white text-mint hover:bg-white hover:scale-105 text-lg px-12 py-6 h-auto font-semibold shadow-2xl transition-transform"
              >
                Start Your Free Trial
              </Button>
            </Link>
            <p className="text-white/70 text-sm mt-6">
              Free 14-day trial • Cancel anytime
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
