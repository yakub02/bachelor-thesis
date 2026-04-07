import { cn } from '@/utils'
import type { ModuleCardProps } from '@/types'

export function ModuleCard({ number, title, description, className }: ModuleCardProps) {
  return (
    <div
      className={cn(
        'p-8',
        'border-b md:border-b-0 md:border-r border-border-grey last:border-r-0',
        'group hover:bg-black transition-colors duration-200',
        className
      )}
    >
      {/* Header */}
      <h3 className="font-bold text-primary mb-4 font-mono text-sm">
        {number} // {title}
      </h3>

      {/* Description */}
      <p className="text-sm normal-case text-text-secondary">{description}</p>
    </div>
  )
}
