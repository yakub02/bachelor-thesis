import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useAuth } from '@/context'
import { ravetureApi, type Event, type Organizer } from '@/services/ravetureApi'
import { AnimatedBackground, GlowButton, GlowCard, NewNavbar, NewFooter } from '@/components/design'
import { cn } from '@/utils'

export function MyEvents() {
  const { isAuthenticated } = useAuth()

  const [events, setEvents] = useState<Event[]>([])
  const [organizer, setOrganizer] = useState<Organizer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    const fetchMyEvents = async () => {
      try {
        const data = await ravetureApi.getMyEvents()
        setEvents(data.events)
        setOrganizer(data.organizer || null)
      } catch (err) {
        setError('Failed to load events')
      } finally {
        setIsLoading(false)
      }
    }
    fetchMyEvents()
  }, [isAuthenticated])

  useGSAP(() => {
    if (isLoading) return

    gsap.fromTo(
      '.event-item',
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
      }
    )
  }, [isLoading])

  const handlePublish = async (eventId: string) => {
    try {
      await ravetureApi.updateEvent(eventId, { status: 'published' })
      setEvents(prev => prev.map(e =>
        e.id === eventId ? { ...e, status: 'published' } : e
      ))
    } catch {
      // publish failure is surfaced by the UI not updating
    }
  }

  const handleUnpublish = async (eventId: string) => {
    try {
      await ravetureApi.updateEvent(eventId, { status: 'draft' })
      setEvents(prev => prev.map(e =>
        e.id === eventId ? { ...e, status: 'draft' } : e
      ))
    } catch {
      // unpublish failure is surfaced by the UI not updating
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-bg-dark text-white flex items-center justify-center">
        <AnimatedBackground />
        <GlowCard className="p-8 text-center max-w-md relative z-10">
          <span className="text-4xl mb-4 block">🔒</span>
          <h1 className="text-xl font-bold mb-2">Login Required</h1>
          <p className="text-text-muted mb-6">You need to be logged in to view your events.</p>
          <Link to="/login">
            <GlowButton>Login</GlowButton>
          </Link>
        </GlowCard>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <AnimatedBackground />
      <NewNavbar />

      <main className="pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <span className="text-primary text-xs font-mono uppercase tracking-widest block mb-2">
                [ Organizer Panel ]
              </span>
              <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight">
                My Events
              </h1>
              {organizer && (
                <p className="text-text-muted text-sm font-mono mt-2">
                  Organizer: {organizer.name}
                </p>
              )}
            </div>
            <Link to="/create-event">
              <GlowButton>+ Create Event</GlowButton>
            </Link>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-text-muted mt-4 font-mono">Loading your events...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <GlowCard className="p-4 border-red-500/50 mb-8">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <span className="text-red-400 font-mono">{error}</span>
              </div>
            </GlowCard>
          )}

          {/* No organizer yet */}
          {!isLoading && !organizer && (
            <GlowCard className="p-12 text-center">
              <span className="text-5xl mb-4 block">🎤</span>
              <h2 className="text-xl font-bold mb-2">Become an Organizer</h2>
              <p className="text-text-muted mb-6">
                Create your organizer profile to start hosting events.
              </p>
              <Link to="/create-event">
                <GlowButton>Get Started</GlowButton>
              </Link>
            </GlowCard>
          )}

          {/* Events List */}
          {!isLoading && organizer && events.length === 0 && (
            <GlowCard className="p-12 text-center">
              <span className="text-5xl mb-4 block">📅</span>
              <h2 className="text-xl font-bold mb-2">No Events Yet</h2>
              <p className="text-text-muted mb-6">
                Create your first event to get started.
              </p>
              <Link to="/create-event">
                <GlowButton>Create Event</GlowButton>
              </Link>
            </GlowCard>
          )}

          {!isLoading && events.length > 0 && (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="event-item">
                  <GlowCard className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold uppercase tracking-tight hover:text-primary transition-colors">
                            {event.name}
                          </h3>
                          <span
                            className={cn(
                              'text-xs font-mono px-2 py-1 border',
                              event.status === 'published'
                                ? 'text-green-400 border-green-400/50 bg-green-500/10'
                                : event.status === 'cancelled'
                                ? 'text-red-400 border-red-400/50 bg-red-500/10'
                                : 'text-yellow-400 border-yellow-400/50 bg-yellow-500/10'
                            )}
                          >
                            {event.status?.toUpperCase() || 'DRAFT'}
                          </span>
                        </div>
                        <p className="text-text-muted text-sm font-mono">
                          {new Date(event.starts_at).toLocaleDateString('en-GB', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {event.short_description && (
                          <p className="text-text-muted text-sm mt-2">{event.short_description}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {event.status === 'draft' && (
                          <GlowButton
                            variant="primary"
                            size="sm"
                            onClick={() => handlePublish(event.id)}
                          >
                            Publish
                          </GlowButton>
                        )}
                        {event.status === 'published' && (
                          <GlowButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnpublish(event.id)}
                          >
                            Unpublish
                          </GlowButton>
                        )}
                        <Link to={`/edit-event/${event.id}`}>
                          <GlowButton variant="outline" size="sm">Edit</GlowButton>
                        </Link>
                        <Link to={`/events/${event.slug}`}>
                          <GlowButton variant="outline" size="sm">View</GlowButton>
                        </Link>
                        <Link to={`/organizer?event=${event.id}`}>
                          <GlowButton variant="outline" size="sm">Stats</GlowButton>
                        </Link>
                      </div>
                    </div>
                  </GlowCard>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <NewFooter />
    </div>
  )
}
