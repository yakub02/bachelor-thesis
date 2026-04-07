import { forwardRef } from 'react'
import { cn } from '@/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: Array<{ value: string; label: string }>
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className, ...props }, ref) => {
    return (
      <div className="relative">
        {label && (
          <label className="block text-xs font-mono text-text-muted mb-2 uppercase">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full',
            'bg-bg-dark',
            'border border-border-grey',
            'px-4 py-4',
            'font-mono text-sm uppercase',
            'text-white',
            'focus:ring-1 focus:ring-primary focus:border-primary',
            'outline-none',
            'transition-colors duration-200',
            'cursor-pointer',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    )
  }
)

Select.displayName = 'Select'
