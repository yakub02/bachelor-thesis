import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  AlertCircle,
  Users,
  TrendingDown,
  TrendingUp,
  ShoppingBag,
  MapPin,
  Calendar,
  Clock,
  Tag,
  CheckCircle,
  X,
} from 'lucide-react'
import { ticketingApi } from '@/services'
import { ravetureApi, type Event } from '@/services/ravetureApi'
import type { TicketType, ResaleListing, ApiError } from '@/types'
import { AnimatedBackground, GlowButton, GlowInput, NewNavbar, NewFooter } from '@/components/design'
import { useAuth } from '@/context'
import { cn } from '@/utils'

// ============================================================================
// HELPERS
// ============================================================================

function formatError(err: unknown): ApiError {
  if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
    return { error: 'Network Error', message: 'Could not connect to the ticketing service.' }
  }
  return err as ApiError
}

function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('cs-CZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatEventTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}

function formatPrice(cents: number, currency = 'CZK') {
  return `${Math.floor(cents / 100)} ${currency}`
}

// ============================================================================
// TICKET TYPE CARD — mobile-first redesign
// ============================================================================

interface TicketTypeCardProps {
  ticketType: TicketType
  quantity: number
  onQuantityChange: (qty: number) => void
}

function TicketTypeCard({ ticketType, quantity, onQuantityChange }: TicketTypeCardProps) {
  const available = ticketType.quantity_available
  const isSoldOut = available <= 0
  const max = ticketType.max_per_order || available

  return (
    <div
      className={cn(
        'border border-border-grey overflow-hidden transition-all duration-200 ticket-card',
        !isSoldOut && quantity > 0
          ? 'border-primary/40 bg-primary/5'
          : 'bg-surface/10 hover:bg-surface/20 hover:border-border-grey/80',
        isSoldOut && 'opacity-55'
      )}
    >
      {/* Top section: name + description + availability */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 className="font-bold text-base uppercase tracking-tight leading-tight">
            {ticketType.name}
          </h3>
          {isSoldOut ? (
            <span className="px-2 py-0.5 bg-red-500/15 border border-red-500/40 text-red-400 text-[10px] font-mono uppercase flex-shrink-0 mt-0.5">
              Sold Out
            </span>
          ) : (
            quantity > 0 && (
              <span className="px-2 py-0.5 bg-primary/15 border border-primary/40 text-primary text-[10px] font-mono uppercase flex-shrink-0 mt-0.5">
                {quantity}× selected
              </span>
            )
          )}
        </div>

        {ticketType.description && (
          <p className="text-text-muted text-sm mb-3 leading-relaxed">{ticketType.description}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-text-muted">
          <span className="flex items-center gap-1">
            <span className="text-primary/70">◆</span>
            {available} available
          </span>
          {ticketType.max_per_order > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-primary/70">◆</span>
              Max {ticketType.max_per_order} per order
            </span>
          )}
        </div>
      </div>

      {/* Bottom bar: price + quantity controls */}
      <div className="border-t border-border-grey/40 px-5 py-3 flex items-center justify-between gap-4 bg-bg-dark/30">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-primary font-mono leading-none">
            {Math.floor(ticketType.price_cents / 100)}
          </span>
          <span className="text-xs text-text-muted font-mono">CZK</span>
        </div>

        {!isSoldOut && (
          <div className="flex items-center gap-0">
            <button
              onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
              disabled={quantity === 0}
              aria-label="Decrease quantity"
              className="w-10 h-10 border border-border-grey flex items-center justify-center font-mono text-lg text-text-muted hover:border-primary hover:text-primary disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              −
            </button>
            <span className="w-11 text-center font-mono text-base tabular-nums">{quantity}</span>
            <button
              onClick={() => onQuantityChange(Math.min(max, quantity + 1))}
              disabled={quantity >= max}
              aria-label="Increase quantity"
              className="w-10 h-10 border border-border-grey flex items-center justify-center font-mono text-lg text-text-muted hover:border-primary hover:text-primary disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// RESALE LISTING ROW
// ============================================================================

interface ResaleListingRowProps {
  listing: ResaleListing
  isConfirming: boolean
  isBuying: boolean
  isAuthenticated: boolean
  onFirstClick: () => void
  onConfirm: () => void
}

function ResaleListingRow({
  listing, isConfirming, isBuying, isAuthenticated, onFirstClick, onConfirm,
}: ResaleListingRowProps) {
  const currency = listing.currency ?? 'CZK'
  const isCheaper = listing.asking_price_cents < listing.original_price_cents
  const isHigher = listing.asking_price_cents > listing.original_price_cents

  return (
    <div className="resale-row flex items-center border border-border-grey/50 bg-surface/10 hover:bg-surface/20 hover:border-primary/20 transition-all duration-200 overflow-hidden group">
      <div className="w-1 self-stretch flex-shrink-0 bg-primary/35" />
      <div className="w-9 flex-shrink-0 flex items-center justify-center border-r border-dashed border-border-grey/40 self-stretch">
        <Users className="w-3.5 h-3.5 text-text-muted/60 group-hover:text-primary/60 transition-colors" />
      </div>

      <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold uppercase tracking-tight text-white truncate">
            {listing.ticket_type_name ?? 'General Admission'}
          </p>
          <p className="text-xs font-mono text-text-muted mt-0.5">Community resale</p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          {listing.asking_price_cents !== listing.original_price_cents && (
            <span className="text-xs font-mono text-text-muted line-through hidden sm:inline">
              {formatPrice(listing.original_price_cents, currency)}
            </span>
          )}
          <div className="flex items-center gap-1">
            {isCheaper && <TrendingDown className="w-3.5 h-3.5 text-green-400" />}
            {isHigher && <TrendingUp className="w-3.5 h-3.5 text-orange-400" />}
            <span className={cn(
              'text-sm font-bold font-mono',
              isCheaper ? 'text-green-400' : isHigher ? 'text-orange-400' : 'text-white'
            )}>
              {formatPrice(listing.asking_price_cents, currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="px-3 flex-shrink-0">
        {!isAuthenticated ? (
          <Link
            to="/login"
            className="px-3 py-1.5 text-xs font-mono uppercase border border-border-grey text-text-muted hover:border-primary hover:text-primary transition-colors"
          >
            Login
          </Link>
        ) : isConfirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-primary animate-pulse hidden sm:inline">Sure?</span>
            <button
              onClick={onConfirm}
              disabled={isBuying}
              className="px-3 py-1.5 text-xs font-mono uppercase bg-primary text-bg-dark font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isBuying ? '...' : 'Confirm'}
            </button>
          </div>
        ) : (
          <button
            onClick={onFirstClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase border border-primary/50 text-primary hover:bg-primary hover:text-bg-dark transition-colors"
          >
            <ShoppingBag className="w-3 h-3" />
            <span>Buy</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function EventShop() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const contentRef = useRef<HTMLDivElement>(null)

  const [event, setEvent] = useState<Event | null>(null)
  const [eventLoading, setEventLoading] = useState(true)
  const [eventError, setEventError] = useState<string | null>(null)

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderError, setOrderError] = useState<ApiError | null>(null)

  const [discountCode, setDiscountCode] = useState('')
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string; type: string; value: number; amount_cents: number
  } | null>(null)

  const [resaleListings, setResaleListings] = useState<ResaleListing[]>([])
  const [resaleLoading, setResaleLoading] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [buyError, setBuyError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return
    setEventLoading(true)
    ravetureApi.getEvent(eventId)
      .then(setEvent)
      .catch(() => setEventError('Event not found'))
      .finally(() => setEventLoading(false))
  }, [eventId])

  useEffect(() => {
    if (!event) return
    setLoading(true)
    ticketingApi.getTicketTypes(event.id)
      .then((data) => {
        setTicketTypes(data.ticket_types)
        const init: Record<string, number> = {}
        data.ticket_types.forEach((tt) => { init[tt.id] = 0 })
        setQuantities(init)
      })
      .catch((err) => setError(formatError(err)))
      .finally(() => setLoading(false))
  }, [event])

  useEffect(() => {
    if (!event) return
    setResaleLoading(true)
    ticketingApi.getResaleListings(event.id)
      .then((data) => setResaleListings(data.listings))
      .catch(() => { /* silent fail */ })
      .finally(() => setResaleLoading(false))
  }, [event])

  useGSAP(() => {
    if (eventLoading || loading) return
    gsap.fromTo('.event-info', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' })
    gsap.fromTo('.ticket-card',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out', delay: 0.2 }
    )
  }, [eventLoading, loading])

  useGSAP(() => {
    if (resaleLoading || resaleListings.length === 0) return
    gsap.fromTo('.resale-row',
      { opacity: 0, x: -12 },
      { opacity: 1, x: 0, duration: 0.3, stagger: 0.06, ease: 'power2.out' }
    )
  }, [resaleLoading, resaleListings.length])

  const handleQuantityChange = (id: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: qty }))
    if (appliedDiscount) { setAppliedDiscount(null); setDiscountCode('') }
  }

  const totalItems = Object.values(quantities).reduce((s, q) => s + q, 0)
  const subtotal = ticketTypes.reduce((s, tt) => s + tt.price_cents * (quantities[tt.id] || 0), 0)
  const discountAmount = appliedDiscount?.amount_cents || 0
  const totalPrice = Math.max(0, subtotal - discountAmount)

  const handleApplyDiscount = async () => {
    if (!event || !discountCode.trim() || subtotal === 0) return
    setDiscountLoading(true)
    setDiscountError(null)
    try {
      const result = await ticketingApi.validateDiscountCode({
        code: discountCode.trim(), event_id: event.id, order_total_cents: subtotal,
      })
      if (result.valid && result.discount_code && result.discount_amount_cents !== undefined) {
        setAppliedDiscount({
          code: result.discount_code.code,
          type: result.discount_code.discount_type,
          value: result.discount_code.discount_value,
          amount_cents: result.discount_amount_cents,
        })
      } else {
        setDiscountError(result.message || 'Invalid discount code')
        setAppliedDiscount(null)
      }
    } catch (err) {
      setDiscountError((err as { message?: string }).message || 'Failed to validate')
      setAppliedDiscount(null)
    } finally {
      setDiscountLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (!event || totalItems === 0) return
    setOrderLoading(true)
    setOrderError(null)
    try {
      const items = Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([id, quantity]) => ({ ticket_type_id: id, quantity }))
      const data = await ticketingApi.createOrder({
        event_id: event.id, items, discount_code: appliedDiscount?.code,
      })
      navigate('/checkout', {
        state: { order: data.order, expiresInSeconds: data.expires_in_seconds, eventName: event.name, discount: data.discount },
      })
    } catch (err) {
      setOrderError(formatError(err))
    } finally {
      setOrderLoading(false)
    }
  }

  const handleResaleFirstClick = (id: string) => { setConfirmingId(id); setBuyError(null) }
  const handleResaleConfirm = async (id: string) => {
    if (!isAuthenticated) { navigate('/login'); return }
    setBuyingId(id)
    try {
      await ticketingApi.buyResaleTicket(id)
      navigate('/my-tickets', { state: { justPurchased: true } })
    } catch (err) {
      setBuyError((err as ApiError).message || 'Purchase failed.')
      setBuyingId(null)
      setConfirmingId(null)
    }
  }

  const allOfficialSoldOut = !loading && ticketTypes.length > 0 && ticketTypes.every((tt) => tt.quantity_available === 0)
  const hasResale = resaleListings.length > 0

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <AnimatedBackground />
      <NewNavbar />

      <main ref={contentRef} className="pt-16 pb-20">

        {/* ── LOADING ─────────────────────────────────────────────── */}
        {eventLoading && (
          <div className="max-w-5xl mx-auto px-5 sm:px-8 py-16">
            <div className="animate-pulse space-y-4">
              <div className="h-[280px] md:h-[380px] bg-graphite/50 w-full" />
              <div className="h-8 bg-graphite/50 w-2/3 mt-6" />
              <div className="h-4 bg-graphite/40 w-1/3" />
              <div className="h-4 bg-graphite/40 w-1/2" />
            </div>
          </div>
        )}

        {/* ── ERROR ───────────────────────────────────────────────── */}
        {eventError && (
          <div className="max-w-5xl mx-auto px-5 sm:px-8 py-16">
            <div className="flex items-start gap-4 p-6 border border-red-500/40 bg-red-500/5">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <h2 className="font-bold text-red-400 mb-1">Event Not Found</h2>
                <p className="text-text-muted text-sm">{eventError}</p>
                <Link to="/" className="inline-block mt-4">
                  <GlowButton variant="outline" size="sm">← Back to Events</GlowButton>
                </Link>
              </div>
            </div>
          </div>
        )}

        {event && (
          <>
            {/* ── COVER IMAGE ─────────────────────────────────────── */}
            <div className="relative h-[260px] sm:h-[340px] md:h-[420px] overflow-hidden bg-graphite">
              {event.cover_image_url ? (
                <img
                  src={event.cover_image_url}
                  alt={event.name}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-8xl opacity-20">🎧</span>
                </div>
              )}
              {/* Gradient overlay — heavier at bottom so text is readable */}
              <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/40 to-transparent" />
              {/* Back link — overlaid on image */}
              <div className="absolute top-0 left-0 right-0 px-5 sm:px-8 pt-6 max-w-5xl mx-auto w-full">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-white/70 text-sm font-mono hover:text-primary transition-colors group"
                >
                  <span className="transition-transform group-hover:-translate-x-1">←</span>
                  Back to Events
                </Link>
              </div>
            </div>

            {/* ── EVENT INFO ─────────────────────────────────────── */}
            <div className="event-info max-w-5xl mx-auto px-5 sm:px-8 -mt-16 relative z-10 pb-10 border-b border-border-grey/40">
              <span className="text-primary text-xs font-mono uppercase tracking-widest mb-3 block">
                [ Buy Tickets ]
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight leading-none mb-6">
                {event.name}
              </h1>

              {/* Metadata row */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-muted mb-4">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary/70 flex-shrink-0" />
                  {formatEventDate(event.starts_at)}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary/70 flex-shrink-0" />
                  {formatEventTime(event.starts_at)}
                </span>
                {event.venue && (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary/70 flex-shrink-0" />
                    {event.venue.name}, {event.venue.city}
                  </span>
                )}
              </div>

              {/* Genre chips */}
              {event.genres && event.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {event.genres.map((g) => (
                    <span key={g} className="px-2.5 py-0.5 text-xs font-mono bg-primary/10 border border-primary/25 text-primary uppercase">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {event.short_description && (
                <p className="text-text-muted text-sm leading-relaxed max-w-2xl">{event.short_description}</p>
              )}
            </div>

            {/* ── TICKETS SECTION ─────────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-10">

              {/* Section header */}
              <div className="flex items-center gap-3 mb-5">
                <Tag className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-mono uppercase tracking-widest text-text-muted">
                  Select Tickets
                </h2>
              </div>

              {/* Loading tickets */}
              {loading && (
                <div className="flex items-center gap-3 py-8 text-text-muted">
                  <div className="w-5 h-5 border-2 border-primary/50 border-t-transparent rounded-full animate-spin" />
                  <span className="font-mono text-sm">Loading tickets...</span>
                </div>
              )}

              {/* Error loading tickets */}
              {error && (
                <div className="flex items-start gap-3 p-4 border border-red-500/40 bg-red-500/5">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 text-sm font-bold">{error.error}</p>
                    <p className="text-text-muted text-xs mt-0.5">{error.message}</p>
                  </div>
                </div>
              )}

              {/* Ticket type cards */}
              {!loading && !error && ticketTypes.length > 0 && (
                <div className="space-y-3">
                  {ticketTypes.map((tt) => (
                    <TicketTypeCard
                      key={tt.id}
                      ticketType={tt}
                      quantity={quantities[tt.id] || 0}
                      onQuantityChange={(qty) => handleQuantityChange(tt.id, qty)}
                    />
                  ))}
                </div>
              )}

              {/* No tickets */}
              {!loading && !error && ticketTypes.length === 0 && (
                <div className="py-12 text-center border border-border-grey/40">
                  <p className="text-text-muted font-mono text-sm">No tickets available for this event.</p>
                </div>
              )}

              {/* ── ORDER SUMMARY (appears when items selected) ───── */}
              {totalItems > 0 && (
                <div className="mt-6 space-y-3">

                  {/* Discount code */}
                  <div className="border border-border-grey/50 p-4 bg-surface/10">
                    <p className="text-xs font-mono uppercase text-text-muted mb-3 flex items-center gap-2">
                      <span className="text-primary/70">◆</span> Discount Code
                    </p>
                    {appliedDiscount ? (
                      <div className="flex items-center justify-between p-3 border border-green-500/40 bg-green-500/5">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="font-mono text-sm font-bold text-green-400">{appliedDiscount.code}</span>
                          <span className="text-text-muted text-xs">
                            ({appliedDiscount.type === 'percentage'
                              ? `${appliedDiscount.value}% off`
                              : `${appliedDiscount.value / 100} CZK off`})
                          </span>
                        </div>
                        <button
                          onClick={() => { setAppliedDiscount(null); setDiscountCode('') }}
                          className="text-text-muted hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <GlowInput
                          placeholder="DISCOUNT CODE"
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                          className="flex-1 text-sm uppercase"
                        />
                        <GlowButton
                          variant="outline"
                          size="sm"
                          onClick={handleApplyDiscount}
                          disabled={discountLoading || !discountCode.trim()}
                        >
                          {discountLoading ? '...' : 'Apply'}
                        </GlowButton>
                      </div>
                    )}
                    {discountError && (
                      <p className="text-red-400 text-xs font-mono mt-2">{discountError}</p>
                    )}
                  </div>

                  {/* Total + checkout */}
                  <div className="border border-primary/30 bg-primary/5 p-5">
                    {/* Line items */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm text-text-muted font-mono">
                        <span>Subtotal ({totalItems} {totalItems === 1 ? 'ticket' : 'tickets'})</span>
                        <span>{Math.floor(subtotal / 100)} CZK</span>
                      </div>
                      {appliedDiscount && discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-400 font-mono">
                          <span>Discount ({appliedDiscount.code})</span>
                          <span>−{Math.floor(discountAmount / 100)} CZK</span>
                        </div>
                      )}
                    </div>

                    {/* Total row + button */}
                    <div className="flex items-center justify-between gap-4 pt-4 border-t border-primary/20">
                      <div>
                        <p className="text-xs font-mono uppercase text-text-muted mb-0.5">Total</p>
                        <p className="text-3xl font-bold text-primary font-mono leading-none">
                          {Math.floor(totalPrice / 100)}{' '}
                          <span className="text-base font-normal text-text-muted">CZK</span>
                        </p>
                      </div>
                      <GlowButton onClick={handleCheckout} disabled={orderLoading} size="lg">
                        {orderLoading ? 'Creating order...' : 'Checkout →'}
                      </GlowButton>
                    </div>

                    {orderError && (
                      <p className="mt-3 text-red-400 text-xs font-mono">{orderError.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── COMMUNITY / RESALE SECTION ──────────────────────── */}
              {(hasResale || resaleLoading) && (
                <div className="mt-14">
                  {/* Divider */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-border-grey/50" />
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-text-muted/60" />
                      <span className="text-[10px] font-mono uppercase text-text-muted/60 tracking-widest">
                        Community
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-border-grey/50" />
                  </div>

                  <div className="flex items-baseline gap-3 mb-2">
                    <h2 className="text-xl font-bold uppercase tracking-tight">Community Tickets</h2>
                    {!resaleLoading && hasResale && (
                      <span className="px-2 py-0.5 text-xs font-mono border border-primary/30 text-primary bg-primary/5">
                        {resaleListings.length}
                      </span>
                    )}
                  </div>

                  {/* Sold-out notice */}
                  {allOfficialSoldOut && hasResale && (
                    <div className="flex items-start gap-3 p-4 border border-primary/30 bg-primary/5 mb-5">
                      <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-primary text-sm font-bold">Official tickets are sold out</p>
                        <p className="text-text-muted text-xs mt-0.5">
                          Community members are offering tickets below. Prices are capped at 110% of the original.
                        </p>
                      </div>
                    </div>
                  )}

                  {!allOfficialSoldOut && hasResale && (
                    <p className="text-text-muted text-xs font-mono mb-4">
                      Also available from community members. Prices are individually set and platform-capped.
                    </p>
                  )}

                  {resaleLoading && (
                    <div className="py-6 flex justify-center">
                      <div className="w-5 h-5 border-2 border-primary/40 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {!resaleLoading && hasResale && (
                    <div className="space-y-1.5">
                      {resaleListings.map((listing) => (
                        <ResaleListingRow
                          key={listing.id}
                          listing={listing}
                          isConfirming={confirmingId === listing.id}
                          isBuying={buyingId === listing.id}
                          isAuthenticated={isAuthenticated}
                          onFirstClick={() => handleResaleFirstClick(listing.id)}
                          onConfirm={() => handleResaleConfirm(listing.id)}
                        />
                      ))}
                    </div>
                  )}

                  {buyError && (
                    <div className="mt-3 flex items-center gap-2 p-3 border border-red-500/40 bg-red-500/5">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <p className="text-red-400 text-xs font-mono">{buyError}</p>
                    </div>
                  )}

                  {hasResale && (
                    <p className="text-text-muted/50 text-xs font-mono mt-4">
                      Resale prices are capped at max. 110% of the original price. Purchases are immediate.
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <NewFooter />
    </div>
  )
}
