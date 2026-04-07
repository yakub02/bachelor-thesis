import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { DateTimePicker, ImageUpload } from '@/components/ui'
import { useAuth } from '@/context'
import { ravetureApi } from '@/services/ravetureApi'
import { ticketingApi } from '@/services'
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

interface TicketType {
  name: string
  description: string
  price: number
  quantity: number
}

export function CreateEvent() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [step, setStep] = useState(1) // 1: Event Details, 2: Tickets
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Ticket types
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    { name: 'Early Bird', description: 'Limited early bird tickets', price: 200, quantity: 50 },
    { name: 'Regular', description: 'Standard admission', price: 350, quantity: 200 },
  ])

  const [createdEventId, setCreatedEventId] = useState<string | null>(null)

  useGSAP(() => {
    gsap.fromTo(
      '.create-card',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    )
  }, [step])

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-bg-dark text-white flex items-center justify-center">
        <AnimatedBackground />
        <GlowCard className="p-8 text-center max-w-md relative z-10">
          <span className="text-4xl mb-4 block">🔒</span>
          <h1 className="text-xl font-bold mb-2">Login Required</h1>
          <p className="text-text-muted mb-6">You need to be logged in to create events.</p>
          <Link to="/login">
            <GlowButton>Login</GlowButton>
          </Link>
        </GlowCard>
      </div>
    )
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!eventData.name.trim()) {
      setError('Event name is required')
      return
    }

    if (!eventData.starts_at) {
      setError('Start date is required')
      return
    }

    setIsLoading(true)

    try {
      const event = await ravetureApi.createEvent({
        name: eventData.name,
        description: eventData.description || undefined,
        short_description: eventData.short_description || undefined,
        starts_at: eventData.starts_at.toISOString(),
        ends_at: eventData.ends_at ? eventData.ends_at.toISOString() : undefined,
        event_type: eventData.event_type,
        genres: eventData.genres.length > 0 ? eventData.genres : undefined,
        ticketing_enabled: eventData.ticketing_enabled,
        min_age: eventData.min_age,
        cover_image_url: eventData.cover_image_url || undefined,
        venue_id: eventData.venue_id || undefined,
      })
      setCreatedEventId(event.id)

      if (eventData.ticketing_enabled) {
        setStep(2) // Go to ticket setup
      } else {
        // Publish and redirect
        await ravetureApi.updateEvent(event.id, { status: 'published' })
        navigate('/my-events')
      }
    } catch (err: unknown) {
      console.error('Event creation error:', err)
      if (err && typeof err === 'object' && 'error' in err) {
        setError((err as { error: string }).error)
      } else if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message)
      } else {
        setError('Failed to create event. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTickets = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createdEventId) return

    setError(null)
    setIsLoading(true)

    try {
      // Create ticket types in ticketing service
      for (const tt of ticketTypes) {
        if (tt.name && tt.quantity > 0) {
          await ticketingApi.createTicketType({
            event_id: createdEventId,
            name: tt.name,
            description: tt.description || undefined,
            price_cents: Math.round(tt.price * 100),
            quantity_total: tt.quantity,
            currency: 'CZK',
          })
        }
      }

      // Publish the event
      await ravetureApi.updateEvent(createdEventId, { status: 'published' })
      navigate('/my-events')
    } catch (err: unknown) {
      console.error('Ticket creation error:', err)
      if (err && typeof err === 'object' && 'error' in err) {
        setError((err as { error: string }).error)
      } else {
        setError('Failed to create ticket types')
      }
    } finally {
      setIsLoading(false)
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

  const addTicketType = () => {
    setTicketTypes(prev => [...prev, { name: '', description: '', price: 0, quantity: 0 }])
  }

  const updateTicketType = (index: number, field: keyof TicketType, value: string | number) => {
    setTicketTypes(prev => prev.map((tt, i) =>
      i === index ? { ...tt, [field]: value } : tt
    ))
  }

  const removeTicketType = (index: number) => {
    setTicketTypes(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <AnimatedBackground />
      <NewNavbar />

      <main className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-12">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-10 h-10 flex items-center justify-center font-mono text-sm transition-all',
                    step >= s
                      ? 'bg-primary text-black'
                      : 'bg-graphite border border-border-grey text-text-muted'
                  )}
                >
                  {s}
                </div>
                <span
                  className={cn(
                    'text-xs font-mono uppercase hidden sm:block',
                    step >= s ? 'text-white' : 'text-text-muted'
                  )}
                >
                  {s === 1 ? 'Event Details' : 'Tickets'}
                </span>
                {s < 2 && <div className="w-8 h-px bg-border-grey" />}
              </div>
            ))}
          </div>

          {/* Step 1: Event Details */}
          {step === 1 && (
            <GlowCard className="create-card p-8">
              <span className="text-primary text-xs font-mono uppercase tracking-widest mb-2 block">
                [ Step 1 ]
              </span>
              <h1 className="text-2xl font-bold uppercase tracking-tight mb-2">Create Event</h1>
              <p className="text-text-muted text-sm mb-8">
                Fill in your event details
              </p>

              <form onSubmit={handleCreateEvent} className="space-y-6">
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
                    minDate={new Date()}
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

                {error && (
                  <div className="p-4 border border-red-500/50 bg-red-500/10 text-red-400 text-sm font-mono">
                    {error}
                  </div>
                )}

                <GlowButton type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating...' : eventData.ticketing_enabled ? 'Continue to Tickets' : 'Create & Publish'}
                </GlowButton>
              </form>
            </GlowCard>
          )}

          {/* Step 2: Ticket Types */}
          {step === 2 && (
            <GlowCard className="create-card p-8">
              <span className="text-primary text-xs font-mono uppercase tracking-widest mb-2 block">
                [ Step 2 ]
              </span>
              <h1 className="text-2xl font-bold uppercase tracking-tight mb-2">Setup Tickets</h1>
              <p className="text-text-muted text-sm mb-8">
                Create ticket waves/types for your event
              </p>

              <form onSubmit={handleCreateTickets} className="space-y-6">
                {ticketTypes.map((tt, index) => (
                  <div key={index} className="border border-border-grey p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-mono text-primary">Ticket Type #{index + 1}</span>
                      {ticketTypes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTicketType(index)}
                          className="text-red-400 hover:text-red-300 text-sm font-mono"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <GlowInput
                        label="Name *"
                        placeholder="Early Bird"
                        value={tt.name}
                        onChange={(e) => updateTicketType(index, 'name', e.target.value)}
                      />
                      <GlowInput
                        label="Description"
                        placeholder="Limited offer"
                        value={tt.description}
                        onChange={(e) => updateTicketType(index, 'description', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <GlowInput
                        label="Price (CZK) *"
                        type="number"
                        placeholder="350"
                        value={tt.price.toString()}
                        onChange={(e) => updateTicketType(index, 'price', parseFloat(e.target.value) || 0)}
                      />
                      <GlowInput
                        label="Quantity *"
                        type="number"
                        placeholder="100"
                        value={tt.quantity.toString()}
                        onChange={(e) => updateTicketType(index, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addTicketType}
                  className="w-full py-3 border border-dashed border-border-grey text-text-muted hover:text-primary hover:border-primary transition-colors font-mono text-sm"
                >
                  + Add Another Ticket Type
                </button>

                {error && (
                  <div className="p-4 border border-red-500/50 bg-red-500/10 text-red-400 text-sm font-mono">
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <GlowButton
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={async () => {
                      // Skip tickets and publish
                      if (createdEventId) {
                        await ravetureApi.updateEvent(createdEventId, { status: 'published' })
                        navigate('/my-events')
                      }
                    }}
                  >
                    Skip & Publish
                  </GlowButton>
                  <GlowButton type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? 'Publishing...' : 'Create Tickets & Publish'}
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
