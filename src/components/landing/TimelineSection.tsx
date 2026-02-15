"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Check } from "lucide-react"

const steps = [
  {
    title: "Enter Clinical Data",
    description:
      "Patient name, age, diagnosis codes, lab values, prior treatments. No PHI required.",
  },
  {
    title: "AI Generates Docs",
    description:
      "Comprehensive medical necessity documentation tailored to your payer's requirements.",
  },
  {
    title: "Review & Customize",
    description:
      "Adjust the generated documentation to match your clinical judgment and style.",
  },
  {
    title: "Export & Submit",
    description:
      "Download as Word or PDF. Paste into your EHR or payer portal. Done.",
  },
]

const BG = "#182040"
const BLUE = "#1652C5"
const STEP_DURATION = 3000
const RESET_PAUSE = 2000

export default function TimelineSection() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const timer = setTimeout(
      () => {
        if (activeStep < steps.length) {
          setActiveStep((s) => s + 1)
        } else {
          setActiveStep(0)
        }
      },
      activeStep >= steps.length ? RESET_PAUSE : STEP_DURATION
    )
    return () => clearTimeout(timer)
  }, [activeStep])

  return (
    <section className="py-24" style={{ backgroundColor: BG }}>
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif text-white mb-4">
            How It Works
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mb-16">
            From data entry to submission in minutes, not hours
          </p>

          {/* Desktop stepper */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Background line */}
              <div className="absolute top-5 left-[12.5%] right-[12.5%] h-0.5 bg-white/10" />

              {/* Animated progress line */}
              <motion.div
                className="absolute top-5 left-[12.5%] h-0.5 origin-left"
                style={{ backgroundColor: BLUE }}
                animate={{
                  width:
                    activeStep === 0
                      ? "0%"
                      : `${(Math.min(activeStep, steps.length - 1) / (steps.length - 1)) * 75}%`,
                }}
                transition={{ duration: 1, ease: "easeInOut" }}
              />

              <div className="grid grid-cols-4 relative">
                {steps.map((step, index) => {
                  const isCompleted = index < activeStep
                  const isActive = index === activeStep

                  return (
                    <div key={index} className="flex flex-col items-center text-center px-4">
                      {/* Circle */}
                      <div className="relative mb-8">
                        {/* Pulse ring on active */}
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 rounded-full border-2"
                            style={{ borderColor: BLUE }}
                            initial={{ scale: 1, opacity: 0.6 }}
                            animate={{ scale: 1.8, opacity: 0 }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeOut",
                            }}
                          />
                        )}

                        <motion.div
                          className="w-10 h-10 rounded-full flex items-center justify-center relative z-10 border-2"
                          animate={{
                            backgroundColor: isCompleted || isActive ? BLUE : BG,
                            borderColor: isCompleted || isActive ? BLUE : "rgba(255,255,255,0.2)",
                          }}
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                        >
                          <AnimatePresence mode="wait">
                            {isCompleted ? (
                              <motion.div
                                key="check"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 350,
                                  damping: 18,
                                }}
                              >
                                <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                              </motion.div>
                            ) : (
                              <motion.span
                                key="number"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className={`text-sm font-mono font-semibold ${
                                  isActive ? "text-white" : "text-white/30"
                                }`}
                              >
                                {index + 1}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </div>

                      {/* Title */}
                      <motion.h3
                        className="text-base font-semibold mb-2"
                        animate={{
                          color: isCompleted || isActive
                            ? "rgba(255,255,255,1)"
                            : "rgba(255,255,255,0.35)",
                        }}
                        transition={{ duration: 0.5 }}
                      >
                        {step.title}
                      </motion.h3>

                      {/* Description */}
                      <motion.p
                        className="text-sm leading-relaxed max-w-[200px]"
                        animate={{
                          color: isCompleted || isActive
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(255,255,255,0.2)",
                        }}
                        transition={{ duration: 0.5 }}
                      >
                        {step.description}
                      </motion.p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Mobile stepper (vertical) */}
          <div className="md:hidden space-y-8">
            {steps.map((step, index) => {
              const isCompleted = index < activeStep
              const isActive = index === activeStep

              return (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <motion.div
                      className="w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0"
                      animate={{
                        backgroundColor: isCompleted || isActive ? BLUE : BG,
                        borderColor: isCompleted || isActive ? BLUE : "rgba(255,255,255,0.2)",
                      }}
                      transition={{ duration: 0.5 }}
                    >
                      <AnimatePresence mode="wait">
                        {isCompleted ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 350,
                              damping: 18,
                            }}
                          >
                            <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </motion.div>
                        ) : (
                          <motion.span
                            key="number"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`text-sm font-mono font-semibold ${
                              isActive ? "text-white" : "text-white/30"
                            }`}
                          >
                            {index + 1}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    {index < steps.length - 1 && (
                      <div className="w-0.5 flex-1 mt-2 bg-white/10" />
                    )}
                  </div>
                  <div className="pb-4">
                    <motion.h3
                      className="text-base font-semibold mb-1"
                      animate={{
                        color: isCompleted || isActive
                          ? "rgba(255,255,255,1)"
                          : "rgba(255,255,255,0.35)",
                      }}
                      transition={{ duration: 0.5 }}
                    >
                      {step.title}
                    </motion.h3>
                    <motion.p
                      className="text-sm leading-relaxed"
                      animate={{
                        color: isCompleted || isActive
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(255,255,255,0.2)",
                      }}
                      transition={{ duration: 0.5 }}
                    >
                      {step.description}
                    </motion.p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
