import { useState, useEffect } from 'react'
import { SectionHeader, EventCard } from '@/components/ui'
import { ravetureApi, type Event } from '@/services/ravetureApi'

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase()
}

function getEventLocation(event: Event): string {
  if (event.venue) {
    return `${event.venue.name}, ${event.venue.city}`
  }
  return 'TBA'
}

export function EventsSection() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      try {
        // Try featured events first, fall back to regular events
        const featuredResponse = await ravetureApi.getFeaturedEvents()
        if (featuredResponse.events.length > 0) {
          setEvents(featuredResponse.events.slice(0, 3))
        } else {
          const response = await ravetureApi.getEvents({ per_page: 3 })
          setEvents(response.events)
        }
      } catch {
        // events fail silently; section renders empty state
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  if (isLoading) {
    return (
      <section className="p-8 md:p-12 border-b border-border-grey">
        <SectionHeader
          tag="LIVE_FEED.EXE"
          title="FEATURED EVENTS"
          linkText="VIEW ALL EVENTS"
          linkHref="#events"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border-grey">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] bg-graphite animate-pulse border-r border-border-grey last:border-r-0" />
          ))}
        </div>
      </section>
    )
  }

  if (events.length === 0) {
    return (
      <section className="p-8 md:p-12 border-b border-border-grey">
        <SectionHeader
          tag="LIVE_FEED.EXE"
          title="FEATURED EVENTS"
          linkText="VIEW ALL EVENTS"
          linkHref="#events"
        />
        <div className="border border-border-grey p-12 text-center">
          <p className="text-text-muted font-mono text-sm">NO UPCOMING EVENTS</p>
          <p className="text-text-muted font-mono text-xs mt-2">Check back soon for new events</p>
        </div>
      </section>
    )
  }

  return (
    <section className="p-8 md:p-12 border-b border-border-grey">
      <SectionHeader
        tag="LIVE_FEED.EXE"
        title="FEATURED EVENTS"
        linkText="VIEW ALL EVENTS"
        linkHref="#events"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border-grey">
        {events.map((event) => (
          <EventCard
            key={event.id}
            eventId={event.id}
            title={event.name}
            location={getEventLocation(event)}
            date={formatEventDate(event.starts_at)}
            bpm={140}
            imageUrl={event.cover_image_url || '/placeholder-event.jpg'}
          />
        ))}
      </div>
    </section>
  )
}
