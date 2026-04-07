import { cn } from '@/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-graphite border border-border-grey p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
