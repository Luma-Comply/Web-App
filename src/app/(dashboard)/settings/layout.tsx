"use client"

import { usePathname, useRouter } from "next/navigation"
import { LumaLogo } from "@/components/LumaLogo"
import { Button } from "@/components/ui/button"
import { User, Users, CreditCard, ChevronLeft, Plus, ChevronDown, LogOut } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "motion/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState("")
  const [practiceName, setPracticeName] = useState("")
  const [isTeamOwner, setIsTeamOwner] = useState(true) // Default to true to avoid flash
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function loadUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        setUserEmail(session.user.email || "")

        // Load practice name and ownership status from users table
        const { data: userData } = await supabase
          .from("users")
          .select("practice_name, team_owner_id, is_team_owner")
          .eq("id", session.user.id)
          .single()

        if (userData) {
          // Check if user is a team owner (either is_team_owner flag or no team_owner_id)
          const ownerStatus = userData.is_team_owner || !userData.team_owner_id
          setIsTeamOwner(ownerStatus)

          // If user is a team member, fetch owner's practice name
          if (userData.team_owner_id) {
            const { data: ownerData } = await supabase
              .from("users")
              .select("practice_name")
              .eq("id", userData.team_owner_id)
              .single()
            setPracticeName(ownerData?.practice_name || "")
          } else {
            setPracticeName(userData.practice_name || "")
          }

          // Redirect team members away from Team/Billing pages
          if (!ownerStatus && (pathname === "/settings/team" || pathname === "/settings/billing")) {
            router.push("/settings/profile")
          }
        }
      }
    }
    loadUser()
  }, [pathname, router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/")
  }

  // Only show Team and Billing tabs for team owners
  const tabs = [
    { name: "Profile", href: "/settings/profile", icon: User },
    ...(isTeamOwner ? [
      { name: "Team", href: "/settings/team", icon: Users },
      { name: "Billing", href: "/settings/billing", icon: CreditCard },
    ] : []),
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-gray to-white">
      {/* Header */}
      <header className="border-b border-sage-medium/50 glass-card sticky top-0 z-40">
        <div className="mx-auto px-4 max-w-5xl h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LumaLogo className="w-8 h-8" />
            <span className="text-xl font-serif font-bold text-dark-bg">Luma</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/cases/new")}
              size="sm"
              className="relative overflow-hidden bg-dark-bg hover:bg-dark-bg/90 text-white transition-all duration-300 hover:scale-105 before:content-[''] before:absolute before:top-0 before:left-[-100%] before:w-full before:h-full before:bg-white/20 before:transition-all before:duration-300 hover:before:left-[100%] active:scale-100"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Case
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-gray-100">
                  <span className="text-sm text-gray-600 hidden md:block">{practiceName || userEmail}</span>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border border-sage-medium/30">
                <DropdownMenuItem
                  onClick={() => router.push('/settings/profile')}
                  className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                {isTeamOwner && (
                  <>
                    <DropdownMenuItem
                      onClick={() => router.push('/settings/team')}
                      className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Team
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push('/settings/billing')}
                      className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Billing
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="focus:bg-coral/10 focus:text-coral cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back to Dashboard */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-gray-600 hover:text-mint transition-colors mb-6 group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm">Back to Dashboard</span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
        >
          <h1 className="text-3xl font-sans font-bold text-dark-bg mb-2">Settings</h1>
          <p className="text-gray-600 mb-8">Manage your account settings and preferences.</p>
        </motion.div>

        {/* Tabs - Sliding Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
          className="flex gap-1 p-1 mb-6 rounded-lg bg-white/60 border border-sage-medium/30 w-fit overflow-hidden"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname === tab.href
            return (
              <motion.button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className="relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md cursor-pointer z-[1]"
                style={{
                  color: isActive ? "#131317" : "#6b7280",
                  transition: "color 0.15s ease",
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
              >
                {isActive && mounted && (
                  <motion.div
                    layoutId="settings-tab-indicator"
                    className="absolute inset-0 rounded-md bg-white shadow-sm border border-sage-medium/40"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
                  />
                )}
                <Icon className="w-4 h-4" />
                {tab.name}
              </motion.button>
            )
          })}
        </motion.div>

        {/* Content with entrance animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
