"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronLeft, ChevronRight } from "lucide-react"

/* ── Config ── */
const SLIDE_PATHS = [
  "/heroSVGanimation/heroimage1.svg",
  "/heroSVGanimation/heroimage3.svg",
  "/heroSVGanimation/heroimage2.svg",
  "/heroSVGanimation/heroimage4.svg",
]

const AUTOPLAY_MS = 7500

/* ── Vertical slide variants (enter from bottom, exit to top) ── */
const slideVariants = {
  enter: () => ({
    y: 40,
    opacity: 0,
  }),
  center: { y: 0, opacity: 1 },
  exit: () => ({
    y: -30,
    opacity: 0,
  }),
}

const springSlide = { type: "spring" as const, stiffness: 300, damping: 30 }

/* ── CSS for internal SVG element animations ── */
const svgAnimationCSS = `
/* ── Keyframes ── */
@keyframes heroFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes heroPop {
  from { opacity: 0; transform: scale(0.82); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes heroSlideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* ── Fill container ── */
.hero-slide svg {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

/* ── Staggered entrance for root-group children ── */
.hero-slide svg > g > *:not(defs):not(clipPath):not(mask) {
  opacity: 0;
  animation: heroFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
${Array.from(
  { length: 25 },
  (_, i) =>
    `.hero-slide svg > g > *:nth-child(${i + 1}) { animation-delay: ${(0.04 + i * 0.05).toFixed(2)}s; }`
).join("\n")}
/* Catch-all for children beyond 25 */
.hero-slide svg > g > *:nth-child(n+26) { animation-delay: 1.3s; }

/* ── Badges / risk indicators: bouncy pop ── */
.hero-slide [id*="badge" i],
.hero-slide [id*="pill" i],
.hero-slide [id*="Risk"],
.hero-slide [id*="risk" i]:not([id*="card" i]),
.hero-slide [id*="Missing"],
.hero-slide [id*="High"]:not([id*="card" i]) {
  animation-name: heroPop !important;
  animation-duration: 0.4s !important;
  animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

/* ── Buttons: slide in ── */
.hero-slide [id*="Button" i],
.hero-slide [id*="button" i]:not([id*="card" i]) {
  animation-name: heroSlideIn !important;
}

/* ── Cards within slides: stagger up ── */
.hero-slide [id$="card" i] {
  animation-name: heroFadeUp !important;
}

/* ── Icons: pop ── */
.hero-slide [id*=" icon" i] {
  animation-name: heroPop !important;
  animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

/* ── Textarea / notes: slide up ── */
.hero-slide [id*="notes" i],
.hero-slide [id*="Textarea" i] {
  animation-name: heroFadeUp !important;
  animation-delay: 0.6s !important;
}

/* ── Checkbox: pop ── */
.hero-slide [id*="checkbox" i] {
  animation-name: heroPop !important;
  animation-delay: 0.7s !important;
}

/* ── Ensure defs/clips never animate ── */
.hero-slide svg > g > defs,
.hero-slide svg > g > clipPath,
.hero-slide svg > g > mask,
.hero-slide svg defs,
.hero-slide svg clipPath,
.hero-slide svg mask {
  opacity: 1 !important;
  animation: none !important;
}
`

export default function HeroIllustration() {
  const [[page, direction], setPage] = useState([0, 0])
  const [svgs, setSvgs] = useState<string[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── Fetch all SVGs on mount ── */
  useEffect(() => {
    let cancelled = false
    Promise.all(SLIDE_PATHS.map((p) => fetch(p).then((r) => r.text()))).then(
      (results) => {
        if (!cancelled) setSvgs(results)
      }
    )
    return () => {
      cancelled = true
    }
  }, [])

  /* ── Pagination ── */
  const paginate = useCallback((dir: number) => {
    setPage(([prev]) => [
      (prev + dir + SLIDE_PATHS.length) % SLIDE_PATHS.length,
      dir,
    ])
  }, [])

  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => paginate(1), AUTOPLAY_MS)
  }, [paginate])

  /* ── Auto-advance ── */
  useEffect(() => {
    resetTimer()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [resetTimer])

  const handleArrow = (dir: number) => {
    paginate(dir)
    resetTimer()
  }

  const goTo = (index: number) => {
    setPage(([prev]) => [index, index > prev ? 1 : -1])
    resetTimer()
  }

  /* ── Loading skeleton ── */
  if (!svgs.length) {
    return (
      <div className="w-full aspect-[607/659] rounded-xl bg-[#E6E8EC]/30 animate-pulse" />
    )
  }

  return (
    <div className="w-full">
      <style>{svgAnimationCSS}</style>

      {/* ── Carousel viewport ── */}
      <div className="relative overflow-hidden rounded-xl aspect-[607/659] bg-white">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={springSlide}
            className="hero-slide absolute inset-0"
            dangerouslySetInnerHTML={{ __html: svgs[page] }}
          />
        </AnimatePresence>
      </div>

      {/* ── Pagination controls ── */}
      <div className="flex items-center justify-center gap-4 mt-5">
        {/* Prev */}
        <motion.button
          onClick={() => handleArrow(-1)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-full bg-white border border-[#E6E8EC] flex items-center justify-center text-[#0F1629]/40 hover:text-[#0F1629]/80 transition-colors"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </motion.button>

        {/* Dots */}
        <div className="flex items-center gap-2.5">
          {SLIDE_PATHS.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full h-2"
              initial={false}
              animate={{
                width: i === page ? 20 : 8,
                backgroundColor: i === page ? "#1652C5" : "#D4D7DD",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Next */}
        <motion.button
          onClick={() => handleArrow(1)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-full bg-white border border-[#E6E8EC] flex items-center justify-center text-[#0F1629]/40 hover:text-[#0F1629]/80 transition-colors"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  )
}
