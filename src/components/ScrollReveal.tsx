"use client"

import { useEffect, useRef, useState, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ScrollRevealProps {
  children: ReactNode
  direction?: "up" | "down" | "left" | "right"
  delay?: number
  className?: string
}

export default function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  className,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  const animationClass = {
    up: "animate-fade-in-up",
    down: "animate-fade-in-down",
    left: "animate-slide-in-left",
    right: "animate-slide-in-right",
  }[direction]

  const delayClass = delay > 0 ? `animation-delay-${delay}` : ""

  return (
    <div
      ref={ref}
      className={cn(
        "opacity-0",
        isVisible && animationClass,
        isVisible && delayClass,
        className
      )}
    >
      {children}
    </div>
  )
}
