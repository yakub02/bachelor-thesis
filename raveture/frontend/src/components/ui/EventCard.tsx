import { Link } from 'react-router-dom'
import { cn } from '@/utils'
import { GlowButton, GlowCard } from '@/components/design'
import type { EventCardProps } from '@/types'

export function EventCard({ eventId, title, location, date, bpm, imageUrl, className }: EventCardProps) {
  return (
    <GlowCard
      className={cn(
        'border-r border-border-grey last:border-r-0 overflow-hidden p-0',
        className
      )}
    >
      {/* Image Container */}
      <div
        className={cn(
          'aspect-[3/4]',
          'bg-cover bg-center',
          'hover:scale-[1.02]',
          'transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
        )}
        style={{ backgroundImage: `url('${imageUrl}')` }}
      />

      {/* Content */}
      <div className="p-6 border-t border-border-grey">
        {/* Date and BPM */}
        <div className="flex justify-between items-start mb-4">
          <span className="font-mono text-[10px] bg-white text-black px-2 py-0.5">{date}</span>
          <span className="font-mono text-[10px] text-text-muted">{bpm} BPM</span>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold mb-1 uppercase tracking-tight">{title}</h3>

        {/* Location */}
        <p className="text-primary font-mono text-xs mb-4 uppercase">LOCATION: {location}</p>

        {/* CTA Button */}
        <Link to={`/events/${eventId}`}>
          <GlowButton
            variant="outline"
            size="sm"
            className="w-full py-3"
          >
            Get Entry
          </GlowButton>
        </Link>
      </div>
    </GlowCard>
  )
}
