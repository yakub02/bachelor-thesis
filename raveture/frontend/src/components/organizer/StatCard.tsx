import { Card } from '@/components/ui'
import { cn } from '@/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  trend?: {
    value: number
    label: string
  }
  variant?: 'default' | 'success' | 'warning' | 'error'
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  const variantColors = {
    default: 'text-primary',
    success: 'text-success',
    warning: 'text-yellow-400',
    error: 'text-error',
  }

  return (
    <Card hover={false} className={cn('p-6', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-muted text-xs font-mono uppercase">{title}</p>
          <p className={cn('text-3xl font-mono font-bold mt-1', variantColors[variant])}>
            {value}
          </p>
          {subtitle && (
            <p className="text-text-secondary text-sm mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  'material-symbols-outlined text-sm',
                  trend.value >= 0 ? 'text-success' : 'text-error'
                )}
              >
                {trend.value >= 0 ? 'trending_up' : 'trending_down'}
              </span>
              <span
                className={cn(
                  'text-xs font-mono',
                  trend.value >= 0 ? 'text-success' : 'text-error'
                )}
              >
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-text-muted text-xs">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-lg bg-primary/10', variantColors[variant])}>
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
      </div>
    </Card>
  )
}
