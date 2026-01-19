"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface AutocompleteProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  suggestions?: string[]
  onValueChange?: (value: string) => void
  onSearch?: (query: string) => string[]
  maxSuggestions?: number
}

export const Autocomplete = React.forwardRef<HTMLInputElement, AutocompleteProps>(
  (
    {
      className,
      suggestions = [],
      onValueChange,
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
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Handle click outside to close suggestions
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
      setShowSuggestions(false)
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

    // Update internal state when external value changes
    React.useEffect(() => {
      if (props.value !== undefined) {
        setInputValue(props.value as string)
      }
    }, [props.value])

    return (
      <div ref={containerRef} className="relative w-full">
        <Input
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
          className={cn(className)}
          autoComplete="off"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-white border border-sage-medium/30 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <li
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  "px-4 py-2 cursor-pointer text-sm transition-colors",
                  index === activeSuggestionIndex
                    ? "bg-mint/10 text-dark-bg"
                    : "hover:bg-sage-light/20 text-gray-700"
                )}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
)

Autocomplete.displayName = "Autocomplete"
