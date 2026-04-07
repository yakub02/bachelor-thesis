import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  Ticket,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Tag,
  X,
  TrendingUp,
  Ban,
} from 'lucide-react'
import { ticketingApi } from '@/services'
import type { Ticket as TicketType, ApiError } from '@/types'
import { AnimatedBackground, GlowButton, GlowCard, NewNavbar, NewFooter } from '@/components/design'

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

const STATUS_CONFIG: Record<
  string,
  { strip: string; badge: string; label: string; Icon: typeof CheckCircle }
> = {
  valid: {
    strip: 'bg-green-500',
    badge: 'text-green-400 border-green-500/40 bg-green-500/10',
    label: 'Valid',
    Icon: CheckCircle,
  },
  used: {
    strip: 'bg-zinc-600',
    badge: 'text-zinc-400 border-zinc-600/40 bg-zinc-600/10',
    label: 'Used',
    Icon: CheckCircle,
  },
  invalidated: {
    strip: 'bg-red-600',
    badge: 'text-red-400 border-red-500/40 bg-red-500/10',
    label: 'Invalidated',
    Icon: XCircle,
  },
  listed: {
    strip: 'bg-primary',
    badge: 'text-primary border-primary/40 bg-primary/10',
    label: 'For Sale',
    Icon: TrendingUp,
  },
  transferred: {
    strip: 'bg-zinc-600',
    badge: 'text-zinc-400 border-zinc-600/40 bg-zinc-600/10',
    label: 'Transferred',
    Icon: XCircle,
  },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <GlowCard className="w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-primary text-xs font-mono uppercase tracking-widest block mb-1">
              [ Resale ]
            </span>
            <h2 className="text-xl font-bold uppercase tracking-tight">List for Resale</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border border-border-grey text-text-muted hover:text-white hover:border-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ticket summary */}
        <div className="border border-border-grey bg-bg-dark/60 p-4 mb-5">
          <p className="text-white font-bold text-sm uppercase truncate">
            {ticket.event_name ?? 'Event'}
          </p>
          <p className="text-text-muted text-xs font-mono mt-0.5">
            {ticket.ticket_type_name ?? 'General Admission'}
          </p>
          <div className="mt-3 pt-3 border-t border-border-grey flex items-center justify-between text-xs font-mono">
            <span className="text-text-muted">Original price</span>
            <span className="text-white">{formatPrice(originalCents, currency)}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono mt-1">
            <span className="text-text-muted">Max allowed ({maxPercent}%)</span>
            <span className="text-primary">{formatPrice(maxCents, currency)}</span>
          </div>
        </div>

        {/* Price input */}
        <label className="block text-xs font-mono uppercase text-text-muted mb-2">
          Your asking price
        </label>
        <div className="flex items-center gap-3 mb-3">
          <input
            type="number"
            min={1}
            max={Math.floor(maxCents / 100)}
            value={Math.floor(priceCents / 100)}
            onChange={handlePriceInput}
            className="w-28 px-3 py-2 bg-bg-dark border border-border-grey text-white font-mono text-sm focus:outline-none focus:border-primary transition-colors"
          />
          <span className="text-text-muted font-mono text-sm">{currency}</span>
          <span className="text-text-muted text-xs ml-auto">
            max {formatPrice(maxCents, currency)}
          </span>
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
        <div className="mt-4 flex items-start gap-2 p-3 border border-yellow-500/30 bg-yellow-500/5">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-400/80 text-xs leading-relaxed">
            Your QR code will be <strong className="text-yellow-400">immediately invalidated</strong> once
            listed. If you cancel the listing, a fresh QR code will be issued automatically.
          </p>
        </div>

        {error && (
          <p className="mt-3 text-red-400 text-xs font-mono">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-5">
          <GlowButton variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </GlowButton>
          <GlowButton onClick={handleSell} disabled={loading} className="flex-1">
            {loading ? 'Listing...' : `List for ${formatPrice(priceCents, currency)}`}
          </GlowButton>
        </div>
      </GlowCard>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <GlowCard className="w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold uppercase tracking-tight">Cancel Listing</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border border-border-grey text-text-muted hover:text-white hover:border-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-text-muted text-sm mb-4">
          Are you sure you want to cancel the resale listing for{' '}
          <span className="text-white font-bold">{ticket.event_name}</span>?
        </p>

        {listing && (
          <div className="border border-border-grey bg-bg-dark/60 p-3 mb-5 font-mono text-xs">
            <div className="flex justify-between text-text-muted mb-1">
              <span>Listed at</span>
              <span>{formatDate(listing.listed_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Asking price</span>
              <span className="text-primary">{formatPrice(listing.asking_price_cents, currency)}</span>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 border border-green-500/30 bg-green-500/5 mb-5">
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-400/80 text-xs">
            A fresh QR code will be issued to your ticket immediately upon cancellation.
          </p>
        </div>

        {error && <p className="mb-3 text-red-400 text-xs font-mono">{error}</p>}

        <div className="flex gap-3">
          <GlowButton variant="outline" onClick={onClose} className="flex-1">
            Keep Listing
          </GlowButton>
          <GlowButton onClick={handleCancel} disabled={loading} className="flex-1">
            {loading ? 'Cancelling...' : 'Cancel Listing'}
          </GlowButton>
        </div>
      </GlowCard>
    </div>
  )
}

// ============================================================================
// TICKET ROW
// ============================================================================

interface TicketRowProps {
  ticket: TicketType
  onSell: (ticket: TicketType) => void
  onCancelListing: (ticket: TicketType) => void
}

function TicketRow({ ticket, onSell, onCancelListing }: TicketRowProps) {
  const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.valid
  const { Icon } = cfg
  const currency = ticket.currency ?? 'CZK'

  return (
    <div className="ticket-row flex items-stretch border border-border-grey bg-surface/20 hover:bg-surface/40 hover:border-primary/20 transition-all duration-200 overflow-hidden group">
      {/* Status strip */}
      <div className={`w-1 flex-shrink-0 ${cfg.strip}`} />

      {/* Ticket icon column */}
      <div className="w-12 flex-shrink-0 flex items-center justify-center border-r border-dashed border-border-grey/50 bg-bg-dark/30">
        <Ticket className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors rotate-90" />
      </div>

      {/* Main info */}
      <div className="flex-1 flex items-center gap-4 px-5 py-3 min-w-0">
        {/* Event + type */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm uppercase tracking-tight text-white group-hover:text-primary transition-colors truncate leading-tight">
            {ticket.event_name ?? 'Unknown Event'}
          </h3>
          <p className="text-xs text-text-muted font-mono mt-0.5 truncate">
            {ticket.ticket_type_name ?? 'General Admission'}
          </p>
        </div>

        {/* Code */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-text-muted flex-shrink-0">
          <Icon className="w-3 h-3" />
          <span>{ticket.code ?? ticket.id.slice(-12)}</span>
        </div>

        {/* Date */}
        <div className="hidden md:block text-xs font-mono text-text-muted flex-shrink-0">
          {formatDate(ticket.issued_at)}
        </div>

        {/* Price / listing price */}
        <div className="text-sm font-mono font-bold flex-shrink-0 text-right">
          {ticket.status === 'listed' && ticket.resale_listing ? (
            <div>
              <span className="text-primary">
                {formatPrice(ticket.resale_listing.asking_price_cents, currency)}
              </span>
              <p className="text-xs text-text-muted font-normal">asking</p>
            </div>
          ) : ticket.price_cents ? (
            <span className="text-white">{formatPrice(ticket.price_cents, currency)}</span>
          ) : (
            <span className="text-text-muted">—</span>
          )}
        </div>
      </div>

      {/* Status badge + actions */}
      <div className="flex items-center gap-3 px-4 border-l border-dashed border-border-grey/50 flex-shrink-0">
        <span
          className={`hidden lg:inline-block px-2 py-0.5 text-xs font-mono uppercase border ${cfg.badge}`}
        >
          {cfg.label}
        </span>

        {/* View button - always shown */}
        <Link
          to={`/tickets/${ticket.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase border border-border-grey text-text-muted hover:border-primary hover:text-primary transition-colors"
        >
          <Eye className="w-3 h-3" />
          <span className="hidden sm:inline">View</span>
        </Link>

        {/* Sell button - valid tickets with resale enabled */}
        {ticket.status === 'valid' && ticket.resale_allowed && (
          <button
            onClick={() => onSell(ticket)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase border border-primary/50 text-primary hover:bg-primary hover:text-bg-dark transition-colors"
          >
            <Tag className="w-3 h-3" />
            <span className="hidden sm:inline">Sell</span>
          </button>
        )}

        {/* Cancel listing - listed tickets */}
        {ticket.status === 'listed' && (
          <button
            onClick={() => onCancelListing(ticket)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
          >
            <Ban className="w-3 h-3" />
            <span className="hidden sm:inline">Cancel</span>
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

  const [tickets, setTickets] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  // Modal state
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
      '.ticket-row',
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
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

  // Group tickets by status for display
  const validTickets = tickets.filter((t) => t.status === 'valid')
  const listedTickets = tickets.filter((t) => t.status === 'listed')
  const otherTickets = tickets.filter((t) => !['valid', 'listed'].includes(t.status))

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <AnimatedBackground />
      <NewNavbar />

      <main className="pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-text-muted text-sm font-mono hover:text-primary transition-colors group mb-6"
            >
              <span className="transform transition-transform group-hover:-translate-x-1">&larr;</span>
              Back to Home
            </Link>
            <span className="text-primary text-xs font-mono uppercase tracking-widest block mb-2">
              [ My Collection ]
            </span>
            <div className="flex items-end justify-between gap-4">
              <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight">My Tickets</h1>
              {tickets.length > 0 && (
                <p className="text-text-muted font-mono text-sm mb-1">
                  {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Success message after purchase */}
          {justPurchased && (
            <div className="flex items-center gap-3 p-4 mb-6 border border-green-500/40 bg-green-500/5">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="font-mono text-green-400 text-sm">
                Payment successful! Your tickets are ready.
              </span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-16">
              <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-text-muted mt-4 font-mono text-sm">Loading your tickets...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-5 border border-red-500/40 bg-red-500/5">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-400 text-sm">{error.error}</h3>
                <p className="text-text-muted text-xs mt-1">{error.message}</p>
              </div>
            </div>
          )}

          {/* Tickets list */}
          {!loading && !error && tickets.length > 0 && (
            <div className="space-y-8">
              {/* Active tickets */}
              {validTickets.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-mono uppercase text-text-muted tracking-widest">
                      Active
                    </span>
                    <div className="flex-1 h-px bg-border-grey" />
                    <span className="text-xs font-mono text-text-muted">{validTickets.length}</span>
                  </div>
                  <div className="space-y-1.5">
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

              {/* Listed for resale */}
              {listedTickets.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-mono uppercase text-text-muted tracking-widest">
                      For Sale
                    </span>
                    <div className="flex-1 h-px bg-border-grey" />
                    <span className="text-xs font-mono text-text-muted">{listedTickets.length}</span>
                  </div>
                  <div className="space-y-1.5">
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

              {/* Past / used / other */}
              {otherTickets.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-mono uppercase text-text-muted tracking-widest">
                      Past & Other
                    </span>
                    <div className="flex-1 h-px bg-border-grey" />
                    <span className="text-xs font-mono text-text-muted">{otherTickets.length}</span>
                  </div>
                  <div className="space-y-1.5">
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
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 border border-border-grey flex items-center justify-center mb-6">
                <Ticket className="w-7 h-7 text-text-muted" />
              </div>
              <h2 className="text-lg font-bold uppercase tracking-tight mb-2">No Tickets Yet</h2>
              <p className="text-text-muted text-sm mb-6 max-w-xs">
                You haven't purchased any tickets yet. Find an event and grab your spot.
              </p>
              <Link to="/">
                <GlowButton>Browse Events</GlowButton>
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
