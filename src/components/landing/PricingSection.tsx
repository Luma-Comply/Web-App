import ScrollReveal from "@/components/ScrollReveal"
import CheckoutButton from "@/components/CheckoutButton"
import { Check } from "lucide-react"

const features = [
  "50 cases per month",
  "3 total seats",
  "All documentation types",
  "Word & PDF export",
  "Priority support",
  "SOC 2 Type II certified",
]

const addOns = [
  { name: "Extra Seat", price: "+$15/mo" },
  { name: "Extra Cases", price: "+$3/case" },
]

export default function PricingSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-light-gray to-white relative">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-serif text-dark-bg mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-xl text-gray-600">
                Everything you need to secure your revenue
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={200}>
            <div className="relative max-w-xl mx-auto">
              {/* Pricing Card */}
              <div className="relative glass-card rounded-xl border border-mint/30 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="relative p-6 md:p-8">
                  {/* Price */}
                  <div className="text-center mb-6">
                    <div className="flex items-start justify-center gap-1 mb-2">
                      <span className="text-xl text-gray-600 mt-2">$</span>
                      <span className="text-6xl font-mono font-bold text-dark-bg">
                        149
                      </span>
                      <span className="text-xl text-gray-600 mt-6">/mo</span>
                    </div>
                    <p className="text-gray-600 text-sm">3 seats • 50 cases included</p>
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-mint/10 flex items-center justify-center">
                          <Check className="w-3 h-3 text-mint" />
                        </div>
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Add-ons */}
                  <div className="border-t border-dashed border-gray-300 pt-5 mb-6">
                    <p className="font-semibold text-dark-bg text-sm mb-3">
                      Need more?
                    </p>
                    <div className="space-y-2 text-sm">
                      {addOns.map((addOn, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-gray-600"
                        >
                          <span>{addOn.name}</span>
                          <span className="font-semibold text-dark-bg">
                            {addOn.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <CheckoutButton />
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
