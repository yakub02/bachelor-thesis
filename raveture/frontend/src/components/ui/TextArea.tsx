import { forwardRef } from 'react'
import { cn } from '@/utils'

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <div className="relative">
        {label && (
          <label className="block text-xs font-mono text-text-muted mb-2 uppercase">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full',
            'bg-transparent',
            'border border-border-grey',
            'px-4 py-4',
            'font-mono text-sm',
            'text-white',
            'placeholder:text-text-muted',
            'focus:ring-1 focus:ring-primary focus:border-primary',
            'outline-none',
            'transition-colors duration-200',
            'resize-y min-h-[100px]',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'
