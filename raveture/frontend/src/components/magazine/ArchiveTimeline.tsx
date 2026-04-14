import { useState, useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import { ravetureApi } from '@/services/ravetureApi'

interface TimelineYear { year: number; count: number }
interface ArchivedEvent {
  id: string
  name: string
  date: string
  year: number
  venue_name: string | null
  city: string | null
  lineup_text: string | null
  organizer_name: string | null
  is_verified: boolean
}

export function ArchiveTimeline() {
  const [timeline, setTimeline] = useState<TimelineYear[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [events, setEvents] = useState<ArchivedEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)

  useEffect(() => {
    ravetureApi.getArchiveTimeline().then(d => {
      setTimeline(d.timeline)
      if (d.timeline.length > 0) setSelectedYear(d.timeline[0].year)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedYear) return
    setEventsLoading(true)
    ravetureApi.getArchivedEvents({ year: selectedYear, per_page: 20 })
      .then(d => setEvents(d.events))
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false))
  }, [selectedYear])

  if (timeline.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-text-muted uppercase tracking-widest text-sm">Archive je prázdný</p>
      </div>
    )
  }

  return (
    <div className="flex gap-8">
      <div className="flex-none w-28 border-r border-border pr-4">
        <p className="text-text-muted text-xs uppercase tracking-widest mb-4">Rok</p>
        <div className="space-y-1">
          {timeline.map(t => (
            <button
              key={t.year}
              onClick={() => setSelectedYear(t.year)}
              className={`w-full text-left px-2 py-1.5 text-sm font-black transition-colors ${
                selectedYear === t.year ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-white'
              }`}
            >
              {t.year}
              <span className="ml-1 text-xs font-normal opacity-60">({t.count})</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-white font-black uppercase text-xl mb-6">
          {selectedYear}
          <span className="text-text-muted font-normal text-sm ml-3">{events.length} akcí</span>
        </h2>
        {eventsLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-surface border border-border animate-pulse h-24" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-text-muted text-sm">Žádné akce pro tento rok</p>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="bg-surface border border-border p-4 hover:border-accent transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-black uppercase text-sm truncate">{event.name}</h3>
                      {event.is_verified && (
                        <CheckCircle className="flex-none w-3.5 h-3.5 text-accent" title="Verified" />
                      )}
                    </div>
                    <p className="text-text-muted text-xs mt-0.5">
                      {event.venue_name && `${event.venue_name} · `}
                      {event.city && `${event.city} · `}
                      {new Date(event.date).toLocaleDateString('cs-CZ')}
                    </p>
                    {event.lineup_text && (
                      <p className="text-text-muted text-xs mt-2 line-clamp-2 leading-relaxed">
                        {event.lineup_text}
                      </p>
                    )}
                  </div>
                  {event.organizer_name && (
                    <span className="flex-none text-text-muted text-xs border border-border px-2 py-0.5 uppercase">
                      {event.organizer_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
