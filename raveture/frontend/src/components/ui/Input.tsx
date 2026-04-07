import { cn } from '@/utils'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full px-4 py-3',
        'bg-graphite border border-border-grey',
        'text-white font-mono text-sm',
        'placeholder:text-text-muted',
        'focus:outline-none focus:border-primary',
        'transition-colors duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
}
