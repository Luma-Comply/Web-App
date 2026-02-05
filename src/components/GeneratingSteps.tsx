'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LumaLogo } from './LumaLogo'

const tidbits = [
  "Did you know? Insurance denials cost healthcare practices over $262 billion annually.",
  "Fact: 65% of denials are recoverable, but only 2% are ever appealed.",
  "Studies show: Prior auth appeals take 2-4 hours manually. We reduce this to minutes.",
  "Healthcare providers spend 13 hours per week on prior authorization paperwork.",
  "Our AI reviews 1000+ payer policies to find the strongest evidence for your case.",
  "Average approval rate increases by 40% when using evidence-based documentation.",
  "Fact: 89% of denials are due to insufficient documentation, not medical necessity.",
]

export type GenerationPhase =
  | 'loading_case'
  | 'researching'
  | 'validating'
  | 'extracting_forms'
  | 'generating'
  | 'saving'
  | 'complete'
  | 'error'

interface Step {
  id: GenerationPhase
  label: string
}

const steps: Step[] = [
  { id: 'loading_case', label: 'Loading case data' },
  { id: 'researching', label: 'Researching payer requirements' },
  { id: 'validating', label: 'Validating against LCD criteria' },
  { id: 'extracting_forms', label: 'Identifying required forms' },
  { id: 'generating', label: 'Generating documentation' },
  { id: 'saving', label: 'Finalizing your letter' },
]

// Animated checkmark using pathLength
function AnimatedCheck({ isComplete }: { isComplete: boolean }) {
  return (
    <div className="w-6 h-6 relative">
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={{ backgroundColor: 'rgb(229 231 235)' }}
        animate={{
          backgroundColor: isComplete ? 'rgb(126 161 141)' : 'rgb(229 231 235)',
        }}
        transition={{ duration: 0.3 }}
      />
      <svg viewBox="0 0 24 24" fill="none" className="absolute inset-0 w-6 h-6">
        <motion.path
          d="M6 12.5L10 16.5L18 8.5"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isComplete ? 1 : 0 }}
          transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
    </div>
  )
}

function PulsingDot() {
  return (
    <div className="w-6 h-6 flex items-center justify-center">
      <motion.div
        className="w-3 h-3 rounded-full bg-mint"
        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

function EmptyCircle() {
  return <div className="w-6 h-6 rounded-full border-2 border-gray-200" />
}

interface GeneratingStepsProps {
  caseId: string
  onComplete?: (result: any) => void
  onError?: (error: string) => void
}

export function GeneratingSteps({ caseId, onComplete, onError }: GeneratingStepsProps) {
  const [currentPhase, setCurrentPhase] = useState<GenerationPhase>('loading_case')
  const [completedPhases, setCompletedPhases] = useState<GenerationPhase[]>([])
  const [error, setError] = useState<string | null>(null)
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [tidbitIndex, setTidbitIndex] = useState(0)

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  // Rotate tidbits every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTidbitIndex((prev) => (prev + 1) % tidbits.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  const markPhaseComplete = useCallback((phase: GenerationPhase) => {
    setCompletedPhases(prev => {
      if (prev.includes(phase)) return prev
      return [...prev, phase]
    })
  }, [])

  // Start the streaming generation request
  useEffect(() => {
    let isCancelled = false
    let receivedComplete = false

    async function runGeneration() {
      try {
        const response = await fetch('/api/generate/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to generate')
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) throw new Error('No response body')

        while (true) {
          const { done, value } = await reader.read()
          if (done || isCancelled) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)

                if (parsed.phase) {
                  // Mark previous phase complete
                  const phaseIndex = steps.findIndex(s => s.id === parsed.phase)
                  if (phaseIndex > 0) {
                    for (let i = 0; i < phaseIndex; i++) {
                      markPhaseComplete(steps[i].id)
                    }
                  }
                  setCurrentPhase(parsed.phase)
                }

                if (parsed.complete) {
                  // Mark all phases complete
                  receivedComplete = true
                  steps.forEach(s => markPhaseComplete(s.id))
                  setCurrentPhase('complete')
                  onComplete?.(parsed.result)
                }

                if (parsed.error) {
                  setError(parsed.error)
                  setCurrentPhase('error')
                  onError?.(parsed.error)
                }
              } catch {
                // Not JSON, skip
              }
            }
          }
        }

        // Fallback: If stream ended without receiving complete event, check the database
        if (!isCancelled && !receivedComplete) {
          console.log('Stream ended without complete event, checking database...')
          // Give the DB a moment to finish any pending writes
          await new Promise(resolve => setTimeout(resolve, 1000))

          // Fetch the case to check if it was actually generated
          const checkResponse = await fetch(`/api/cases/${caseId}`)
          if (checkResponse.ok) {
            const caseData = await checkResponse.json()
            if (caseData.generated_output) {
              // Generation completed, trigger onComplete with available data
              steps.forEach(s => markPhaseComplete(s.id))
              setCurrentPhase('complete')
              onComplete?.({
                success: true,
                documentation: caseData.generated_output,
                validation: caseData.metadata?.lcd_validation_full,
              })
            }
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Generation failed')
          setCurrentPhase('error')
          onError?.(err.message)
        }
      }
    }

    runGeneration()

    return () => {
      isCancelled = true
    }
  }, [caseId, markPhaseComplete, onComplete, onError])

  const completedCount = completedPhases.length
  const totalSteps = steps.length

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-gray to-white flex items-start justify-center pt-20">
      <div className="text-center px-4 max-w-md mx-auto">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <LumaLogo className="w-16 h-16" variant="loading" />
        </div>

        <h3 className="text-xl font-semibold text-dark-bg mb-1">
          Researching & Drafting
        </h3>
        <p className="text-gray-500 text-sm mb-6">
          Building your documentation with the latest payer requirements
        </p>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-left">
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isComplete = completedPhases.includes(step.id)
              const isCurrent = currentPhase === step.id && !isComplete

              return (
                <motion.div
                  key={step.id}
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {isComplete ? (
                    <AnimatedCheck isComplete={true} />
                  ) : isCurrent ? (
                    <PulsingDot />
                  ) : (
                    <EmptyCircle />
                  )}

                  <motion.span
                    className={`text-sm flex-1 transition-colors duration-300 ${
                      isComplete
                        ? 'text-dark-bg font-medium'
                        : isCurrent
                        ? 'text-dark-bg'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </motion.span>

                  {isComplete && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-xs text-mint font-medium"
                    >
                      Done
                    </motion.span>
                  )}
                </motion.div>
              )
            })}
          </div>

          {error ? (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-sm text-coral">{error}</p>
            </div>
          ) : (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-mint to-sage-light rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${(completedCount / totalSteps) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-400">
                  {completedCount} of {totalSteps} steps complete
                </p>
                <p className="text-xs text-gray-400">
                  {elapsedTime}s elapsed
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tidbits section */}
        <div className="mt-8 h-16 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={tidbitIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-gray-500 italic max-w-sm"
            >
              "{tidbits[tidbitIndex]}"
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
