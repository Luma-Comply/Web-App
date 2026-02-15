"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"

interface AnimatedNumberProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  decimals?: number
}

export default function AnimatedNumber({
  value,
  duration = 2, // GSAP uses seconds by default for duration
  prefix = "",
  suffix = "",
  className = "",
  decimals = 0,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const elementRef = useRef<HTMLSpanElement>(null)
  const hasAnimatedRef = useRef(false)

  // Use a ref to hold the animating value so GSAP can target it
  const valueRef = useRef({ val: 0 })

  useEffect(() => {
    const el = elementRef.current
    if (!el) return

    // Reset on each effect run (handles React strict mode double-mount)
    hasAnimatedRef.current = false
    valueRef.current.val = 0
    setDisplayValue(0)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true

          gsap.to(valueRef.current, {
            val: value,
            duration: duration,
            ease: "power2.out",
            onUpdate: () => {
              setDisplayValue(valueRef.current.val)
            },
          })

          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
      }
    )

    observer.observe(el)

    return () => {
      observer.disconnect()
      gsap.killTweensOf(valueRef.current)
    }
  }, [value, duration])

  // Format the number with commas and specified decimals
  const formattedValue = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span ref={elementRef} className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  )
}
