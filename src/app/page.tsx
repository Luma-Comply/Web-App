import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Assuming you have an Input component, otherwise use standard input

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white selection:bg-mint selection:text-black relative overflow-hidden">

      {/* Background Gradient Blob */}
      <div className="absolute top-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-mint/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-purple-500/20 blur-[120px] pointer-events-none" />

      <main className="container relative z-10 mx-auto px-4 text-center">

        <div className="animate-fade-in-up">
          <h1 className="mb-2 text-7xl font-bold tracking-tighter sm:text-9xl bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
            Luma
          </h1>
          <p className="mb-12 text-xl text-gray-400 font-light tracking-widest uppercase">
            Something extraordinary is coming
          </p>
        </div>

        <div className="mx-auto max-w-md w-full space-y-8 animate-fade-in-up delay-200">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-mint to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <div className="relative flex items-center bg-black rounded-lg p-1 border border-white/10">
              <input
                type="email"
                placeholder="Enter your email for updates"
                className="flex-1 bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none"
              />
              <button className="bg-white text-black px-6 py-3 rounded-md font-medium hover:bg-gray-200 transition-colors">
                Notify Me
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            We respect your privacy. No spam, ever.
          </p>
        </div>

      </main>

      <footer className="absolute bottom-8 w-full text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Luma. All rights reserved.
      </footer>
    </div>
  );
}
