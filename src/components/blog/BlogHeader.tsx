"use client"

import { useState } from "react"
import Link from "next/link"
import { LumaLogo } from "@/components/LumaLogo"
import { Button } from "@/components/ui/button"
import SignInDialog from "@/components/SignInDialog"

export default function BlogHeader() {
  const [signInOpen, setSignInOpen] = useState(false)

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-sage-medium/50 glass-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <LumaLogo className="w-10 h-10" />
              <span className="text-2xl font-serif font-bold text-dark-bg">Luma</span>
            </Link>
            <Link
              href="/blog"
              className="text-lg font-medium text-mint hover:text-mint/80 transition-colors"
            >
              Blog
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSignInOpen(true)}>
              Log In
            </Button>
            <Link href="/signup">
              <Button size="lg">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </>
  )
}
