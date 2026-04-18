import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  AlertTriangle,
  Users,
  TrendingDown,
  TrendingUp,
  ArrowLeft,
  CheckCircle2,
  X,
} from 'lucide-react'
import { ticketingApi } from '@/services'
import { ravetureApi, type Event } from '@/services/ravetureApi'
import type { TicketType, ResaleListing, ApiError } from '@/types'
import { NewNavbar, NewFooter } from '@/components/design'
import { useAuth, useLang } from '@/context'
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

function formatEventDate(dateStr: string, locale = 'en-GB') {
  return new Date(dateStr).toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatEventTime(dateStr: string, locale = 'en-GB') {
  return new Date(dateStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function formatPrice(cents: number, currency = 'CZK') {
  return `${Math.floor(cents / 100)} ${currency}`
}

// ============================================================================
// TICKET TYPE ROW — editorial list-row style
// ============================================================================

interface TicketTypeRowProps {
  ticketType: TicketType
  quantity: number
  index: number
  isActiveWave: boolean
  onQuantityChange: (qty: number) => void
}

function TicketTypeRow({ ticketType, quantity, index, isActiveWave, onQuantityChange }: TicketTypeRowProps) {
  const available = ticketType.quantity_available
  const isSoldOut = available <= 0
  const max = ticketType.max_per_order || available
  const { t } = useLang()
  const waveNum = String(index + 1).padStart(2, '0')
  const isSelected = quantity > 0

  return (
    <div
      className={cn(
        'ticket-card group relative transition-all duration-300',
        'border-b border-white/10',
        isSoldOut && 'opacity-40',
        isActiveWave && !isSoldOut && 'bg-primary/[0.04]',
        isSelected && !isSoldOut && 'bg-white/[0.02]'
      )}
    >
      {/* Left rail — active wave marker */}
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-0 bottom-0 w-[3px] transition-colors',
          isSoldOut
            ? 'bg-transparent'
            : isActiveWave
              ? 'bg-primary'
              : isSelected
                ? 'bg-white/40'
                : 'bg-transparent group-hover:bg-white/15'
        )}
      />

      <div className="flex items-stretch gap-5 sm:gap-7 py-7 pl-5 sm:pl-7 pr-2">
        {/* Wave index — big numeral */}
        <div className="shrink-0 w-16 sm:w-20 flex flex-col items-start justify-start pt-1">
          <span
            className={cn(
              'font-headline text-4xl sm:text-5xl leading-none tabular-nums transition-colors',
              isSoldOut
                ? 'text-white/15'
                : isActiveWave
                  ? 'text-primary'
                  : 'text-white/25 group-hover:text-white/50'
            )}
            style={{ fontWeight: 700 }}
          >
            {waveNum}
          </span>
          <span
            className={cn(
              'mt-1.5 text-[9px] font-mono tracking-[0.22em] uppercase',
              isActiveWave ? 'text-primary' : 'text-white/35'
            )}
          >
            Wave
          </span>
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3
                className="font-headline text-xl sm:text-2xl uppercase tracking-[-0.01em] leading-none"
                style={{ fontWeight: 700 }}
              >
                {ticketType.name}
              </h3>
              {isActiveWave && !isSoldOut && (
                <span className="text-[9px] font-mono tracking-[0.22em] uppercase bg-primary text-black px-1.5 py-0.5 font-semibold">
                  ◆ On sale
                </span>
              )}
              {isSoldOut && (
                <span className="text-[9px] font-mono tracking-[0.22em] uppercase border border-destructive/50 text-destructive px-1.5 py-0.5">
                  {t.common.soldOut}
                </span>
              )}
            </div>

            {ticketType.description && (
              <p className="text-white/55 text-[13px] leading-[1.55] max-w-xl mb-3">
                {ticketType.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono tracking-[0.22em] uppercase text-white/40">
              <span className={cn('tabular-nums', available > 0 && available < 20 && 'text-primary')}>
                {available} {t.eventShop.available}
              </span>
              {ticketType.max_per_order > 0 && (
                <>
                  <span className="opacity-30">/</span>
                  <span className="tabular-nums">
                    {t.eventShop.maxPerOrder.replace('{n}', String(ticketType.max_per_order))}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Price + stepper */}
        <div className="shrink-0 flex items-center gap-5 sm:gap-7 pr-4 sm:pr-6">
          <div className="text-right">
            <div
              className={cn(
                'font-headline text-3xl sm:text-4xl tabular-nums leading-none',
                isActiveWave ? 'text-primary' : 'text-white'
              )}
              style={{ fontWeight: 700 }}
            >
              {Math.floor(ticketType.price_cents / 100)}
              <span className="text-[11px] font-mono text-white/40 ml-1.5 tracking-wider align-middle">CZK</span>
            </div>
          </div>

          {!isSoldOut && (
            <div
              className={cn(
                'flex items-center border transition-colors',
                isSelected ? 'border-primary' : 'border-white/15'
              )}
            >
              <button
                onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
                disabled={quantity === 0}
                aria-label="Decrease quantity"
                className="w-10 h-10 flex items-center justify-center font-mono text-base text-white/70 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                −
              </button>
              <span
                className={cn(
                  'w-10 text-center font-mono text-[14px] tabular-nums',
                  isSelected ? 'text-primary font-semibold' : 'text-white/70'
                )}
              >
                {quantity}
              </span>
              <button
                onClick={() => onQuantityChange(Math.min(max, quantity + 1))}
                disabled={quantity >= max}
                aria-label="Increase quantity"
                className="w-10 h-10 flex items-center justify-center font-mono text-base text-white/70 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// RESALE LISTING ROW — editorial list style
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
  const { t } = useLang()
  const currency = listing.currency ?? 'CZK'
  const isCheaper = listing.asking_price_cents < listing.original_price_cents
  const isHigher = listing.asking_price_cents > listing.original_price_cents

  return (
    <div className="resale-row group flex items-center gap-5 py-4 border-b border-white/10 hover:bg-white/[0.015] transition-colors">
      <Users className="w-3.5 h-3.5 text-white/30 shrink-0" strokeWidth={1.5} />

      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-white truncate">
          {listing.ticket_type_name ?? 'General Admission'}
        </p>
        <p className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mt-1">
          {t.eventShop.communityResale}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {listing.asking_price_cents !== listing.original_price_cents && (
          <span className="text-[11px] font-mono text-white/30 line-through tabular-nums hidden sm:inline">
            {formatPrice(listing.original_price_cents, currency)}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          {isCheaper && <TrendingDown className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />}
          {isHigher && <TrendingUp className="w-3.5 h-3.5 text-destructive" strokeWidth={1.75} />}
          <span
            className={cn(
              'font-headline text-lg tabular-nums',
              isCheaper ? 'text-primary' : isHigher ? 'text-destructive' : 'text-white'
            )}
            style={{ fontWeight: 600 }}
          >
            {Math.floor(listing.asking_price_cents / 100)}
            <span className="text-[11px] font-mono text-white/40 ml-1 tracking-wider">{currency}</span>
          </span>
        </div>
      </div>

      <div className="shrink-0">
        {!isAuthenticated ? (
          <Link
            to="/login"
            className="px-4 py-2 text-[10px] font-mono tracking-[0.22em] uppercase border border-white/20 text-white/70 hover:border-white hover:text-white transition-colors"
          >
            {t.eventShop.loginToBuy}
          </Link>
        ) : isConfirming ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary hidden sm:inline">
              Sure?
            </span>
            <button
              onClick={onConfirm}
              disabled={isBuying}
              className="px-4 py-2 text-[10px] font-mono tracking-[0.22em] uppercase font-semibold bg-primary text-black hover:bg-white disabled:opacity-50 transition-colors"
            >
              {isBuying ? '...' : 'Confirm'}
            </button>
          </div>
        ) : (
          <button
            onClick={onFirstClick}
            className="px-4 py-2 text-[10px] font-mono tracking-[0.22em] uppercase border border-white/20 text-white/80 hover:border-white hover:text-white transition-colors"
          >
            Buy
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
  const { isAuthenticated, user } = useAuth()
  const { t, lang } = useLang()
  const locale = lang === 'cs' ? 'cs-CZ' : 'en-GB'
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

  const [isRTPick, setIsRTPick] = useState(false)
  const [pickModalOpen, setPickModalOpen] = useState(false)
  const [quickPickReason, setQuickPickReason] = useState('')
  const [pickActionLoading, setPickActionLoading] = useState(false)

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

  useEffect(() => {
    if (user?.role === 'admin' && event) {
      ravetureApi.checkPick(event.id).then(setIsRTPick).catch(() => {})
    }
  }, [user, event])

  useGSAP(() => {
    if (eventLoading || loading) return
    gsap.fromTo(
      '[data-shop-reveal]',
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.05, ease: 'power3.out' }
    )
    gsap.fromTo(
      '.ticket-card',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out', delay: 0.15 }
    )
  }, [eventLoading, loading])

  useGSAP(() => {
    if (resaleLoading || resaleListings.length === 0) return
    gsap.fromTo(
      '.resale-row',
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' }
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
        event_id: event.id,
        items,
        discount_code: appliedDiscount?.code,
        event_name: event.name,
        event_date: event.starts_at,
        event_venue: event.venue?.name || undefined,
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

  async function handleMakePick() {
    if (!event || !quickPickReason.trim()) return
    setPickActionLoading(true)
    try {
      await ravetureApi.createPick({ event_id: event.id, reason: quickPickReason.trim() })
      setIsRTPick(true)
      setPickModalOpen(false)
      setQuickPickReason('')
    } catch (e: any) {
      alert(e.message || 'Error')
    } finally {
      setPickActionLoading(false)
    }
  }

  async function handleRemovePickQuick() {
    if (!event) return
    setPickActionLoading(true)
    try {
      await ravetureApi.removePick(event.id)
      setIsRTPick(false)
    } catch (e: any) {
      alert(e.message || 'Error')
    } finally {
      setPickActionLoading(false)
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
      <NewNavbar />

      <main ref={contentRef} className="pt-24 pb-20">

        {/* ── LOADING ─────────────────────────────────────────────── */}
        {eventLoading && (
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-16">
            <div className="animate-pulse space-y-4">
              <div className="h-3 w-24 bg-white/5" />
              <div className="h-16 bg-white/5 w-2/3" />
              <div className="h-4 bg-white/5 w-1/3" />
            </div>
          </div>
        )}

        {/* ── ERROR ───────────────────────────────────────────────── */}
        {eventError && (
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-24">
            <div className="max-w-md">
              <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-destructive mb-4">
                § 404 / Not Found
              </div>
              <h2
                className="font-headline text-3xl sm:text-4xl uppercase tracking-[-0.02em] mb-4"
                style={{ fontWeight: 700 }}
              >
                Event not on the board.
              </h2>
              <p className="text-white/55 text-[14px] leading-[1.6] mb-8">{eventError}</p>
              <Link
                to="/events"
                className="inline-flex items-center gap-3 px-5 py-3 bg-primary text-black text-[11px] font-mono tracking-[0.2em] uppercase font-semibold hover:bg-white transition-colors duration-200"
              >
                <span>{t.eventShop.backToEvents}</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}

        {event && (
          <>
            {/* ── ISSUE STRIP ─────────────────────────────────────── */}
            <div className="border-b border-white/10">
              <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-9 flex items-center gap-5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 tabular-nums">
                <span className="text-primary text-xs leading-none">◆</span>
                <span className="text-white font-medium">Admission</span>
                <span className="opacity-40">/</span>
                <span className="truncate">{event.venue?.city || 'City'}</span>
                {event.genres?.[0] && (
                  <>
                    <span className="opacity-40 hidden sm:inline">/</span>
                    <span className="hidden sm:inline">{event.genres[0]}</span>
                  </>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <span className="w-1 h-1 bg-primary" />
                  <span>On sale</span>
                </div>
              </div>
            </div>

            {/* ── HERO — info left / flyer right ──────────────────── */}
            <div className="max-w-[1440px] mx-auto px-6 sm:px-10 pt-10">
              <Link
                to="/events"
                className="group inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors mb-10"
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                <span>{t.eventShop.backToEvents}</span>
              </Link>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-16">
                {/* LEFT — info block */}
                <div data-shop-reveal className="event-info lg:col-span-7 order-2 lg:order-1">
                  <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-5">
                    § 01 / {t.eventShop.buy}
                  </div>
                  <h1
                    className="font-headline uppercase leading-[0.9] tracking-[-0.035em] mb-7"
                    style={{ fontSize: 'clamp(2rem,5.2vw,4.5rem)', fontWeight: 700 }}
                  >
                    {event.name}
                  </h1>

                  {/* Date — large editorial block */}
                  <div className="border-t border-white/10 pt-5 mb-6">
                    <div className="flex items-baseline gap-4 flex-wrap">
                      <span
                        className="font-headline text-5xl sm:text-6xl leading-[0.85] tabular-nums text-white"
                        style={{ fontWeight: 700 }}
                      >
                        {String(new Date(event.starts_at).getDate()).padStart(2, '0')}
                      </span>
                      <div className="flex flex-col text-[11px] font-mono tracking-[0.22em] uppercase text-white/70">
                        <span className="text-white">
                          {new Date(event.starts_at).toLocaleString(locale, { month: 'long' })}
                          {' '}
                          <span className="text-white/40">
                            '{String(new Date(event.starts_at).getFullYear()).slice(-2)}
                          </span>
                        </span>
                        <span className="text-white/50 mt-0.5">
                          {new Date(event.starts_at).toLocaleString(locale, { weekday: 'long' })}
                          {' · '}
                          <span className="tabular-nums">{formatEventTime(event.starts_at, locale)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata hairline row */}
                  <dl className="grid grid-cols-2 border-t border-white/10 divide-x divide-white/10">
                    {event.venue && (
                      <div className="py-4 pr-4 first:pl-0 sm:pl-4">
                        <dt className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-1.5">
                          Venue
                        </dt>
                        <dd className="text-[13px] text-white truncate">{event.venue.name}</dd>
                      </div>
                    )}
                    {event.venue && (
                      <div className="py-4 pl-4">
                        <dt className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-1.5">
                          City
                        </dt>
                        <dd className="text-[13px] text-white">{event.venue.city}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="border-b border-white/10" />

                  {/* Genres */}
                  {event.genres && event.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-5">
                      {event.genres.map((g) => (
                        <span
                          key={g}
                          className="px-2.5 py-1 text-[10px] font-mono tracking-[0.2em] uppercase border border-white/15 text-white/70"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {event.short_description && (
                    <p className="text-white/60 text-[14px] leading-[1.65] max-w-2xl mt-6">
                      {event.short_description}
                    </p>
                  )}

                  {user?.role === 'admin' && (
                    <div className="mt-6">
                      {isRTPick ? (
                        <button
                          onClick={handleRemovePickQuick}
                          disabled={pickActionLoading}
                          className="text-[10px] font-mono tracking-[0.22em] uppercase border border-destructive/40 text-destructive px-3 py-1.5 hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        >
                          ◆ Remove RT Pick
                        </button>
                      ) : (
                        <button
                          onClick={() => setPickModalOpen(true)}
                          className="text-[10px] font-mono tracking-[0.22em] uppercase border border-primary/50 text-primary px-3 py-1.5 hover:bg-primary/10 transition-colors"
                        >
                          ◆ Make RT Pick
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT — 1080×1440 flyer */}
                <div data-shop-reveal className="lg:col-span-5 order-1 lg:order-2 lg:sticky lg:top-24">
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-white/[0.02] border border-white/10">
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt={event.name}
                        className="absolute inset-0 w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="font-headline text-[12rem] leading-none text-white/5 select-none"
                          style={{ fontWeight: 300 }}
                        >
                          ◆
                        </span>
                      </div>
                    )}
                    {/* Corner marks */}
                    <span aria-hidden className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/60" />
                    <span aria-hidden className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/60" />
                    <span aria-hidden className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-primary/60" />
                    <span aria-hidden className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-primary/60" />
                    {/* Bottom strip — format tag */}
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-black/55 backdrop-blur-sm text-[9px] font-mono tracking-[0.22em] uppercase text-white/80">
                      <span>◆ Flyer / 3:4</span>
                      <span className="text-primary">Official</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── TICKETS SECTION ─────────────────────────────────── */}
            <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
              <div data-shop-reveal className="mb-6">
                <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-3">
                  § 02 / {t.eventShop.selectTickets}
                </div>
                <h2
                  className="font-headline text-2xl sm:text-3xl uppercase tracking-[-0.02em]"
                  style={{ fontWeight: 600 }}
                >
                  Pick your tickets.
                </h2>
              </div>

              {loading && (
                <div className="flex items-center gap-3 py-10 text-white/50 border-t border-white/10">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-mono tracking-[0.22em] uppercase">
                    {t.eventShop.loadingTickets}
                  </span>
                </div>
              )}

              {error && (
                <div className="border-t border-b border-destructive/40 py-5 px-5 flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-destructive mb-1.5">
                      {error.error}
                    </div>
                    <p className="text-[13px] text-white/70 leading-[1.55]">{error.message}</p>
                  </div>
                </div>
              )}

              {!loading && !error && ticketTypes.length > 0 && (() => {
                const activeWaveId = ticketTypes.find((tt) => tt.quantity_available > 0)?.id
                return (
                  <div className="border-t border-white/10">
                    {ticketTypes.map((tt, i) => (
                      <TicketTypeRow
                        key={tt.id}
                        ticketType={tt}
                        quantity={quantities[tt.id] || 0}
                        index={i}
                        isActiveWave={tt.id === activeWaveId}
                        onQuantityChange={(qty) => handleQuantityChange(tt.id, qty)}
                      />
                    ))}
                  </div>
                )
              })()}

              {!loading && !error && ticketTypes.length === 0 && (
                <div className="border-t border-b border-white/10 py-16 text-center">
                  <h3
                    className="font-headline text-3xl sm:text-4xl uppercase tracking-[-0.02em] mb-3"
                    style={{ fontWeight: 600 }}
                  >
                    No tickets listed.
                  </h3>
                  <p className="text-white/40 text-[12px] font-mono tracking-[0.22em] uppercase">
                    {t.eventShop.noTickets}
                  </p>
                </div>
              )}

              {/* ── ORDER SUMMARY ───────────────────────────────────── */}
              {totalItems > 0 && (
                <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                  {/* Discount */}
                  <div className="lg:col-span-5">
                    <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-4">
                      § 03 / {t.eventShop.discountCode}
                    </div>
                    {appliedDiscount ? (
                      <div className="border-t border-b border-primary/40 py-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
                          <div className="min-w-0">
                            <div className="font-mono text-[12px] tracking-[0.18em] uppercase text-primary truncate">
                              {appliedDiscount.code}
                            </div>
                            <div className="text-white/50 text-[11px] mt-0.5">
                              {appliedDiscount.type === 'percentage'
                                ? `${appliedDiscount.value}% off`
                                : `${appliedDiscount.value / 100} CZK off`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => { setAppliedDiscount(null); setDiscountCode('') }}
                          aria-label="Remove discount"
                          className="text-white/40 hover:text-white transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    ) : (
                      <div className="border-t border-white/10 pt-4">
                        <div className="flex gap-0 border-b border-white/15 focus-within:border-white/60 transition-colors">
                          <input
                            type="text"
                            placeholder="DISCOUNT CODE"
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                            className="flex-1 bg-transparent text-[13px] font-mono tracking-[0.18em] uppercase text-white py-3 focus:outline-none placeholder-white/25"
                          />
                          <button
                            onClick={handleApplyDiscount}
                            disabled={discountLoading || !discountCode.trim()}
                            className="px-4 text-[10px] font-mono tracking-[0.22em] uppercase text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            {discountLoading ? '...' : t.eventShop.apply}
                          </button>
                        </div>
                        {discountError && (
                          <p className="text-destructive text-[10px] font-mono tracking-[0.2em] uppercase mt-2">
                            {discountError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Total + checkout */}
                  <div className="lg:col-span-7">
                    <div className="border-t border-white/10">
                      <div className="py-4 flex items-center justify-between border-b border-white/10">
                        <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50">
                          {t.eventShop.subtotal} · {totalItems}{' '}
                          {totalItems === 1 ? t.eventShop.ticket : t.eventShop.tickets}
                        </span>
                        <span className="text-[14px] tabular-nums text-white/80">
                          {Math.floor(subtotal / 100)}
                          <span className="text-[11px] font-mono text-white/40 ml-1.5 tracking-wider">CZK</span>
                        </span>
                      </div>
                      {appliedDiscount && discountAmount > 0 && (
                        <div className="py-4 flex items-center justify-between border-b border-white/10">
                          <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
                            {t.checkout.discount}
                            <span className="opacity-70 ml-1">· {appliedDiscount.code}</span>
                          </span>
                          <span className="text-[14px] tabular-nums text-primary">
                            −{Math.floor(discountAmount / 100)}
                            <span className="text-[11px] font-mono opacity-70 ml-1.5 tracking-wider">CZK</span>
                          </span>
                        </div>
                      )}
                      <div className="flex items-baseline justify-between pt-5">
                        <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50">
                          {t.eventShop.total}
                        </span>
                        <span
                          className="font-headline text-4xl sm:text-5xl leading-none tabular-nums text-primary"
                          style={{ fontWeight: 700 }}
                        >
                          {Math.floor(totalPrice / 100)}
                          <span className="text-sm font-mono text-white/40 ml-2 tracking-wider">CZK</span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleCheckout}
                      disabled={orderLoading}
                      className="group mt-6 w-full inline-flex items-center justify-between gap-6 px-6 py-5 bg-primary text-black font-mono text-[11px] tracking-[0.22em] uppercase font-semibold hover:bg-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary"
                    >
                      <span className="inline-flex items-center gap-3">
                        {orderLoading ? (
                          <span className="inline-block w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : null}
                        <span>{orderLoading ? t.eventShop.processing : t.eventShop.checkout}</span>
                      </span>
                      {!orderLoading && (
                        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                      )}
                    </button>

                    {orderError && (
                      <p className="mt-3 text-destructive text-[10px] font-mono tracking-[0.22em] uppercase">
                        {orderError.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── COMMUNITY / RESALE SECTION ──────────────────────── */}
              {(hasResale || resaleLoading) && (
                <div className="mt-20">
                  <div data-shop-reveal className="mb-6 flex items-end justify-between gap-6 flex-wrap">
                    <div>
                      <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-3">
                        § 04 / Community
                      </div>
                      <h2
                        className="font-headline text-2xl sm:text-3xl uppercase tracking-[-0.02em]"
                        style={{ fontWeight: 600 }}
                      >
                        Passed on by the floor.
                      </h2>
                    </div>
                    {!resaleLoading && hasResale && (
                      <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 tabular-nums">
                        {resaleListings.length} listing{resaleListings.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  {allOfficialSoldOut && hasResale && (
                    <div className="border-t border-b border-primary/30 py-4 px-5 mb-5 flex items-start gap-4">
                      <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
                      <div>
                        <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-1">
                          Official sold out
                        </div>
                        <p className="text-[12px] text-white/60 leading-[1.55]">
                          Community members are offering tickets below. Prices capped at 110% of original.
                        </p>
                      </div>
                    </div>
                  )}

                  {!allOfficialSoldOut && hasResale && (
                    <p className="text-white/40 text-[10px] font-mono tracking-[0.22em] uppercase mb-4">
                      Also available from community. Platform-capped pricing.
                    </p>
                  )}

                  {resaleLoading && (
                    <div className="py-8 flex justify-center">
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {!resaleLoading && hasResale && (
                    <div className="border-t border-white/10">
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
                    <div className="mt-4 border-t border-b border-destructive/40 py-4 px-5 flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" strokeWidth={1.5} />
                      <p className="text-[12px] text-white/70">{buyError}</p>
                    </div>
                  )}

                  {hasResale && (
                    <p className="text-white/30 text-[10px] font-mono tracking-[0.22em] uppercase mt-5">
                      Resale capped at max. 110% of original. Purchases are immediate.
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Admin pick modal */}
      {pickModalOpen && event && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6">
          <div className="bg-bg-dark border border-white/15 p-8 w-full max-w-md">
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-4">
              § Admin / RT Pick
            </div>
            <h3
              className="font-headline text-2xl uppercase tracking-[-0.02em] leading-tight mb-6"
              style={{ fontWeight: 600 }}
            >
              {event.name}
            </h3>

            <label className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 block mb-2">
              Reason
            </label>
            <textarea
              value={quickPickReason}
              onChange={(e) => setQuickPickReason(e.target.value)}
              rows={4}
              placeholder="Why this event deserves a pick..."
              className="w-full bg-transparent border border-white/15 focus:border-white/60 text-[13px] text-white px-3 py-2.5 focus:outline-none resize-none mb-6 transition-colors placeholder-white/25"
            />

            <div className="flex gap-3">
              <button
                onClick={handleMakePick}
                disabled={pickActionLoading || !quickPickReason.trim()}
                className="flex-1 bg-primary text-black text-[11px] font-mono tracking-[0.22em] uppercase font-semibold px-5 py-3 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pickActionLoading ? '...' : 'Confirm'}
              </button>
              <button
                onClick={() => setPickModalOpen(false)}
                className="px-5 py-3 border border-white/20 text-white/70 text-[11px] font-mono tracking-[0.22em] uppercase hover:border-white hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <NewFooter />
    </div>
  )
}
