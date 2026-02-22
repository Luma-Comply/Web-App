"use client"

import { useEffect, useRef } from "react"

const CARDS = [
  { title: "Endless Forms, Zero Patients", image: "/stock-photos-ai/Endless-Forms.webp" },
  { title: "On Hold. Again.", image: "/stock-photos-ai/OnHold.webp" },
  { title: "Appeals After Hours", image: "/stock-photos-ai/AppealsAfterHours.webp" },
  { title: "Still Faxing in 2026", image: "/stock-photos-ai/StillFaxingin2026.webp" },
  { title: "Portal Roulette", image: "/stock-photos-ai/PortalRoulette.webp" },
  { title: "Pulled Away From Patients", image: "/stock-photos-ai/PulledAwayFromPatients.webp" },
  { title: "A Wall of Deadlines", image: "/stock-photos-ai/AWallofDeadlines.webp" },
  { title: "Trapped in the Phone Tree", image: "/stock-photos-ai/TrappedinthePhoneTree.webp" },
  { title: "Denial Huddle", image: "/stock-photos-ai/AnotherDenialHuddle.webp" },
  { title: "The Day Starts Behind", image: "/stock-photos-ai/TheDayStartsBehind.webp" },
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
  const state1Ref = useRef<HTMLDivElement>(null)
  const state2Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current!
    const scene = sceneRef.current!
    if (!section || !scene) return

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Build card DOM imperatively for animation perf
    const cardEls: HTMLDivElement[] = []
    CARDS.forEach((cfg) => {
      const el = document.createElement("div")
      el.className = "spiral-card"
      el.style.backgroundImage = `url(${cfg.image})`
      el.innerHTML =
        `<div class="spiral-card-overlay"></div>` +
        `<div class="spiral-card-title">${cfg.title}</div>`
      scene.appendChild(el)
      cardEls.push(el)
    })

    let cumulativeAngle = 0
    let prevTs: number | null = null
    let hasTriggered = false
    let animId: number | null = null
    let autoTimer: ReturnType<typeof setTimeout> | null = null

    function crossfadeText() {
      const s1 = state1Ref.current
      const s2 = state2Ref.current
      if (!s1 || !s2) return
      s1.style.transition = "opacity 0.4s ease, transform 0.4s ease"
      s1.style.opacity = "0"
      s1.style.transform = "translate(-50%, -50%) translateY(-10px)"
      setTimeout(() => {
        s1.style.display = "none"
        s2.style.display = "block"
        s2.style.opacity = "0"
        s2.style.transform = "translate(-50%, -50%) translateY(10px)"
        requestAnimationFrame(() => {
          s2.style.transition = "opacity 0.5s ease, transform 0.5s ease"
          s2.style.opacity = "1"
          s2.style.transform = "translate(-50%, -50%) translateY(0)"
        })
      }, 300)
    }

    function positionCards() {
      const dims = getDims()
      const cx = dims.scene / 2
      const cy = dims.scene / 2
      scene.style.width = `${dims.scene}px`
      scene.style.height = `${dims.scene}px`

      cardEls.forEach((el, i) => {
        const offset = (i / NUM) * Math.PI * 2
        const angle = cumulativeAngle + offset
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
      })
    }

    // --- Reduced motion: static ring, text swap on scroll ---
    if (prefersReduced) {
      positionCards()
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !hasTriggered) {
              hasTriggered = true
              crossfadeText()
            }
          })
        },
        { threshold: 0.5 }
      )
      obs.observe(section)
      return () => {
        obs.disconnect()
        cardEls.forEach((el) => el.remove())
      }
    }

    // --- Full animation: continuous orbit, text swap on scroll ---
    const omega = -(RPM / 60) * Math.PI * 2

    function tick(ts: number) {
      if (prevTs === null) prevTs = ts
      const dt = (ts - prevTs) / 1000
      prevTs = ts
      cumulativeAngle += omega * dt
      positionCards()
      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)

    // Intersection observer — only swaps the center text
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTriggered) {
            autoTimer = setTimeout(() => {
              if (!hasTriggered) {
                hasTriggered = true
                crossfadeText()
              }
            }, 4000)
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
      if (animId) cancelAnimationFrame(animId)
      if (autoTimer) clearTimeout(autoTimer)
      observer.disconnect()
      cardEls.forEach((el) => el.remove())
    }
  }, [])

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
            font-size: 11px;
            top: 8px;
            padding: 0 8px;
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
          .spiral-center { width: 230px; }
        }
      `}</style>

      <section
        ref={sectionRef}
        className="w-full flex items-center justify-center"
        style={{ minHeight: "100vh", backgroundColor: "#edeae2" }}
      >
        <div
          ref={sceneRef}
          className="relative mx-auto"
          style={{ width: 900, height: 900, maxWidth: "100vw", marginTop: -60 }}
        >
          {/* State 1: Chaos */}
          <div ref={state1Ref} className="spiral-center">
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
          </div>

          {/* State 2: Resolution */}
          <div
            ref={state2Ref}
            className="spiral-center"
            style={{ display: "none", opacity: 0 }}
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
          </div>
        </div>
      </section>
    </>
  )
}
