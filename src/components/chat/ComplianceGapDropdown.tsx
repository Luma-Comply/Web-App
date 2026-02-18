'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface RiskItem {
  text: string
  label: string
  severity: 'instant' | 'very-high' | 'high'
}

interface ComplianceGapDropdownProps {
  riskItems: RiskItem[]
  onSelectItem: (message: string) => void
}

const severityColors: Record<string, string> = {
  instant: 'bg-coral',
  'very-high': 'bg-amber-500',
  high: 'bg-yellow-500',
}

const severityLabels: Record<string, string> = {
  instant: 'Critical',
  'very-high': 'Very High',
  high: 'High',
}

export function ComplianceGapDropdown({ riskItems, onSelectItem }: ComplianceGapDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (riskItems.length === 0) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A2B50] hover:bg-[#243660] transition-colors text-sm text-white/60 focus:outline-none"
      >
        <div className="w-2 h-2 rounded-full bg-[#619DFF]" />
        <span>Discuss a compliance gap</span>
        <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-coral text-white text-[8px] font-mono">
          {riskItems.length}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-[#6A7180] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{
              type: 'spring',
              damping: 20,
              stiffness: 300,
            }}
            className="absolute top-full left-0 mt-2 z-50 bg-[#0F1629] rounded-xl shadow-lg border border-white/10 py-1.5 min-w-[320px] max-w-[420px] max-h-[300px] overflow-y-auto"
          >
            <div className="px-3 py-2 text-xs font-medium text-white/30 uppercase tracking-wide border-b border-white/5">
              Discuss a compliance gap
            </div>
            {riskItems.map((item, index) => (
              <motion.button
                key={index}
                type="button"
                className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-white/5 transition-colors cursor-pointer group"
                onClick={() => {
                  onSelectItem(
                    `I'd like to discuss this compliance gap: "${item.text}". What specific documentation or evidence do I need to address this?`
                  )
                  setIsOpen(false)
                }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: index * 0.03,
                  type: 'spring',
                  damping: 25,
                  stiffness: 300,
                }}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${severityColors[item.severity] || 'bg-gray-400'}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 group-hover:text-white transition-colors leading-snug">
                    {item.label}
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {severityLabels[item.severity] || 'Risk'}
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
