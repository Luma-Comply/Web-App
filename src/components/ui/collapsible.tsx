"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

interface CollapsibleTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  className?: string
}

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

const CollapsibleContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({
  open: false,
  onOpenChange: () => {},
})

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ open: controlledOpen, onOpenChange, children, className }, ref) => {
    const [internalOpen, setInternalOpen] = React.useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    const handleOpenChange = React.useCallback(
      (newOpen: boolean) => {
        if (!isControlled) {
          setInternalOpen(newOpen)
        }
        onOpenChange?.(newOpen)
      },
      [isControlled, onOpenChange]
    )

    return (
      <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
        <div ref={ref} className={cn(className)}>
          {children}
        </div>
      </CollapsibleContext.Provider>
    )
  }
)
Collapsible.displayName = "Collapsible"

const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  CollapsibleTriggerProps
>(({ asChild, children, className }, ref) => {
  const { open, onOpenChange } = React.useContext(CollapsibleContext)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        ;(children as React.ReactElement<any>).props.onClick?.(e)
        onOpenChange(!open)
      },
      "data-state": open ? "open" : "closed",
    })
  }

  return (
    <button
      ref={ref}
      type="button"
      className={cn(className)}
      onClick={() => onOpenChange(!open)}
      data-state={open ? "open" : "closed"}
    >
      {children}
    </button>
  )
})
CollapsibleTrigger.displayName = "CollapsibleTrigger"

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  CollapsibleContentProps
>(({ children, className }, ref) => {
  const { open } = React.useContext(CollapsibleContext)

  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(className)}
      data-state={open ? "open" : "closed"}
    >
      {children}
    </div>
  )
})
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
