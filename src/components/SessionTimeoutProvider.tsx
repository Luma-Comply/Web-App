'use client'

import { useSessionTimeout } from '@/hooks/useSessionTimeout'
import { SessionTimeoutWarning } from '@/components/SessionTimeoutWarning'

export function SessionTimeoutProvider() {
  const { showWarning, timeRemaining, dismissWarning } = useSessionTimeout()

  return (
    <SessionTimeoutWarning
      open={showWarning}
      timeRemaining={timeRemaining}
      onStaySignedIn={dismissWarning}
    />
  )
}
