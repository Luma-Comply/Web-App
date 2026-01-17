"use client"

import { useState } from "react"
import Link from "next/link"
import { login } from "@/app/auth/actions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LumaLogo } from "@/components/LumaLogo"

interface SignInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-sage-medium/30">
        {/* Header with gradient - outer radius 20px */}
        <div className="relative bg-gradient-to-br from-mint/10 via-sage-light/20 to-white p-6 border-b border-sage-medium/20">
          <div className="flex items-center gap-3 mb-2">
            <LumaLogo className="w-8 h-8" />
            <span className="text-xl font-serif font-bold text-dark-bg">Luma</span>
          </div>
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-2xl font-serif text-dark-bg">
              Welcome back
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Sign in to access your medical documentation
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form - concentric border radius */}
        <div className="p-6">
          <form className="space-y-4">
            {/* Email Field - inner radius 16px */}
            <div className="space-y-2">
              <Label htmlFor="dialog-email" className="text-dark-bg font-medium text-sm">
                Email address
              </Label>
              <Input
                id="dialog-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="h-11 border-sage-medium/40 focus:border-mint"
                placeholder="your@email.com"
              />
            </div>

            {/* Password Field - inner radius 16px */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="dialog-password" className="text-dark-bg font-medium text-sm">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-mint hover:text-mint/80 transition-colors"
                  onClick={() => onOpenChange(false)}
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id="dialog-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="h-11 border-sage-medium/40 focus:border-mint"
                placeholder="Enter your password"
              />
            </div>

            {/* Sign In Button - innermost radius 12px */}
            <Button
              formAction={login}
              className="w-full h-11 text-base bg-mint hover:bg-mint/90"
            >
              Sign in
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-sage-medium/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">New to Luma?</span>
            </div>
          </div>

          {/* Sign Up CTA - inner radius 16px */}
          <Link href="/signup" onClick={() => onOpenChange(false)}>
            <Button
              variant="outline"
              className="w-full h-11 border-sage-medium hover:bg-sage-light/50"
            >
              Create a free account
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
