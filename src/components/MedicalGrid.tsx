import { cn } from "@/lib/utils"

interface MedicalGridProps {
  intensity?: "light" | "medium" | "strong"
  color?: string
  animated?: boolean
  className?: string
}

export default function MedicalGrid({
  intensity = "light",
  color,
  animated = false,
  className,
}: MedicalGridProps) {
  const opacityMap = {
    light: "0.08",
    medium: "0.15",
    strong: "0.25",
  }

  const gridColor = color || `rgba(183, 208, 193, ${opacityMap[intensity]})`

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none",
        animated && "animate-pulse",
        className
      )}
      style={{
        backgroundImage: `
          linear-gradient(${gridColor} 1px, transparent 1px),
          linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }}
      aria-hidden="true"
    />
  )
}
