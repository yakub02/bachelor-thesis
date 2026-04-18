import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  Ticket,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Tag,
  X,
  Ban,
  ArrowLeft,
} from 'lucide-react'
import { ticketingApi } from '@/services'
import type { Ticket as TicketType, ApiError } from '@/types'
import { NewNavbar, NewFooter } from '@/components/design'
import { useLang } from '@/context'
import { cn } from '@/utils'

// ============================================================================
// HELPERS
// ============================================================================

function formatError(err: unknown): ApiError {
  if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
    return {
      error: 'Network Error',
      message: 'Could not connect to the ticketing service. Make sure it is running.',
    }
  }
  return err as ApiError
}

function formatPrice(cents: number, currency = 'CZK'): string {
  return `${Math.floor(cents / 100)} ${currency}`
}

function formatDate(iso: string, locale = 'en-GB'): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

const STATUS_TONE: Record<string, { dot: string; label: string }> = {
  valid: { dot: 'bg-primary', label: 'Valid' },
  used: { dot: 'bg-white/30', label: 'Used' },
  invalidated: { dot: 'bg-destructive', label: 'Invalidated' },
  listed: { dot: 'bg-white', label: 'For Sale' },
  transferred: { dot: 'bg-white/30', label: 'Transferred' },
}

// ============================================================================
// SELL MODAL
// ============================================================================

interface SellModalProps {
  ticket: TicketType
  onClose: () => void
  onSuccess: () => void
}

