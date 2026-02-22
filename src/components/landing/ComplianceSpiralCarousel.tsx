"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"

const CARDS = [
  {
    id: "endless-forms",
    title: "Endless Forms, Zero Patients",
    image: "/stock-photos-ai/Endless-Forms.webp",
    description:
      "Every prior auth starts with payer-specific forms. Luma auto-generates compliant documentation so you never touch a form again.",
  },
  {
    id: "on-hold",
    title: "On Hold. Again.",
    image: "/stock-photos-ai/OnHold.webp",
    description:
      "The average PA phone call takes 45 minutes of hold time. Luma eliminates the call with AI-generated, submission-ready documentation.",
  },
  {
    id: "appeals",
    title: "Appeals After Hours",
    image: "/stock-photos-ai/AppealsAfterHours.webp",
    description:
      "Denied PAs mean late nights writing appeals. Luma generates targeted appeal letters in under 2 minutes with one click.",
  },
  {
    id: "faxing",
    title: "Still Faxing in 2026",
    image: "/stock-photos-ai/StillFaxingin2026.webp",
    description:
      "Payers still require faxed documentation. Luma produces print-ready PDFs formatted exactly how payers expect them.",
  },
  {
    id: "portal",
    title: "Portal Roulette",
    image: "/stock-photos-ai/PortalRoulette.webp",
    description:
      "Every payer portal works differently. Luma researches current payer requirements in real-time so you always submit the right criteria.",
  },
  {
    id: "pulled-away",
    title: "Pulled Away From Patients",
    image: "/stock-photos-ai/PulledAwayFromPatients.webp",
    description:
      "PA coordinators spend 13+ hours per week on prior auths. Luma cuts documentation time by 95%.",
  },
  {
    id: "deadlines",
    title: "A Wall of Deadlines",
    image: "/stock-photos-ai/AWallofDeadlines.webp",
    description:
      "Expiring PAs, pending decisions, appeal windows closing. Luma tracks every deadline and alerts you before anything slips.",
  },
  {
    id: "phone-tree",
    title: "Trapped in the Phone Tree",
    image: "/stock-photos-ai/TrappedinthePhoneTree.webp",
    description:
      "Press 1 for claims, press 2 for prior auth, press 3 for nothing. Luma bypasses the phone tree with documentation that gets approved first time.",
  },
  {
    id: "denial",
    title: "Denial Huddle",
    image: "/stock-photos-ai/AnotherDenialHuddle.webp",
    description:
      "27% of PAs are denied. Most practices don&apos;t track why. Luma categorizes every denial and shows which payers are hardest to work with.",
  },
  {
    id: "behind",
    title: "The Day Starts Behind",
    image: "/stock-photos-ai/TheDayStartsBehind.webp",
    description:
      "Your inbox is full of PA requests before coffee. Luma turns a 45-minute task into a 2-minute workflow.",
  },
]

