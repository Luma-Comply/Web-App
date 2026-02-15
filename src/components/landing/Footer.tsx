import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t border-sage-medium/50 bg-sage-light/20 py-12 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Copyright */}
          <p className="text-gray-600 text-sm">
            &copy; 2026 Luma Health. All rights reserved.
          </p>

          {/* Links */}
          <div className="flex gap-8">
            <Link
              href="/blog"
              className="text-gray-600 hover:text-mint transition-colors relative group text-sm"
            >
              Blog
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-mint transition-all duration-200 group-hover:w-full" />
            </Link>
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
