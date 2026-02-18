'use client'

import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload } from 'lucide-react'
import { OverlayGlow } from './OverlayGlow'

interface ChatOverlayProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function ChatOverlay({ isOpen, onClose, children }: ChatOverlayProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [glowTrigger, setGlowTrigger] = useState(0)
  const dragCounterRef = useRef(0)

  // Expose glow trigger globally so ChatInterface can call it
  const triggerGlow = useCallback(() => {
    setGlowTrigger((prev) => prev + 1)
  }, [])

  // Attach triggerGlow to the overlay element so parent can access it
  useEffect(() => {
    if (isOpen) {
      // Expose on window for ChatInterface to call on message send
      ;(window as any).__lumaChatGlow = triggerGlow
    }
    return () => {
      delete (window as any).__lumaChatGlow
    }
  }, [isOpen, triggerGlow])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0
    // Let the ChatInput inside handle the actual file drop
  }, [])

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            onClick={onClose}
          />

          {/* Close button */}
          <motion.button
            className="fixed top-6 right-6 z-[80] w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
            onClick={onClose}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1], delay: 0.15 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Close chat overlay"
          >
            <X className="w-5 h-5" />
          </motion.button>

          {/* Chat panel — dark theme */}
          <motion.div
            className="fixed inset-0 z-[70] flex flex-col"
            style={{ background: 'linear-gradient(135deg, #131B2E 0%, #0F1629 50%, #0A0E1A 100%)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Glow effect layer */}
            <OverlayGlow trigger={glowTrigger} />

            {/* Drop zone overlay */}
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  className="absolute inset-0 z-[75] bg-[#0F1629]/95 backdrop-blur-sm flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="flex flex-col items-center gap-4 p-12 rounded-3xl border-2 border-dashed border-[#619DFF]/30"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                    >
                      <Upload className="w-16 h-16 text-[#619DFF]/50" />
                    </motion.div>
                    <p className="text-lg font-medium text-white">Drop files here</p>
                    <p className="text-sm text-white/40">PDF, DOCX, PNG, JPG</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content area */}
            <div className="relative z-[2] flex-1 flex flex-col min-h-0 max-w-4xl w-full mx-auto">
              {/* Chat interface (children) */}
              <div className="flex-1 min-h-0">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
