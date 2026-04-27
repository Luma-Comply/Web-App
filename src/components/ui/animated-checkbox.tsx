"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AnimatedCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
  className?: string
  ariaLabel?: string
}

export function AnimatedCheckbox({
  checked,
  onChange,
  id,
  className,
  ariaLabel,
}: AnimatedCheckboxProps) {
  return (
    <span className={cn("animated-checkbox", className)} data-checked={checked}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={ariaLabel}
        className="absolute inset-0 w-full h-full appearance-none m-0 p-0 opacity-0 cursor-pointer"
      />
      <svg
        viewBox="0 0 21 21"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5,10.75 L8.5,14.25 L19.4,2.3 C18.8333333,1.43333333 18.0333333,1 17,1 L4,1 C2.35,1 1,2.35 1,4 L1,17 C1,18.65 2.35,20 4,20 L17,20 C18.65,20 20,18.65 20,17 L20,7.99769186" />
      </svg>
    </span>
  )
}
