import { cn } from '@/utils'
import type { FeatureCardProps } from '@/types'

export function FeatureCard({
  icon,
  title,
  description,
  highlighted = false,
  className,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        'p-8',
        'border-b md:border-b-0 md:border-r border-border-grey last:border-r-0',
        'flex flex-col gap-6',
        highlighted && 'bg-graphite',
        className
      )}
    >
      {/* Icon */}
      <span className="material-symbols-outlined text-primary text-4xl">{icon}</span>

      {/* Content */}
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold italic uppercase">{title}</h2>
        <p className="text-text-muted text-sm normal-case leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
