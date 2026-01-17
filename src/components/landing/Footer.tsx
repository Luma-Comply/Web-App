import Link from "next/link"
import { FileText } from "lucide-react"
import { LumaLogo } from "@/components/LumaLogo"

export default function Footer() {
  return (
    <footer className="border-t border-sage-medium/50 bg-sage-light/20 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <LumaLogo className="w-8 h-8" />
            <span className="text-xl font-serif font-bold text-dark-bg">
              Luma
            </span>
          </div>

          {/* Copyright */}
          <p className="text-gray-600 text-sm">
            © 2026 Luma Health. All rights reserved.
          </p>

          {/* Links */}
          <div className="flex gap-8">
            <Link
              href="/privacy"
              className="text-gray-600 hover:text-mint transition-colors relative group text-sm"
            >
              Privacy
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-mint transition-all duration-200 group-hover:w-full" />
            </Link>
            <Link
              href="/terms"
              className="text-gray-600 hover:text-mint transition-colors relative group text-sm"
            >
              Terms
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-mint transition-all duration-200 group-hover:w-full" />
            </Link>
            <Link
              href="/contact"
              className="text-gray-600 hover:text-mint transition-colors relative group text-sm"
            >
              Contact
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-mint transition-all duration-200 group-hover:w-full" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
