"use client"

import { usePathname, useRouter } from "next/navigation"
import { LumaLogo } from "@/components/LumaLogo"
import { Button } from "@/components/ui/button"
import { User, Users, CreditCard, ChevronLeft, Plus } from "lucide-react"
import Link from "next/link"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const tabs = [
    { name: "Profile", href: "/settings/profile", icon: User },
    { name: "Team", href: "/settings/team", icon: Users },
    { name: "Billing", href: "/settings/billing", icon: CreditCard },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-gray to-white">
      {/* Header */}
      <header className="border-b border-sage-medium/50 glass-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/cases/new")}
              size="sm"
              className="bg-mint hover:bg-mint/90 text-dark-bg"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Case
            </Button>
            <div className="flex items-center gap-2">
              <LumaLogo className="w-8 h-8" />
              <span className="text-xl font-serif font-bold text-dark-bg">Luma</span>
            </div>
          </div>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-serif font-bold text-dark-bg mb-2">Settings</h1>
        <p className="text-gray-600 mb-8">Manage your account settings and preferences.</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-sage-medium/30">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-dark-bg text-dark-bg"
                    : "border-transparent text-gray-600 hover:text-dark-bg hover:border-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </Link>
            )
          })}
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  )
}
