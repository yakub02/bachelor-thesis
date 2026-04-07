import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { DateTimePicker, ImageUpload } from '@/components/ui'
import { useAuth } from '@/context'
import { ravetureApi, type Event } from '@/services/ravetureApi'
import { ticketingApi } from '@/services'
import type { TicketType } from '@/types'
import { AnimatedBackground, GlowButton, GlowCard, GlowInput, NewNavbar, NewFooter } from '@/components/design'
import { VenueSelector } from '@/components/organizer/VenueSelector'
import { cn } from '@/utils'

const EVENT_TYPES = [
  { value: 'club_night', label: 'Club Night' },
  { value: 'festival', label: 'Festival' },
  { value: 'open_air', label: 'Open Air' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'stream', label: 'Live Stream' },
  { value: 'private', label: 'Private Event' },
]

const GENRES = [
  'Techno', 'House', 'Drum & Bass', 'Trance', 'Dubstep',
  'Hardcore', 'Ambient', 'Minimal', 'Progressive', 'Industrial'
]

export function EditEvent() {
  const navigate = useNavigate()
  const { eventId } = useParams<{ eventId: string }>()
  const { isAuthenticated } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<Event | null>(null)

  // Ticket types state
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [ticketTypesLoading, setTicketTypesLoading] = useState(false)
  const [ticketTypesError, setTicketTypesError] = useState<string | null>(null)
  const [showAddTicketType, setShowAddTicketType] = useState(false)
  const [newTicketType, setNewTicketType] = useState({
    name: '',
    description: '',
    price_cents: 0,
    quantity_total: 100,
    max_per_order: 4,
  })
  const [addingTicketType, setAddingTicketType] = useState(false)

  // Event form
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    short_description: '',
    starts_at: undefined as Date | undefined,
    ends_at: undefined as Date | undefined,
    event_type: 'club_night',
    genres: [] as string[],
    ticketing_enabled: true,
    min_age: 18,
    cover_image_url: '',
    venue_id: null as string | null,
  })

  // Fetch event data on mount
  useEffect(() => {
    if (!isAuthenticated || !eventId) {
      setIsLoading(false)
      return
    }

    const fetchEvent = async () => {
      try {
        // Get event by ID - we need to fetch from my-events and find it
        const { events } = await ravetureApi.getMyEvents()
        const foundEvent = events.find(e => e.id === eventId)

        if (!foundEvent) {
          setError('Event not found or you do not have permission to edit it')
          setIsLoading(false)
          return
        }

        setEvent(foundEvent)
        setEventData({
          name: foundEvent.name,
          description: foundEvent.description || '',
          short_description: foundEvent.short_description || '',
          starts_at: new Date(foundEvent.starts_at),
          ends_at: foundEvent.ends_at ? new Date(foundEvent.ends_at) : undefined,
          event_type: foundEvent.event_type,
          genres: foundEvent.genres || [],
          ticketing_enabled: foundEvent.ticketing_enabled,
          min_age: foundEvent.min_age || 18,
          cover_image_url: foundEvent.cover_image_url || '',
          venue_id: foundEvent.venue_id || null,
        })
      } catch (err) {
        console.error('Failed to fetch event:', err)
        setError('Failed to load event')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [isAuthenticated, eventId])

  // Fetch ticket types when event is loaded
  useEffect(() => {
    if (!event || !event.ticketing_enabled) return

    const fetchTicketTypes = async () => {
      setTicketTypesLoading(true)
      setTicketTypesError(null)
      try {
        const data = await ticketingApi.getTicketTypes(event.id)
        setTicketTypes(data.ticket_types)
      } catch (err) {
        console.error('Failed to fetch ticket types:', err)
        setTicketTypesError('Failed to load ticket types')
      } finally {
        setTicketTypesLoading(false)
      }
    }

    fetchTicketTypes()
  }, [event])

  useGSAP(() => {
    if (isLoading) return

    gsap.fromTo(
      '.edit-card',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    )
  }, [isLoading])

  const handleAddTicketType = async () => {
    if (!event || !newTicketType.name.trim()) return

    setAddingTicketType(true)
    try {
      const created = await ticketingApi.createTicketType({
        event_id: event.id,
        name: newTicketType.name,
        description: newTicketType.description || undefined,
        price_cents: newTicketType.price_cents,
        quantity_total: newTicketType.quantity_total,
        max_per_order: newTicketType.max_per_order,
      })
      setTicketTypes(prev => [...prev, created])
      setNewTicketType({ name: '', description: '', price_cents: 0, quantity_total: 100, max_per_order: 4 })
      setShowAddTicketType(false)
    } catch (err: unknown) {
      console.error('Failed to create ticket type:', err)
      const error = err as { message?: string; error?: string }
      setTicketTypesError(error.message || error.error || 'Failed to create ticket type')
    } finally {
      setAddingTicketType(false)
    }
  }

  const handleToggleTicketType = async (ticketTypeId: string, isActive: boolean) => {
    try {
      await ticketingApi.updateTicketType(ticketTypeId, { is_active: !isActive })
      setTicketTypes(prev => prev.map(tt =>
        tt.id === ticketTypeId ? { ...tt, is_active: !isActive } : tt
      ))
    } catch (err) {
      console.error('Failed to toggle ticket type:', err)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-bg-dark text-white flex items-center justify-center">
        <AnimatedBackground />
        <GlowCard className="p-8 text-center max-w-md relative z-10">
          <span className="text-4xl mb-4 block">🔒</span>
          <h1 className="text-xl font-bold mb-2">Login Required</h1>
          <p className="text-text-muted mb-6">You need to be logged in to edit events.</p>
          <Link to="/login">
            <GlowButton>Login</GlowButton>
          </Link>
        </GlowCard>
      </div>
    )
  }

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventId) return

    setError(null)

    if (!eventData.name.trim()) {
      setError('Event name is required')
      return
    }

    if (!eventData.starts_at) {
      setError('Start date is required')
      return
    }

    setIsSaving(true)

    try {
      await ravetureApi.updateEvent(eventId, {
        name: eventData.name,
        description: eventData.description || undefined,
        short_description: eventData.short_description || undefined,
        starts_at: eventData.starts_at.toISOString(),
        ends_at: eventData.ends_at ? eventData.ends_at.toISOString() : null,
        event_type: eventData.event_type,
        genres: eventData.genres.length > 0 ? eventData.genres : undefined,
        ticketing_enabled: eventData.ticketing_enabled,
        min_age: eventData.min_age,
        cover_image_url: eventData.cover_image_url || undefined,
      })
      navigate('/my-events')
    } catch (err: unknown) {
      console.error('Event update error:', err)
      if (err && typeof err === 'object' && 'error' in err) {
        setError((err as { error: string }).error)
      } else if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message)
      } else {
        setError('Failed to save event. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const toggleGenre = (genre: string) => {
    setEventData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }))
  }

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <AnimatedBackground />
      <NewNavbar />

      <main className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-6">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-text-muted mt-4 font-mono">Loading event...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && !event && (
            <GlowCard className="p-8 text-center">
              <span className="text-4xl mb-4 block">⚠️</span>
              <h1 className="text-xl font-bold text-red-400 mb-2">Error</h1>
              <p className="text-text-muted mb-6">{error}</p>
              <Link to="/my-events">
                <GlowButton variant="outline">Back to My Events</GlowButton>
              </Link>
            </GlowCard>
          )}

          {/* Edit Form */}
          {!isLoading && event && (
            <GlowCard className="edit-card p-8">
              <span className="text-primary text-xs font-mono uppercase tracking-widest mb-2 block">
                [ Edit Mode ]
              </span>
              <h1 className="text-2xl font-bold uppercase tracking-tight mb-2">Edit Event</h1>
              <p className="text-text-muted text-sm mb-8">
                Update your event details
              </p>

              <form onSubmit={handleSaveEvent} className="space-y-6">
                <GlowInput
                  label="Event Name *"
                  placeholder="Summer Rave 2026"
                  value={eventData.name}
                  onChange={(e) => setEventData(prev => ({ ...prev, name: e.target.value }))}
                />

                <ImageUpload
                  label="Cover Image"
                  value={eventData.cover_image_url || null}
                  onChange={(url) => setEventData(prev => ({ ...prev, cover_image_url: url || '' }))}
                  category="events"
                  aspectRatio="video"
                />

                <GlowInput
                  label="Short Description"
                  placeholder="One line about the event"
                  value={eventData.short_description}
                  onChange={(e) => setEventData(prev => ({ ...prev, short_description: e.target.value }))}
                />

                <div>
                  <label className="block text-xs font-mono uppercase text-text-muted mb-2 tracking-wider">
                    Full Description
                  </label>
                  <textarea
                    placeholder="Describe your event in detail..."
                    value={eventData.description}
                    onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
                    rows={5}
                    className="w-full px-4 py-3 bg-bg-dark/50 border border-border-grey text-white placeholder-text-muted font-mono transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(218,120,88,0.2)] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DateTimePicker
                    label="Start Date & Time *"
                    value={eventData.starts_at}
                    onChange={(date) => setEventData(prev => ({ ...prev, starts_at: date }))}
                    placeholder="Select start date"
                  />

                  <DateTimePicker
                    label="End Date & Time"
                    value={eventData.ends_at}
                    onChange={(date) => setEventData(prev => ({ ...prev, ends_at: date }))}
                    minDate={eventData.starts_at || new Date()}
                    placeholder="Select end date"
                  />
                </div>

                <VenueSelector
                  value={eventData.venue_id}
                  onChange={(venueId) => setEventData(prev => ({ ...prev, venue_id: venueId }))}
                />

                <div>
                  <label className="block text-xs font-mono uppercase text-text-muted mb-2 tracking-wider">
                    Event Type
                  </label>
                  <select
                    value={eventData.event_type}
                    onChange={(e) => setEventData(prev => ({ ...prev, event_type: e.target.value }))}
                    className="w-full px-4 py-3 bg-bg-dark/50 border border-border-grey text-white font-mono transition-all duration-300 focus:outline-none focus:border-primary"
                  >
                    {EVENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-text-muted mb-2 tracking-wider">
                    Genres
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={cn(
                          'px-3 py-1 text-xs font-mono border transition-all',
                          eventData.genres.includes(genre)
                            ? 'bg-primary text-black border-primary'
                            : 'bg-transparent text-text-muted border-border-grey hover:border-primary hover:text-primary'
                        )}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24">
                    <GlowInput
                      label="Min Age"
                      type="number"
                      value={eventData.min_age.toString()}
                      onChange={(e) => setEventData(prev => ({ ...prev, min_age: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer mt-6">
                    <input
                      type="checkbox"
                      checked={eventData.ticketing_enabled}
                      onChange={(e) => setEventData(prev => ({ ...prev, ticketing_enabled: e.target.checked }))}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-mono">Enable Ticketing</span>
                  </label>
                </div>

                {/* Ticket Types Section */}
                {eventData.ticketing_enabled && (
                  <div className="border border-border-grey p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                        <span className="text-primary">◆</span>
                        Ticket Types
                      </h3>
                      <GlowButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddTicketType(!showAddTicketType)}
                      >
                        {showAddTicketType ? 'Cancel' : '+ Add'}
                      </GlowButton>
                    </div>

                    {ticketTypesError && (
                      <div className="p-3 border border-red-500/50 bg-red-500/10 text-red-400 text-sm font-mono">
                        {ticketTypesError}
                      </div>
                    )}

                    {/* Add new ticket type form */}
                    {showAddTicketType && (
                      <div className="bg-graphite/50 border border-border-grey p-4 space-y-4">
                        <GlowInput
                          label="Ticket Name *"
                          placeholder="e.g. Early Bird, Standard, VIP"
                          value={newTicketType.name}
                          onChange={(e) => setNewTicketType(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <GlowInput
                          label="Description"
                          placeholder="What's included with this ticket"
                          value={newTicketType.description}
                          onChange={(e) => setNewTicketType(prev => ({ ...prev, description: e.target.value }))}
                        />
                        <div className="grid grid-cols-3 gap-4">
                          <GlowInput
                            label="Price (CZK)"
                            type="number"
                            value={(newTicketType.price_cents / 100).toString()}
                            onChange={(e) => setNewTicketType(prev => ({ ...prev, price_cents: Math.round(parseFloat(e.target.value || '0') * 100) }))}
                          />
                          <GlowInput
                            label="Quantity"
                            type="number"
                            value={newTicketType.quantity_total.toString()}
                            onChange={(e) => setNewTicketType(prev => ({ ...prev, quantity_total: parseInt(e.target.value) || 0 }))}
                          />
                          <GlowInput
                            label="Max/Order"
                            type="number"
                            value={newTicketType.max_per_order.toString()}
                            onChange={(e) => setNewTicketType(prev => ({ ...prev, max_per_order: parseInt(e.target.value) || 1 }))}
                          />
                        </div>
                        <GlowButton
                          type="button"
                          onClick={handleAddTicketType}
                          disabled={addingTicketType || !newTicketType.name.trim()}
                        >
                          {addingTicketType ? 'Creating...' : 'Create Ticket Type'}
                        </GlowButton>
                      </div>
                    )}

                    {/* Existing ticket types */}
                    {ticketTypesLoading ? (
                      <p className="text-text-muted font-mono text-sm animate-pulse">Loading ticket types...</p>
                    ) : ticketTypes.length === 0 ? (
                      <p className="text-text-muted font-mono text-sm">No ticket types yet. Add one above.</p>
                    ) : (
                      <div className="space-y-2">
                        {ticketTypes.map((tt) => (
                          <div
                            key={tt.id}
                            className={cn(
                              'flex items-center justify-between p-3 border transition-all',
                              tt.is_active !== false
                                ? 'border-border-grey'
                                : 'border-border-grey/50 opacity-50'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {/* Eye icon for visibility toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleTicketType(tt.id, tt.is_active !== false)}
                                className="p-1 hover:bg-white/10 transition-colors"
                                title={tt.is_active !== false ? 'Hide from public' : 'Show to public'}
                              >
                                {tt.is_active !== false ? (
                                  // Eye open - visible
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                ) : (
                                  // Eye closed - hidden
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                  </svg>
                                )}
                              </button>
                              <div>
                                <span className="font-mono font-bold">{tt.name}</span>
                                <span className="text-primary ml-3">{(tt.price_cents / 100).toFixed(0)} CZK</span>
                                <span className="text-text-muted text-sm ml-3">
                                  {tt.quantity_available ?? tt.quantity_total} available
                                </span>
                                {tt.is_active === false && (
                                  <span className="text-red-400 text-xs ml-2 font-mono">(HIDDEN)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="p-4 border border-red-500/50 bg-red-500/10 text-red-400 text-sm font-mono">
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <Link to="/my-events" className="flex-1">
                    <GlowButton type="button" variant="outline" className="w-full">
                      Cancel
                    </GlowButton>
                  </Link>
                  <GlowButton type="submit" className="flex-1" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </GlowButton>
                </div>
              </form>
            </GlowCard>
          )}

          {/* Back link */}
          <div className="mt-8 text-center">
            <Link
              to="/my-events"
              className="inline-flex items-center gap-2 text-text-muted text-sm font-mono hover:text-primary transition-colors group"
            >
              <span className="transform transition-transform group-hover:-translate-x-1">&larr;</span>
              Back to My Events
            </Link>
          </div>
        </div>
      </main>

      <NewFooter />
    </div>
  )
}