const NUM = CARDS.length
const GAP_RAD = Math.PI * 0.55
const GAP_CENTER = -Math.PI / 2
const RPM = 2.5

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function getEnvelope(angle: number) {
  let delta = angle - GAP_CENTER
  delta = ((delta + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
  const absDelta = Math.abs(delta)
  const halfGap = GAP_RAD / 2
  if (absDelta <= halfGap) return 0
  const rampWidth = Math.PI * 0.22
  const rampEnd = halfGap + rampWidth
  if (absDelta < rampEnd) {
    const t = (absDelta - halfGap) / rampWidth
    return t * t * (3 - 2 * t)
  }
  return 1
}

function getDims() {
  const w = typeof window !== "undefined" ? window.innerWidth : 1024
  if (w >= 1024) return { scene: 900, rx: 340, ry: 225, cardW: 260, cardH: 155 }
  if (w >= 768) return { scene: 680, rx: 260, ry: 175, cardW: 220, cardH: 130 }
  return { scene: 400, rx: 155, ry: 105, cardW: 170, cardH: 100 }
}

export default function ComplianceSpiralCarousel() {
  const sectionRef = useRef<HTMLElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const isPausedRef = useRef(false)
  const cumulativeAngleRef = useRef(0)
  const prevTsRef = useRef<number | null>(null)
  const hoveredIndexRef = useRef<number | null>(null)
  const hoverSprings = useRef(CARDS.map(() => ({ scale: 1, velocity: 0 })))

  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [showResolution, setShowResolution] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0)

  const prefersReduced = useReducedMotion()

  // Responsive detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Desktop orbit animation
  useEffect(() => {
    if (isMobile || prefersReduced) return

    const omega = -(RPM / 60) * Math.PI * 2

    function tick(ts: number) {
      if (prevTsRef.current === null) prevTsRef.current = ts
      const rawDt = (ts - prevTsRef.current) / 1000
      const dt = Math.min(rawDt, 0.05) // clamp to avoid jumps
      prevTsRef.current = ts

      if (!isPausedRef.current) {
        cumulativeAngleRef.current += omega * dt
      }

      // Update hover springs
      const stiffness = 400
      const damping = 25
      hoverSprings.current.forEach((spring, i) => {
        const target = hoveredIndexRef.current === i ? 1.12 : 1
        const force = stiffness * (target - spring.scale) - damping * spring.velocity
        spring.velocity += force * dt
        spring.scale += spring.velocity * dt
      })

      // Position cards
      const dims = getDims()
      const cx = dims.scene / 2
      const cy = dims.scene / 2

      if (sceneRef.current) {
        sceneRef.current.style.width = `${dims.scene}px`
        sceneRef.current.style.height = `${dims.scene}px`
      }

      cardRefs.current.forEach((el, i) => {
        if (!el) return
        const offset = (i / NUM) * Math.PI * 2
        const angle = cumulativeAngleRef.current + offset
        const env = getEnvelope(angle)
        const x = cx + Math.cos(angle) * dims.rx
        const y = cy + Math.sin(angle) * dims.ry
        const baseScale = lerp(0.0, 1.05, env)
        const blur = lerp(10, 0, env)
        const opacity = lerp(0, 1, env)
        const zIndex = Math.round(50 + Math.sin(angle) * 40)
        const tilt = Math.cos(angle) * 10
        const hoverScale = hoverSprings.current[i].scale
        const finalScale = baseScale * hoverScale

        // Hide if this card is expanded
        const isExpanded = expandedCard === CARDS[i].id
        const finalOpacity = isExpanded ? 0 : opacity

        el.style.width = `${dims.cardW}px`
        el.style.height = `${dims.cardH}px`
        el.style.transform = `translate(${x - dims.cardW / 2}px, ${y - dims.cardH / 2}px) scale(${finalScale.toFixed(4)}) rotateZ(${tilt.toFixed(2)}deg)`
        el.style.filter = `blur(${blur.toFixed(2)}px)`
        el.style.opacity = finalOpacity.toFixed(4)
        el.style.zIndex = String(hoveredIndexRef.current === i ? 200 : zIndex)
        el.style.pointerEvents = opacity < 0.3 ? "none" : "auto"
        el.style.cursor = opacity < 0.3 ? "default" : "pointer"
      })

      animIdRef.current = requestAnimationFrame(tick)
    }

    const animIdRef = { current: requestAnimationFrame(tick) }

    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current)
    }
  }, [isMobile, prefersReduced, expandedCard])

  // Reduced motion: static positions
  useEffect(() => {
    if (!prefersReduced || isMobile) return

    const dims = getDims()
    const cx = dims.scene / 2
    const cy = dims.scene / 2

    if (sceneRef.current) {
      sceneRef.current.style.width = `${dims.scene}px`
      sceneRef.current.style.height = `${dims.scene}px`
    }

    cardRefs.current.forEach((el, i) => {
      if (!el) return
      const offset = (i / NUM) * Math.PI * 2
      const angle = offset
      const env = getEnvelope(angle)
      const x = cx + Math.cos(angle) * dims.rx
      const y = cy + Math.sin(angle) * dims.ry
      const scale = lerp(0.0, 1.05, env)
      const blur = lerp(10, 0, env)
      const opacity = lerp(0, 1, env)
      const zIndex = Math.round(50 + Math.sin(angle) * 40)
      const tilt = Math.cos(angle) * 10

      el.style.width = `${dims.cardW}px`
      el.style.height = `${dims.cardH}px`
      el.style.transform = `translate(${x - dims.cardW / 2}px, ${y - dims.cardH / 2}px) scale(${scale.toFixed(4)}) rotateZ(${tilt.toFixed(2)}deg)`
      el.style.filter = `blur(${blur.toFixed(2)}px)`
      el.style.opacity = opacity.toFixed(4)
      el.style.zIndex = String(zIndex)
      el.style.pointerEvents = opacity < 0.3 ? "none" : "auto"
      el.style.cursor = opacity < 0.3 ? "default" : "pointer"
    })
  }, [prefersReduced, isMobile])

  // Mobile auto-cycle
  useEffect(() => {
    if (!isMobile || expandedCard || prefersReduced) return
    const timer = setInterval(() => {
      setMobileActiveIndex((prev) => (prev + 1) % NUM)
    }, 3500)
    return () => clearInterval(timer)
  }, [isMobile, expandedCard, prefersReduced])

  // Intersection observer for center text crossfade
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    let hasTriggered = false
    let autoTimer: ReturnType<typeof setTimeout> | null = null

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTriggered) {
            const delay = prefersReduced ? 0 : 4000
            autoTimer = setTimeout(() => {
              if (!hasTriggered) {
                hasTriggered = true
                setShowResolution(true)
              }
            }, delay)
          }
          if (!entry.isIntersecting && autoTimer) {
            clearTimeout(autoTimer)
            autoTimer = null
          }
        })
      },
      { threshold: 0.5 }
    )
    observer.observe(section)

    return () => {
      observer.disconnect()
      if (autoTimer) clearTimeout(autoTimer)
    }
  }, [prefersReduced])

  // Escape key to close overlay
  useEffect(() => {
    if (!expandedCard) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [expandedCard])

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (expandedCard) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [expandedCard])

  const handleDismiss = useCallback(() => {
    setExpandedCard(null)
    // Delay orbit resume so exit animation completes
    setTimeout(() => {
      isPausedRef.current = false
    }, 400)
  }, [])

  const handleCardHoverStart = useCallback((index: number) => {
    hoveredIndexRef.current = index
    isPausedRef.current = true
  }, [])

  const handleCardHoverEnd = useCallback(() => {
    hoveredIndexRef.current = null
    if (!expandedCard) {
      isPausedRef.current = false
    }
  }, [expandedCard])

  const handleCardClick = useCallback((id: string) => {
    setExpandedCard(id)
    isPausedRef.current = true
  }, [])

  const expandedCardData = expandedCard
    ? CARDS.find((c) => c.id === expandedCard)
    : null

  return (
    <>
      <style>{`
        .spiral-card {
          position: absolute;
          top: 0;
          left: 0;
          border-radius: 16px;
          will-change: transform, filter, opacity;
          transform-origin: center center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
          overflow: hidden;
          background-size: cover;
          background-position: center;
          background-color: #2a2a2a;
        }
        .spiral-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(24,32,64,0.7), rgba(24,32,64,0.15));
        }
        .spiral-card-title {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -0.2px;
          color: #ffffff;
          text-align: center;
          padding: 0 12px;
          width: 100%;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.3;
        }
        @media (max-width: 767px) {
          .spiral-card-title {
            font-size: 16px;
            top: 14px;
            padding: 0 16px;
          }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .spiral-card-title { font-size: 13px; }
        }
        .spiral-center {
          position: absolute;
          top: 45%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 100;
          text-align: center;
          pointer-events: none;
          width: 320px;
        }
        @media (max-width: 767px) {
          .spiral-center {
            position: relative;
            top: auto;
            left: auto;
            transform: none;
            width: 100%;
            max-width: 340px;
            margin: 0 auto;
            padding: 0 20px;
            pointer-events: none;
          }
        }
        .mobile-card-container {
          position: relative;
          width: 320px;
          height: 200px;
          margin: 0 auto;
        }
        .mobile-card {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          overflow: hidden;
          background-size: cover;
          background-position: center;
          background-color: #2a2a2a;
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
          cursor: pointer;
        }
        .dot-indicators {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 20px;
        }
        .dot-indicators button {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          background: rgba(0,0,0,0.2);
          padding: 0;
          cursor: pointer;
          transition: background 0.3s, transform 0.3s;
        }
        .dot-indicators button.active {
          background: rgba(0,0,0,0.6);
          transform: scale(1.3);
        }
      `}</style>

      <section
        ref={sectionRef}
        className="w-full flex items-center justify-center"
        style={{ minHeight: "100vh", backgroundColor: "#edeae2" }}
      >
        <div className="w-full flex flex-col items-center md:block md:w-auto">
          {/* Center Text */}
          {isMobile ? (
            <div className="spiral-center" style={{ marginBottom: 32, paddingTop: 40 }}>
              <AnimatePresence mode="wait">
                {!showResolution ? (
                  <motion.div
                    key="chaos"
                    initial={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                  >
                    <h2
                      className="font-serif"
                      style={{
                        fontSize: "clamp(36px, 7vw, 42px)",
                        fontWeight: 900,
                        lineHeight: 1.0,
                        color: "#111",
                        letterSpacing: "-2px",
                        marginBottom: 16,
                      }}
                    >
                      You didn&apos;t go into medicine for this.
                    </h2>
                    <p style={{ fontSize: 16, color: "#444", lineHeight: 1.6 }}>
                      Prior auths. Denial appeals. LCD lookups.
                      <br />
                      45 minutes of hold music. Your patients are waiting.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="resolution"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h2
                      className="font-serif"
                      style={{
                        fontSize: "clamp(36px, 7vw, 42px)",
                        fontWeight: 900,
                        lineHeight: 1.0,
                        color: "#111",
                        letterSpacing: "-2px",
                        marginBottom: 16,
                      }}
                    >
                      From 45 minutes to under 2.
                    </h2>
                    <p style={{ fontSize: 16, color: "#444", lineHeight: 1.6 }}>
                      AI-generated medical necessity documentation.
                      <br />
                      HIPAA-safe. Audit-proof. So you can focus on patients.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : null}

          {/* Desktop: Orbit Scene */}
          {!isMobile && (
            <div
              ref={sceneRef}
              className="relative mx-auto"
              style={{ width: 900, height: 900, maxWidth: "100vw", marginTop: -60 }}
            >
              {/* Desktop center text */}
              <div className="spiral-center">
                <AnimatePresence mode="wait">
                  {!showResolution ? (
                    <motion.div
                      key="chaos-desktop"
                      initial={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4 }}
                    >
                      <h2
                        className="font-serif"
                        style={{
                          fontSize: "clamp(28px, 5vw, 42px)",
                          fontWeight: 900,
                          lineHeight: 1.0,
                          color: "#111",
                          letterSpacing: "-2px",
                          marginBottom: 16,
                        }}
                      >
                        You didn&apos;t go into medicine for this.
                      </h2>
                      <p style={{ fontSize: 14, color: "#444", lineHeight: 1.6 }}>
                        Prior auths. Denial appeals. LCD lookups.
                        <br />
                        45 minutes of hold music. Your patients are waiting.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="resolution-desktop"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <h2
                        className="font-serif"
                        style={{
                          fontSize: "clamp(28px, 5vw, 42px)",
                          fontWeight: 900,
                          lineHeight: 1.0,
                          color: "#111",
                          letterSpacing: "-2px",
                          marginBottom: 16,
                        }}
                      >
                        From 45 minutes to under 2.
                      </h2>
                      <p style={{ fontSize: 14, color: "#444", lineHeight: 1.6 }}>
                        AI-generated medical necessity documentation.
                        <br />
                        HIPAA-safe. Audit-proof. So you can focus on patients.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Orbit cards */}
              {CARDS.map((card, i) => (
                <div
                  key={card.id}
                  ref={(el) => {
                    cardRefs.current[i] = el
                  }}
                  className="spiral-card"
                  style={{ backgroundImage: `url(${card.image})` }}
                  onMouseEnter={() => handleCardHoverStart(i)}
                  onMouseLeave={() => handleCardHoverEnd()}
                  onClick={() => handleCardClick(card.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Learn more about: ${card.title}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      handleCardClick(card.id)
                    }
                  }}
                >
                  <div className="spiral-card-overlay" />
                  <div className="spiral-card-title">{card.title}</div>
                </div>
              ))}
            </div>
          )}

          {/* Mobile: Stacked Dissolving Cards */}
          {isMobile && (
            <div>
              <div className="mobile-card-container">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={CARDS[mobileActiveIndex].id}
                    className="mobile-card"
                    style={{
                      backgroundImage: `url(${CARDS[mobileActiveIndex].image})`,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    onClick={() => handleCardClick(CARDS[mobileActiveIndex].id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Learn more about: ${CARDS[mobileActiveIndex].title}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        handleCardClick(CARDS[mobileActiveIndex].id)
                      }
                    }}
                  >
                    <div className="spiral-card-overlay" />
                    <div className="spiral-card-title">
                      {CARDS[mobileActiveIndex].title}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Dot indicators */}
              <div className="dot-indicators">
                {CARDS.map((_, i) => (
                  <button
                    key={i}
                    className={i === mobileActiveIndex ? "active" : ""}
                    onClick={() => setMobileActiveIndex(i)}
                    aria-label={`Go to card ${i + 1}: ${CARDS[i].title}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Expand Overlay */}
      <AnimatePresence>
        {expandedCardData && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(15,22,41,0.7)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                zIndex: 1000,
              }}
              onClick={handleDismiss}
            />
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 1001,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
            <motion.div
              key="overlay"
              initial={{ opacity: 0, scale: 0.85, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 200, damping: 30 }}
              style={{
                width: "min(600px, 90vw)",
                maxHeight: "85vh",
                backgroundColor: "#fff",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
                pointerEvents: "auto",
              }}
              role="dialog"
              aria-label={expandedCardData.title}
            >
              {/* Large image */}
              <div
                style={{
                  width: "100%",
                  height: 300,
                  backgroundImage: `url(${expandedCardData.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />

              {/* Content */}
              <div style={{ padding: "28px 32px 32px" }}>
                <h3
                  className="font-serif"
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#111",
                    letterSpacing: "-0.5px",
                    marginBottom: 12,
                    lineHeight: 1.2,
                  }}
                >
                  {expandedCardData.title}
                </h3>
                <p
                  style={{
                    fontSize: 16,
                    color: "#444",
                    lineHeight: 1.7,
                    marginBottom: 24,
                  }}
                >
                  {expandedCardData.description}
                </p>
                <button
                  onClick={handleDismiss}
                  style={{
                    display: "block",
                    margin: "0 auto",
                    padding: "10px 32px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#666",
                    backgroundColor: "#f0f0f0",
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#e0e0e0")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f0f0f0")
                  }
                >
                  Close
                </button>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