function SellModal({ ticket, onClose, onSuccess }: SellModalProps) {
  const originalCents = ticket.price_cents ?? 0
  const maxPercent = ticket.resale_max_price_percent ?? 110
  const maxCents = Math.floor((originalCents * maxPercent) / 100)
  const currency = ticket.currency ?? 'CZK'

  const [priceCents, setPriceCents] = useState(originalCents)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePriceInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const crowns = parseInt(e.target.value) || 0
    setPriceCents(Math.min(crowns * 100, maxCents))
  }

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPriceCents(parseInt(e.target.value))
  }

  const handleSell = async () => {
    if (priceCents < 100) {
      setError('Minimum price is 1 CZK.')
      return
    }
    if (priceCents > maxCents) {
      setError(`Maximum allowed price is ${formatPrice(maxCents, currency)}.`)
      return
    }
    setLoading(true)
    setError(null)
    try {
      await ticketingApi.listTicketForResale(ticket.id, priceCents)
      onSuccess()
    } catch (err: unknown) {
      const apiErr = err as ApiError
      setError(apiErr.message || 'Failed to list ticket for resale.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85">
      <div className="w-full max-w-md bg-bg-dark border border-white/15 p-8">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-2">
              § Resale
            </div>
            <h2
              className="font-headline text-2xl uppercase tracking-[-0.02em] leading-tight"
              style={{ fontWeight: 600 }}
            >
              List for resale.
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center border border-white/15 text-white/60 hover:text-white hover:border-white transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Ticket summary — hairline block */}
        <div className="border-t border-b border-white/10 py-4 mb-6">
          <p className="text-[13px] text-white truncate">{ticket.event_name ?? 'Event'}</p>
          <p className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mt-1">
            {ticket.ticket_type_name ?? 'General Admission'}
          </p>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[12px] tabular-nums">
            <span className="text-white/50">Original</span>
            <span className="text-white">{formatPrice(originalCents, currency)}</span>
          </div>
          <div className="flex items-center justify-between text-[12px] tabular-nums mt-1.5">
            <span className="text-white/50">Cap ({maxPercent}%)</span>
            <span className="text-primary">{formatPrice(maxCents, currency)}</span>
          </div>
        </div>

        {/* Price input */}
        <label className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 block mb-2">
          Your asking price
        </label>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-baseline gap-2 border-b border-white/15 focus-within:border-white/60 transition-colors flex-1">
            <input
              type="number"
              min={1}
              max={Math.floor(maxCents / 100)}
              value={Math.floor(priceCents / 100)}
              onChange={handlePriceInput}
              className="flex-1 bg-transparent font-headline text-3xl tabular-nums text-white py-2 focus:outline-none"
              style={{ fontWeight: 600 }}
            />
            <span className="text-[11px] font-mono tracking-[0.22em] uppercase text-white/40">
              {currency}
            </span>
          </div>
        </div>

        <input
          type="range"
          min={100}
          max={maxCents}
          step={100}
          value={priceCents}
          onChange={handleSlider}
          className="w-full h-1 accent-primary cursor-pointer"
        />

        {/* Warning */}
        <div className="mt-5 border-t border-b border-white/10 py-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-[12px] text-white/65 leading-[1.55]">
            Your QR will be <span className="text-white">invalidated immediately</span> once listed.
            Cancelling the listing re-issues a fresh QR.
          </p>
        </div>

        {error && (
          <p className="mt-3 text-destructive text-[10px] font-mono tracking-[0.22em] uppercase">
            {error}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-5 py-3 border border-white/20 text-white/70 text-[11px] font-mono tracking-[0.22em] uppercase hover:border-white hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSell}
            disabled={loading}
            className="flex-1 px-5 py-3 bg-primary text-black text-[11px] font-mono tracking-[0.22em] uppercase font-semibold hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? '...' : `List · ${formatPrice(priceCents, currency)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// CANCEL LISTING MODAL
// ============================================================================

interface CancelListingModalProps {
  ticket: TicketType
  onClose: () => void
  onSuccess: () => void
}

function CancelListingModal({ ticket, onClose, onSuccess }: CancelListingModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCancel = async () => {
    if (!ticket.resale_listing) return
    setLoading(true)
    setError(null)
    try {
      await ticketingApi.cancelResaleListing(ticket.resale_listing.id)
      onSuccess()
    } catch (err: unknown) {
      const apiErr = err as ApiError
      setError(apiErr.message || 'Failed to cancel listing.')
    } finally {
      setLoading(false)
    }
  }

  const listing = ticket.resale_listing
  const currency = ticket.currency ?? 'CZK'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85">
      <div className="w-full max-w-sm bg-bg-dark border border-white/15 p-8">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-destructive mb-2">
              § Cancel
            </div>
            <h2
              className="font-headline text-2xl uppercase tracking-[-0.02em] leading-tight"
              style={{ fontWeight: 600 }}
            >
              Pull listing?
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center border border-white/15 text-white/60 hover:text-white hover:border-white transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-[13px] text-white/65 leading-[1.6] mb-5">
          Pulling the resale listing for{' '}
          <span className="text-white">{ticket.event_name}</span>.
        </p>

        {listing && (
          <div className="border-t border-b border-white/10 py-4 mb-5 text-[12px] tabular-nums">
            <div className="flex justify-between mb-1.5">
              <span className="text-white/50">Listed</span>
              <span className="text-white/80">{formatDate(listing.listed_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Asking</span>
              <span className="text-primary">
                {formatPrice(listing.asking_price_cents, currency)}
              </span>
            </div>
          </div>
        )}

        <div className="border-t border-b border-white/10 py-4 mb-5 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
          <p className="text-[12px] text-white/65 leading-[1.55]">
            A fresh QR is issued the moment you cancel.
          </p>
        </div>

        {error && (
          <p className="mb-3 text-destructive text-[10px] font-mono tracking-[0.22em] uppercase">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-white/20 text-white/70 text-[11px] font-mono tracking-[0.22em] uppercase hover:border-white hover:text-white transition-colors"
          >
            Keep
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-primary text-black text-[11px] font-mono tracking-[0.22em] uppercase font-semibold hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? '...' : 'Pull listing'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TICKET ROW — editorial list style
// ============================================================================

interface TicketRowProps {
  ticket: TicketType
  onSell: (ticket: TicketType) => void
  onCancelListing: (ticket: TicketType) => void
}

function TicketRow({ ticket, onSell, onCancelListing }: TicketRowProps) {
  const tone = STATUS_TONE[ticket.status] ?? STATUS_TONE.valid
  const currency = ticket.currency ?? 'CZK'
  const { t, lang } = useLang()
  const locale = lang === 'cs' ? 'cs-CZ' : 'en-GB'
  const statusLabels: Record<string, string> = {
    valid: t.myTickets.valid,
    used: t.myTickets.used,
    invalidated: t.myTickets.invalidated,
    listed: t.myTickets.forSale,
    transferred: t.myTickets.transferred,
  }
  const statusLabel = statusLabels[ticket.status] ?? tone.label
  const isDimmed = ticket.status === 'used' || ticket.status === 'invalidated' || ticket.status === 'transferred'

  return (
    <div
      className={cn(
        'ticket-row group grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 sm:gap-6 py-5 border-b border-white/10 transition-colors',
        isDimmed && 'opacity-55'
      )}
    >
      {/* Status dot */}
      <div className="flex items-center gap-2">
        <span className={cn('w-1.5 h-1.5', tone.dot)} />
        <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 hidden lg:inline">
          {statusLabel}
        </span>
      </div>

      {/* Event + type */}
      <div className="min-w-0">
        <h3
          className="font-headline text-lg sm:text-xl uppercase tracking-[-0.01em] leading-tight truncate group-hover:text-primary transition-colors"
          style={{ fontWeight: 600 }}
        >
          {ticket.event_name ?? 'Unknown Event'}
        </h3>
        <p className="text-[11px] font-mono tracking-[0.18em] uppercase text-white/40 mt-1 truncate">
          {ticket.ticket_type_name ?? 'General Admission'}
          <span className="hidden md:inline"> · {formatDate(ticket.issued_at, locale)}</span>
        </p>
      </div>

      {/* Code */}
      <div className="hidden sm:block text-[10px] font-mono tracking-[0.18em] uppercase text-white/35 tabular-nums">
        {(ticket.code ?? ticket.id).slice(-8)}
      </div>

      {/* Price */}
      <div className="text-right tabular-nums shrink-0">
        {ticket.status === 'listed' && ticket.resale_listing ? (
          <>
            <div
              className="font-headline text-lg text-primary"
              style={{ fontWeight: 600 }}
            >
              {Math.floor(ticket.resale_listing.asking_price_cents / 100)}
              <span className="text-[11px] font-mono text-white/40 ml-1 tracking-wider">
                {currency}
              </span>
            </div>
            <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/40 mt-0.5">
              Asking
            </p>
          </>
        ) : ticket.price_cents ? (
          <div
            className="font-headline text-lg text-white"
            style={{ fontWeight: 600 }}
          >
            {Math.floor(ticket.price_cents / 100)}
            <span className="text-[11px] font-mono text-white/40 ml-1 tracking-wider">
              {currency}
            </span>
          </div>
        ) : (
          <span className="text-white/30">—</span>
        )}
      </div>

      {/* Actions */}
      <div className="col-span-3 sm:col-span-1 flex items-center gap-2 justify-end">
        <Link
          to={`/tickets/${ticket.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-[0.22em] uppercase border border-white/15 text-white/70 hover:border-white hover:text-white transition-colors"
        >
          <Eye className="w-3 h-3" strokeWidth={1.75} />
          <span className="hidden sm:inline">View</span>
        </Link>

        {ticket.status === 'valid' && ticket.resale_allowed && (
          <button
            onClick={() => onSell(ticket)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-[0.22em] uppercase border border-primary/50 text-primary hover:bg-primary hover:text-black transition-colors"
          >
            <Tag className="w-3 h-3" strokeWidth={1.75} />
            <span className="hidden sm:inline">Sell</span>
          </button>
        )}

        {ticket.status === 'listed' && (
          <button
            onClick={() => onCancelListing(ticket)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-[0.22em] uppercase border border-destructive/40 text-destructive hover:bg-destructive hover:text-white transition-colors"
          >
            <Ban className="w-3 h-3" strokeWidth={1.75} />
            <span className="hidden sm:inline">Pull</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function MyTickets() {
  const location = useLocation()
  const justPurchased = (location.state as { justPurchased?: boolean })?.justPurchased
  const { t } = useLang()

  const [tickets, setTickets] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const [sellTicket, setSellTicket] = useState<TicketType | null>(null)
  const [cancelTicket, setCancelTicket] = useState<TicketType | null>(null)

  const fetchTickets = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ticketingApi.getMyTickets()
      setTickets(data.tickets)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  useGSAP(() => {
    if (loading) return
    gsap.fromTo(
      '[data-tix-reveal]',
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.05, ease: 'power3.out' }
    )
    gsap.fromTo(
      '.ticket-row',
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.04, ease: 'power2.out', delay: 0.15 }
    )
  }, [loading])

  const handleSellSuccess = () => {
    setSellTicket(null)
    fetchTickets()
  }

  const handleCancelSuccess = () => {
    setCancelTicket(null)
    fetchTickets()
  }

  const validTickets = tickets.filter((t) => t.status === 'valid')
  const listedTickets = tickets.filter((t) => t.status === 'listed')
  const otherTickets = tickets.filter((t) => !['valid', 'listed'].includes(t.status))

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <NewNavbar />

      <main className="pt-24 pb-20">
        {/* Issue strip */}
        <div className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-9 flex items-center gap-5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 tabular-nums">
            <span className="text-primary text-xs leading-none">◆</span>
            <span className="text-white font-medium">My Collection</span>
            <span className="opacity-40">/</span>
            <span>Ledger</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="w-1 h-1 bg-primary" />
              <span>{tickets.length} held</span>
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 pt-12">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors mb-10"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Home</span>
          </Link>

          {/* Header */}
          <div data-tix-reveal className="mb-14">
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-4">
              § 01 / Ledger
            </div>
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <h1
                className="font-headline uppercase leading-[0.92] tracking-[-0.03em]"
                style={{ fontSize: 'clamp(2.25rem,6vw,5rem)', fontWeight: 700 }}
              >
                {t.myTickets.title}
              </h1>
              {tickets.length > 0 && (
                <div className="text-right">
                  <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-1">
                    Count
                  </div>
                  <div
                    className="font-headline text-3xl tabular-nums"
                    style={{ fontWeight: 600 }}
                  >
                    {tickets.length}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Purchase success banner */}
          {justPurchased && (
            <div
              data-tix-reveal
              className="border-t border-b border-primary/40 py-4 px-5 mb-10 flex items-center gap-4"
            >
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" strokeWidth={1.75} />
              <div>
                <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-1">
                  Payment confirmed
                </div>
                <p className="text-[13px] text-white/70">Your tickets are ready.</p>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3 py-16 text-white/50 border-t border-white/10">
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-mono tracking-[0.22em] uppercase">
                Loading ledger…
              </span>
            </div>
          )}

          {/* Error */}
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

          {/* Tickets list */}
          {!loading && !error && tickets.length > 0 && (
            <div className="space-y-14">
              {validTickets.length > 0 && (
                <section data-tix-reveal>
                  <div className="flex items-baseline justify-between mb-4 border-t border-white/10 pt-4">
                    <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
                      § {t.myTickets.valid}
                    </span>
                    <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 tabular-nums">
                      {String(validTickets.length).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="border-t border-white/10">
                    {validTickets.map((ticket) => (
                      <TicketRow
                        key={ticket.id}
                        ticket={ticket}
                        onSell={setSellTicket}
                        onCancelListing={setCancelTicket}
                      />
                    ))}
                  </div>
                </section>
              )}

              {listedTickets.length > 0 && (
                <section data-tix-reveal>
                  <div className="flex items-baseline justify-between mb-4 border-t border-white/10 pt-4">
                    <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
                      § {t.myTickets.forSale}
                    </span>
                    <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 tabular-nums">
                      {String(listedTickets.length).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="border-t border-white/10">
                    {listedTickets.map((ticket) => (
                      <TicketRow
                        key={ticket.id}
                        ticket={ticket}
                        onSell={setSellTicket}
                        onCancelListing={setCancelTicket}
                      />
                    ))}
                  </div>
                </section>
              )}

              {otherTickets.length > 0 && (
                <section data-tix-reveal>
                  <div className="flex items-baseline justify-between mb-4 border-t border-white/10 pt-4">
                    <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40">
                      § Archive
                    </span>
                    <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 tabular-nums">
                      {String(otherTickets.length).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="border-t border-white/10">
                    {otherTickets.map((ticket) => (
                      <TicketRow
                        key={ticket.id}
                        ticket={ticket}
                        onSell={setSellTicket}
                        onCancelListing={setCancelTicket}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && tickets.length === 0 && (
            <div data-tix-reveal className="border-t border-b border-white/10 py-24 text-center">
              <Ticket
                className="w-8 h-8 text-white/30 mx-auto mb-6"
                strokeWidth={1.25}
              />
              <h2
                className="font-headline text-4xl sm:text-5xl uppercase tracking-[-0.02em] mb-4"
                style={{ fontWeight: 700 }}
              >
                {t.myTickets.empty}
              </h2>
              <p className="text-white/55 text-[14px] leading-[1.65] max-w-sm mx-auto mb-8">
                {t.myTickets.emptyHint}
              </p>
              <Link
                to="/events"
                className="inline-flex items-center gap-3 px-5 py-3 bg-primary text-black text-[11px] font-mono tracking-[0.2em] uppercase font-semibold hover:bg-white transition-colors duration-200"
              >
                <span>{t.myTickets.browseEvents}</span>
                <span>→</span>
              </Link>
            </div>
          )}
        </div>
      </main>

      <NewFooter />

      {/* Modals */}
      {sellTicket && (
        <SellModal
          ticket={sellTicket}
          onClose={() => setSellTicket(null)}
          onSuccess={handleSellSuccess}
        />
      )}
      {cancelTicket && (
        <CancelListingModal
          ticket={cancelTicket}
          onClose={() => setCancelTicket(null)}
          onSuccess={handleCancelSuccess}
        />
      )}
    </div>
  )
}
