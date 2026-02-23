"use client"

interface WorkflowProgressBarProps {
  status: string
}

const STEPS = [
  { key: "draft", label: "Draft" },
  { key: "submitted", label: "Submitted" },
  { key: "in_review", label: "In Review" },
  { key: "decision", label: "Decision" },
] as const

function getStepIndex(status: string): number {
  switch (status) {
    case "chat":
    case "draft":
    case "generating":
      return 0
    case "submitted":
      return 1
    case "in_review":
      return 2
    case "approved":
    case "denied":
      return 3
    default:
      return 0
  }
}

function getSubLabel(status: string, stepIndex: number, currentIndex: number): string | null {
  if (stepIndex < currentIndex) return "Complete"
  if (stepIndex > currentIndex) return null
  switch (status) {
    case "approved": return "Approved"
    case "denied": return "Denied"
    default: return "In progress"
  }
}

export function WorkflowProgressBar({ status }: WorkflowProgressBarProps) {
  const currentIndex = getStepIndex(status)
  const isDenied = status === "denied"

  return (
    <div
      className="bg-white border-b border-gray-100"
      role="group"
      aria-label="Case workflow progress"
    >
      <div className="max-w-[1400px] mx-auto px-6 flex items-center h-[52px]">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex
          const isActive = i === currentIndex
          const subLabel = getSubLabel(status, i, currentIndex)

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step node — pill hover area with circle + label */}
              <div className="flex items-center gap-2 py-1.5 px-3.5 rounded-full hover:bg-gray-50 transition-colors whitespace-nowrap relative z-[2]">
                {/* Circle: 22px, outlined for pending, filled for active/completed */}
                <div
                  className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[0.6rem] font-semibold flex-shrink-0 transition-all duration-300 ${
                    isCompleted
                      ? "bg-green-500 border-2 border-green-500 text-white"
                      : isActive
                      ? isDenied
                        ? "bg-coral border-2 border-coral text-white shadow-[0_0_0_4px_rgba(236,98,79,0.12)]"
                        : "bg-[#1652C5] border-2 border-[#1652C5] text-white shadow-[0_0_0_4px_rgba(22,82,197,0.12)]"
                      : "bg-white border border-gray-200 text-gray-400"
                  }`}
                >
                  {i + 1}
                </div>

                {/* Label + sublabel */}
                <div>
                  <p
                    className={`text-[0.7rem] leading-tight transition-colors duration-300 ${
                      isCompleted
                        ? "text-gray-500 font-medium"
                        : isActive
                        ? isDenied ? "text-coral font-semibold" : "text-dark-bg font-semibold"
                        : "text-gray-400 font-medium"
                    }`}
                  >
                    {step.label}
                  </p>
                  {subLabel && (
                    <p
                      className={`text-[0.6rem] leading-tight mt-px ${
                        isCompleted
                          ? "text-green-500"
                          : isActive
                          ? isDenied ? "text-coral/70" : "text-gray-400"
                          : "text-gray-300"
                      }`}
                    >
                      {subLabel}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector line — 2px, spans between steps */}
              {i < STEPS.length - 1 && (
                <div className="flex-1 min-w-[20px] relative z-[1]">
                  <div
                    className={`h-[1.5px] w-full transition-colors duration-300 ${
                      i < currentIndex ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
