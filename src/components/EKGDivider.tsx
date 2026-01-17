import { cn } from "@/lib/utils"

interface EKGDividerProps {
  color?: string
  height?: number
  animated?: boolean
  className?: string
}

export default function EKGDivider({
  color = "#7EA18D",
  height = 40,
  animated = true,
  className,
}: EKGDividerProps) {
  return (
    <div className={cn("w-full overflow-hidden", className)} aria-hidden="true">
      <svg
        width="100%"
        height={height}
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className={animated ? "animate-pulse" : ""}
      >
        <path
          d="M0 20 L200 20 L220 10 L240 30 L260 20 L280 20 L300 5 L320 35 L340 20 L1200 20"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />
      </svg>
    </div>
  )
}
