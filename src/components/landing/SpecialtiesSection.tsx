"use client"

import { useRef } from "react"
import { motion, useInView } from "motion/react"
import { Bone, Microscope, Bandage, PillBottle, type LucideIcon } from "lucide-react"

const SPECIALTIES: { name: string; description: string; icon: LucideIcon }[] = [
  {
    name: "Rheumatology",
    description: "Biologics PA pressure across dozens of agents and step-therapy protocols",
    icon: Bone,
  },
  {
    name: "Oncology",
    description: "Complex regimen documentation with evolving NCCN guideline requirements",
    icon: Microscope,
  },
  {
    name: "Wound Care",
    description: "Skin substitute prior auth mandates and seven-figure audit clawback exposure",
    icon: Bandage,
  },
  {
    name: "Gastroenterology",
    description: "IBD biologics step-therapy barriers and growing biosimilar PA complexity",
    icon: PillBottle,
  },
]

export default function SpecialtiesSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto" ref={ref}>
          <h2 className="font-serif font-normal text-[#0F1629] text-3xl md:text-4xl text-center mb-16">
            Built for high-risk, high-scrutiny specialties
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
            {SPECIALTIES.map((specialty, i) => {
              const Icon = specialty.icon
              return (
                <motion.div
                  key={specialty.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    delay: i * 0.1,
                  }}
                >
                  <div className="w-11 h-11 rounded-lg bg-[#F0F2F7] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[#1652C5]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0F1629] mb-2">
                    {specialty.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#1A2647]/70">
                    {specialty.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
