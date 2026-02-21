'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface SessionTimeoutWarningProps {
  open: boolean
  timeRemaining: number
  onStaySignedIn: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SessionTimeoutWarning({
  open,
  timeRemaining,
  onStaySignedIn,
}: SessionTimeoutWarningProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onStaySignedIn() }}>
      <DialogContent
        className="sm:max-w-sm"
        aria-describedby="session-timeout-description"
        // Prevent closing via Escape or overlay click — user must act explicitly
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-dark-bg">Session Expiring</DialogTitle>
          <DialogDescription id="session-timeout-description" className="text-dark-bg/70">
            Your session will expire in{' '}
            <span className="font-semibold text-coral tabular-nums" aria-live="polite" aria-atomic="true">
              {formatTime(timeRemaining)}
            </span>{' '}
            due to inactivity.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button
            onClick={onStaySignedIn}
            className="w-full bg-mint text-white hover:bg-mint/90"
            autoFocus
          >
            Stay Signed In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
