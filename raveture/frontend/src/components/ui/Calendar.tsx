import * as React from "react"
import { cn } from "@/lib/utils"

export type CalendarProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string
  onChange?: (date: string) => void
  minDate?: string
}

export function Calendar({
  className,
  value,
  onChange,
  minDate,
  ...props
}: CalendarProps) {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value)
    }
  }

  return (
    <div className={cn("relative", className)} {...props}>
      <input
        type="date"
        value={value || ''}
        onChange={handleDateChange}
        min={minDate}
        className={cn(
          "flex h-12 w-full px-4 py-3",
          "bg-graphite border border-border-grey",
          "text-white font-mono text-sm",
          "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
          "transition-all duration-200",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "relative cursor-pointer",
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
          "[&::-webkit-calendar-picker-indicator]:opacity-60",
          "[&::-webkit-calendar-picker-indicator]:hover:opacity-100",
          "[&::-webkit-calendar-picker-indicator]:transition-opacity"
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange?.('')}
          className={cn(
            "absolute right-12 top-1/2 -translate-y-1/2",
            "text-text-muted hover:text-primary transition-colors",
            "text-sm font-mono"
          )}
        >
          ✕
        </button>
      )}
    </div>
  )
}
