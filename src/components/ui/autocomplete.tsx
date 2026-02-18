"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

export interface AutocompleteProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "onSelect"> {
  suggestions?: string[]
  onValueChange?: (value: string) => void
  onSelect?: (value: string) => void
  onSearch?: (query: string) => string[]
  maxSuggestions?: number
}

export const Autocomplete = React.forwardRef<HTMLInputElement, AutocompleteProps>(
  (
    {
      className,
      suggestions = [],
      onValueChange,
      onSelect,
      onSearch,
      maxSuggestions = 10,
      ...props
    },
    ref
  ) => {
    const [inputValue, setInputValue] = React.useState(props.value as string || "")
    const [filteredSuggestions, setFilteredSuggestions] = React.useState<string[]>([])
    const [showSuggestions, setShowSuggestions] = React.useState(false)
    const [activeSuggestionIndex, setActiveSuggestionIndex] = React.useState(0)
    const [hasSelected, setHasSelected] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setShowSuggestions(false)
        }
      }
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setInputValue(value)
      onValueChange?.(value)
      if (hasSelected) setHasSelected(false)

      if (value.length > 0) {
        const filtered = onSearch
          ? onSearch(value)
          : (suggestions || []).filter(suggestion =>
              suggestion.toLowerCase().includes(value.toLowerCase())
            ).slice(0, maxSuggestions)

        setFilteredSuggestions(filtered)
        setShowSuggestions(filtered.length > 0)
        setActiveSuggestionIndex(0)
      } else {
        setShowSuggestions(false)
      }
    }

    const handleSuggestionClick = (suggestion: string) => {
      setInputValue(suggestion)
      onValueChange?.(suggestion)
      onSelect?.(suggestion)
      setShowSuggestions(false)
      setHasSelected(true)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveSuggestionIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (filteredSuggestions[activeSuggestionIndex]) {
          handleSuggestionClick(filteredSuggestions[activeSuggestionIndex])
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false)
      }
    }

    React.useEffect(() => {
      if (props.value !== undefined) {
        setInputValue(props.value as string)
      }
    }, [props.value])

    return (
      <div ref={containerRef} className="relative w-full">
        <input
          ref={ref}
          {...props}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.length > 0 && filteredSuggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          className={cn(
            "flex h-11 w-full rounded-md border bg-white px-4 text-sm outline-none transition-colors duration-200 focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
            hasSelected ? "border-mint/50" : "border-input",
            className
          )}
          autoComplete="off"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
          aria-controls="payer-listbox"
          aria-activedescendant={showSuggestions ? `payer-option-${activeSuggestionIndex}` : undefined}
        />
        <AnimatePresence>
          {showSuggestions && filteredSuggestions.length > 0 && (
            <motion.ul
              id="payer-listbox"
              role="listbox"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.15 } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
              className="absolute z-[100] w-full mt-1 bg-white border border-sage-medium/30 rounded-lg shadow-lg max-h-60 overflow-auto"
            >
              {filteredSuggestions.map((suggestion, index) => (
                <li
                  key={suggestion}
                  id={`payer-option-${index}`}
                  role="option"
                  aria-selected={index === activeSuggestionIndex}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setActiveSuggestionIndex(index)}
                  className={cn(
                    "px-4 py-2.5 cursor-pointer text-sm border-b border-sage-light/20 last:border-0 transition-colors duration-100",
                    index === activeSuggestionIndex
                      ? "bg-mint/10"
                      : "hover:bg-gray-50"
                  )}
                >
                  {suggestion}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

Autocomplete.displayName = "Autocomplete"
