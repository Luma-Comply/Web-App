"use client"

import { useEffect, useState } from "react"

export function useStickyHeader(threshold = 80) {
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setIsCompact(window.scrollY > threshold)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [threshold])

  return { isCompact }
}
