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
  const [hasAnimated, setHasAnimated] = useState(false)
  const elementRef = useRef<HTMLSpanElement>(null)

  // Use a ref to hold the animating value so GSAP can target it
  const valueRef = useRef({ val: 0 })

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)

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
        threshold: 0.5,
      }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [value, duration, hasAnimated])

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
