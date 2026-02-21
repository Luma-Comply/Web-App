'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const WARNING_MS = 25 * 60 * 1000 // Warning at 25 minutes (5 min before timeout)

const ACTIVITY_EVENTS = [
  'mousemove',
  'keypress',
  'click',
  'scroll',
  'touchstart',
] as const

export function useSessionTimeout() {
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const router = useRouter()

  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const warningRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const countdownRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }, [])

  const signOut = useCallback(async () => {
    clearAllTimers()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }, [clearAllTimers, router])

  const startCountdown = useCallback((ms: number) => {
    setTimeRemaining(Math.ceil(ms / 1000))
    countdownRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const resetTimers = useCallback(() => {
    clearAllTimers()
    setShowWarning(false)

    warningRef.current = setTimeout(() => {
      setShowWarning(true)
      startCountdown(TIMEOUT_MS - WARNING_MS)
    }, WARNING_MS)

    timeoutRef.current = setTimeout(() => {
      signOut()
    }, TIMEOUT_MS)
  }, [clearAllTimers, signOut, startCountdown])

  const dismissWarning = useCallback(() => {
    resetTimers()
  }, [resetTimers])

  useEffect(() => {
    resetTimers()

    const handleActivity = () => {
      // Only reset if warning is not showing — once warning shows,
      // user must explicitly click "Stay Signed In"
      if (!showWarning) {
        resetTimers()
      }
    }

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    )

    return () => {
      clearAllTimers()
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWarning])

  return { showWarning, timeRemaining, dismissWarning }
}
