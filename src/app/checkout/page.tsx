"use client"

import { useEffect } from "react"
import { LumaLogo } from "@/components/LumaLogo"
import { SubscribeButton } from "@/components/SubscribeButton"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Shield, CreditCard, Zap } from "lucide-react"

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-light-gray to-white">
      {/* Header */}
      <header className="border-b border-sage-medium/50 glass-card">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <div className="flex items-center gap-2">
            <LumaLogo className="w-10 h-10" />
            <span className="text-2xl font-serif font-bold text-dark-bg">Luma</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            <Shield className="w-4 h-4 mr-2 text-mint" />
            14-Day Free Trial
          </Badge>
          <h1 className="text-4xl md:text-5xl font-serif text-dark-bg mb-4">
            Complete Your Registration
          </h1>
          <p className="text-xl text-gray-600">
            Add your payment method to start your 14-day free trial.
            You won't be charged until the trial ends.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Pricing Card */}
          <Card className="p-8 glass-card border-2 border-mint/30">
            <div className="text-center mb-6">
              <div className="text-sm text-gray-600 mb-2">Professional Plan</div>
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-5xl font-serif text-dark-bg">$149</span>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-sm text-gray-600">
                First 14 days free, then $149/mo
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-mint/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-mint" />
                </div>
                <span className="text-gray-700">50 cases per month</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-mint/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-mint" />
                </div>
                <span className="text-gray-700">3 team seats included</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-mint/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-mint" />
                </div>
                <span className="text-gray-700">All documentation types</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-mint/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-mint" />
                </div>
                <span className="text-gray-700">Word & PDF export</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-mint/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-mint" />
                </div>
                <span className="text-gray-700">Priority support</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-mint/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-mint" />
                </div>
                <span className="text-gray-700">SOC 2 Type II certified</span>
              </div>
            </div>

            <div className="pt-6 border-t border-sage-medium/30">
              <div className="text-sm text-gray-600 mb-2">Need more?</div>
              <div className="space-y-1 text-sm text-gray-700">
                <div>Extra Seat: <strong>+$15/mo</strong></div>
                <div>Extra Cases: <strong>+$3/case</strong></div>
              </div>
            </div>
          </Card>

          {/* Security & Trial Info */}
          <div className="space-y-6">
            <Card className="p-6 glass-card border border-sage-medium/30">
              <div className="flex items-start gap-3 mb-4">
                <CreditCard className="w-6 h-6 text-mint flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-serif text-dark-bg mb-2">
                    Secure Payment
                  </h3>
                  <p className="text-sm text-gray-600">
                    Your payment information is encrypted and processed securely through Stripe.
                    We never store your credit card details.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 glass-card border border-sage-medium/30">
              <div className="flex items-start gap-3 mb-4">
                <Shield className="w-6 h-6 text-mint flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-serif text-dark-bg mb-2">
                    Risk-Free Trial
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Try Luma free for 14 days. Cancel anytime during the trial and you won't be charged.
                  </p>
                  <p className="text-sm text-gray-600">
                    After your trial, you'll be automatically charged $149/month. You can cancel or modify your plan anytime.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 glass-card border border-sage-medium/30 bg-mint/5">
              <div className="flex items-start gap-3">
                <Zap className="w-6 h-6 text-mint flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-serif text-dark-bg mb-2">
                    Instant Access
                  </h3>
                  <p className="text-sm text-gray-600">
                    Start generating compliant documentation immediately after checkout.
                    No setup required.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <SubscribeButton className="w-full md:w-auto px-12 py-6 text-lg" />
          <p className="text-sm text-gray-600 mt-4">
            By clicking "Start 14-Day Free Trial", you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
