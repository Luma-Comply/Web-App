'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface OverlayGlowProps {
  trigger: number
}

export function OverlayGlow({ trigger }: OverlayGlowProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
      <AnimatePresence>
        {trigger > 0 && (
          <motion.svg
            key={trigger}
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <defs>
              {/* Subtle mint/sage shimmer */}
              <linearGradient id="luma-shimmer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(126, 161, 141, 0)" />
                <stop offset="30%" stopColor="rgba(126, 161, 141, 0.06)" />
                <stop offset="50%" stopColor="rgba(255, 255, 255, 0.1)" />
                <stop offset="70%" stopColor="rgba(183, 208, 193, 0.06)" />
                <stop offset="100%" stopColor="rgba(126, 161, 141, 0)" />
              </linearGradient>
              {/* Vertical fade mask */}
              <linearGradient id="luma-vertical-fade" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="40%" stopColor="white" stopOpacity="0.6" />
                <stop offset="100%" stopColor="white" stopOpacity="1" />
              </linearGradient>
              <mask id="luma-top-fade-mask">
                <rect x="-10" y="-60" width="120" height="220" fill="url(#luma-vertical-fade)" />
              </mask>
              <filter id="luma-shimmer-blur" x="-50%" y="-100%" width="200%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
              </filter>
            </defs>

            {/* Arch shimmer sweeping up from bottom */}
            <motion.path
              fill="url(#luma-shimmer-gradient)"
              filter="url(#luma-shimmer-blur)"
              mask="url(#luma-top-fade-mask)"
              initial={{
                d: 'M -10 115 Q 50 95 110 115 L 110 150 L -10 150 Z',
                opacity: 0,
              }}
              animate={{
                d: [
                  'M -10 115 Q 50 95 110 115 L 110 150 L -10 150 Z',
                  'M -10 45 Q 50 15 110 45 L 110 150 L -10 150 Z',
                  'M -10 -20 Q 50 -50 110 -20 L 110 150 L -10 150 Z',
                ],
                opacity: [0, 0.4, 0],
              }}
              transition={{
                duration: 0.6,
                ease: 'easeOut',
                times: [0, 0.5, 1],
              }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  )
}
