import { cn } from '@/utils'
import type { SectionHeaderProps } from '@/types'

export function SectionHeader({
  tag,
  title,
  linkText,
  linkHref = '#',
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex justify-between items-end mb-12', className)}>
      <div>
        {tag && <span className="font-mono text-xs text-primary font-bold">{tag}</span>}
        <h2 className="text-4xl font-bold tracking-tighter mt-2 uppercase">{title}</h2>
      </div>

      {linkText && (
        <a
          href={linkHref}
          className="font-mono text-xs border-b border-primary pb-1 hover:text-primary transition-colors uppercase"
        >
          {linkText}
        </a>
      )}
    </div>
  )
}
