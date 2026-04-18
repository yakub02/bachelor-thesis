import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  BarChart3,
  Ticket,
  Tag,
  Users,
  Radio,
  ArrowLeft,
  AlertTriangle,
  Calendar,
} from 'lucide-react'
import { TicketTypeManager, RecentOrders, DiscountCodeManager } from '@/components/organizer'
import { ticketingApi } from '@/services'
import { ravetureApi, type Event } from '@/services/ravetureApi'
import type { EventStats, DiscountCode, ApiError } from '@/types'
import { NewNavbar, NewFooter } from '@/components/design'
import { cn } from '@/utils'
import { useAuth } from '@/context'

function formatError(err: unknown): ApiError {
  if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
    return {
      error: 'Network Error',
      message: 'Could not connect to the ticketing service. Make sure it is running.',
    }
  }
  return err as ApiError
}

type TabType = 'overview' | 'tickets' | 'discounts' | 'buyers'

// ============================================================================
// EDITORIAL STAT BLOCK
// ============================================================================

interface StatBlockProps {
  label: string
  value: React.ReactNode
  caption?: string
  accent?: boolean
}

function StatBlock({ label, value, caption, accent }: StatBlockProps) {
  return (
    <div className="border-t border-white/10 pt-5 pb-2 flex flex-col">
      <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 mb-3">
        {label}
      </div>
      <div
        className={cn(
          'font-headline text-4xl sm:text-5xl leading-[0.95] tabular-nums',
          accent ? 'text-primary' : 'text-white'
        )}
        style={{ fontWeight: 700 }}
      >
        {value}
      </div>
      {caption && (
        <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/40 mt-3">
          {caption}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function OrganizerDashboard() {
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()

  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(searchParams.get('event'))
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [stats, setStats] = useState<EventStats | null>(null)
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setEventsLoading(false)
      return
    }

    const fetchEvents = async () => {
      try {
        const data = await ravetureApi.getMyEvents()
        setEvents(data.events)
        if (!selectedEventId && data.events.length > 0) {
          setSelectedEventId(data.events[0].id)
        }
      } catch {
        // events fail silently; dashboard renders empty state
      } finally {
        setEventsLoading(false)
      }
    }
    fetchEvents()
  }, [isAuthenticated, selectedEventId])

  const fetchData = async () => {
    if (!selectedEventId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [statsData, codesData] = await Promise.all([
        ticketingApi.getEventStats(selectedEventId),
        ticketingApi.listDiscountCodes({ event_id: selectedEventId }),
      ])

      setStats(statsData)
      setDiscountCodes(codesData.discount_codes)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedEventId) {
      fetchData()
    }
  }, [selectedEventId])

  useGSAP(() => {
    if (loading) return

    gsap.fromTo(
      '[data-dash-reveal]',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out' }
    )
  }, [loading, activeTab])

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toLocaleString('en-GB')}`
  }

  const tabs: Array<{ id: TabType; label: string; Icon: typeof BarChart3 }> = [
    { id: 'overview', label: 'Overview', Icon: BarChart3 },
    { id: 'tickets', label: 'Ticket Types', Icon: Ticket },
    { id: 'discounts', label: 'Discount Codes', Icon: Tag },
    { id: 'buyers', label: 'Buyers', Icon: Users },
  ]

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-bg-dark text-white flex flex-col">
        <NewNavbar />
        <main className="flex-1 flex items-center justify-center px-6 py-24">
          <div className="max-w-md w-full text-center">
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-4">
              § 401 / Restricted
            </div>
            <h2
              className="font-headline text-3xl sm:text-4xl uppercase tracking-[-0.02em] mb-4"
              style={{ fontWeight: 700 }}
            >
              Organizers only.
            </h2>
            <p className="text-white/55 text-[14px] leading-[1.6] mb-8">
              Sign in to reach your dashboard.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-3 px-5 py-3 bg-primary text-black text-[11px] font-mono tracking-[0.2em] uppercase font-semibold hover:bg-white transition-colors duration-200"
            >
              <span>Login</span>
              <span>→</span>
            </Link>
          </div>
        </main>
        <NewFooter />
      </div>
    )
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <NewNavbar />

      <main className="pt-24 pb-20">
        {/* Issue strip */}
        <div className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-9 flex items-center gap-5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 tabular-nums">
            <span className="text-primary text-xs leading-none">◆</span>
            <span className="text-white font-medium">Dashboard</span>
            <span className="opacity-40">/</span>
            <span>Organizer</span>
            {selectedEvent && (
              <>
                <span className="opacity-40 hidden sm:inline">/</span>
                <span className="hidden sm:inline truncate max-w-xs">{selectedEvent.name}</span>
              </>
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="w-1 h-1 bg-primary" />
              <span>{events.length} events</span>
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 pt-12">
          <Link
            to="/my-events"
            className="group inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors mb-10"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to My Events</span>
          </Link>

          {/* Header */}
          <div data-dash-reveal className="mb-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-4">
                § 01 / Control
              </div>
              <h1
                className="font-headline uppercase leading-[0.92] tracking-[-0.03em]"
                style={{ fontSize: 'clamp(2.25rem,6vw,5rem)', fontWeight: 700 }}
              >
                Organizer Dashboard
              </h1>
            </div>

            {events.length > 0 && (
              <div className="flex flex-col gap-2 min-w-[260px]">
                <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50">
                  Active event
                </span>
                <div className="border-b border-white/15 focus-within:border-white/60 transition-colors">
                  <select
                    value={selectedEventId || ''}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full appearance-none bg-transparent text-[15px] text-white py-2 pr-8 focus:outline-none cursor-pointer"
                  >
                    {events.map((event) => (
                      <option key={event.id} value={event.id} className="bg-bg-dark">
                        {event.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* No events */}
          {!eventsLoading && events.length === 0 && (
            <div data-dash-reveal className="border-t border-b border-white/10 py-24 text-center">
              <Calendar className="w-8 h-8 text-white/30 mx-auto mb-6" strokeWidth={1.25} />
              <h2
                className="font-headline text-4xl sm:text-5xl uppercase tracking-[-0.02em] mb-4"
                style={{ fontWeight: 700 }}
              >
                No events filed.
              </h2>
              <p className="text-white/55 text-[14px] leading-[1.65] max-w-sm mx-auto mb-8">
                File your first night to populate the board.
              </p>
              <Link
                to="/create-event"
                className="inline-flex items-center gap-3 px-5 py-3 bg-primary text-black text-[11px] font-mono tracking-[0.2em] uppercase font-semibold hover:bg-white transition-colors duration-200"
              >
                <span>Create Event</span>
                <span>→</span>
              </Link>
            </div>
          )}

          {selectedEventId && (
            <>
              {/* Tabs — hairline row */}
              <div
                data-dash-reveal
                className="mb-10 border-t border-b border-white/10 flex flex-wrap items-center gap-y-0"
              >
                {tabs.map((tab, idx) => {
                  const active = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'group flex items-center gap-2.5 px-5 py-4 text-[10px] font-mono tracking-[0.22em] uppercase transition-colors relative',
                        idx > 0 && 'border-l border-white/10',
                        active
                          ? 'bg-white text-black'
                          : 'text-white/55 hover:text-white'
                      )}
                    >
                      <tab.Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}

                <Link
                  to={`/organizer/live/${selectedEventId}`}
                  className="ml-auto border-l border-white/10 flex items-center gap-2.5 px-5 py-4 text-[10px] font-mono tracking-[0.22em] uppercase text-primary hover:bg-primary hover:text-black transition-colors"
                >
                  <Radio className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Live Monitor</span>
                  <span className="w-1.5 h-1.5 bg-primary animate-pulse group-hover:bg-black" />
                </Link>
              </div>

              {/* Loading */}
              {loading && (
                <div className="flex items-center gap-3 py-16 text-white/50 border-t border-white/10">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-mono tracking-[0.22em] uppercase">
                    Loading dashboard…
                  </span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="border-t border-b border-destructive/40 py-5 px-5 flex items-start gap-4">
                  <AlertTriangle
                    className="w-5 h-5 text-destructive shrink-0 mt-0.5"
                    strokeWidth={1.5}
                  />
                  <div>
                    <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-destructive mb-1.5">
                      {error.error}
                    </div>
                    <p className="text-[13px] text-white/70 leading-[1.55]">{error.message}</p>
                  </div>
                </div>
              )}

              {/* Overview */}
              {!loading && !error && stats && activeTab === 'overview' && (
                <div className="space-y-16">
                  {/* Stats grid — hairline editorial blocks */}
                  <section data-dash-reveal>
                    <div className="flex items-baseline justify-between mb-5">
                      <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
                        § 02 / At a glance
                      </span>
                      <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40">
                        Summary
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
                      <StatBlock
                        label="Revenue"
                        value={
                          <>
                            {formatPrice(stats.summary.total_revenue_cents)}
                            <span className="text-sm font-mono text-white/40 ml-2 tracking-wider">
                              CZK
                            </span>
                          </>
                        }
                        caption={`${formatPrice(stats.summary.total_discounts_cents)} in discounts`}
                        accent
                      />
                      <StatBlock
                        label="Tickets Sold"
                        value={stats.summary.total_sold}
                        caption={`of ${stats.summary.total_capacity} total`}
                      />
                      <StatBlock
                        label="Check-ins"
                        value={stats.summary.total_checkins}
                        caption={`${stats.summary.checkin_rate}% entry rate`}
                      />
                      <StatBlock
                        label="Confirmed"
                        value={stats.orders.confirmed}
                        caption={`${stats.orders.pending} pending`}
                      />
                    </div>
                  </section>

                  {/* Sales + Order status */}
                  <section
                    data-dash-reveal
                    className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16"
                  >
                    {/* Sales by ticket type */}
                    <div className="lg:col-span-7">
                      <div className="flex items-baseline justify-between mb-5">
                        <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
                          § 03 / Sales
                        </span>
                        <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40">
                          By type
                        </span>
                      </div>
                      <h3
                        className="font-headline text-2xl uppercase tracking-[-0.02em] mb-6"
                        style={{ fontWeight: 600 }}
                      >
                        Where the floor bought.
                      </h3>
                      <div className="border-t border-white/10">
                        {stats.by_ticket_type.length === 0 && (
                          <p className="text-[12px] font-mono tracking-[0.2em] uppercase text-white/40 py-6">
                            No ticket types
                          </p>
                        )}
                        {stats.by_ticket_type.map((tt) => {
                          const percent =
                            stats.summary.total_sold > 0
                              ? Math.round((tt.quantity_sold / stats.summary.total_sold) * 100)
                              : 0

                          return (
                            <div
                              key={tt.id}
                              className="border-b border-white/10 py-4"
                            >
                              <div className="flex items-baseline justify-between mb-2">
                                <span className="text-[14px] text-white truncate">{tt.name}</span>
                                <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 tabular-nums shrink-0 ml-4">
                                  {tt.quantity_sold} sold · {percent}%
                                </span>
                              </div>
                              <div className="h-[2px] bg-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all duration-500"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Order status */}
                    <div className="lg:col-span-5">
                      <div className="flex items-baseline justify-between mb-5">
                        <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
                          § 04 / Orders
                        </span>
                        <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40">
                          Status
                        </span>
                      </div>
                      <h3
                        className="font-headline text-2xl uppercase tracking-[-0.02em] mb-6"
                        style={{ fontWeight: 600 }}
                      >
                        Cleared the door.
                      </h3>
                      <div className="border-t border-white/10">
                        {[
                          {
                            label: 'Confirmed',
                            value: stats.orders.confirmed,
                            tone: 'text-primary',
                          },
                          { label: 'Pending', value: stats.orders.pending, tone: 'text-white' },
                          {
                            label: 'Cancelled',
                            value: stats.orders.cancelled,
                            tone: 'text-white/60',
                          },
                          { label: 'Expired', value: stats.orders.expired, tone: 'text-white/40' },
                        ].map((row) => (
                          <div
                            key={row.label}
                            className="flex items-baseline justify-between py-4 border-b border-white/10"
                          >
                            <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50">
                              {row.label}
                            </span>
                            <span
                              className={cn(
                                'font-headline text-2xl tabular-nums',
                                row.tone
                              )}
                              style={{ fontWeight: 600 }}
                            >
                              {String(row.value).padStart(2, '0')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Recent orders (shared component) */}
                  <section data-dash-reveal>
                    <div className="flex items-baseline justify-between mb-5">
                      <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
                        § 05 / Traffic
                      </span>
                      <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40">
                        Recent
                      </span>
                    </div>
                    <RecentOrders orders={stats.recent_orders} />
                  </section>
                </div>
              )}

              {/* Tickets Tab */}
              {!loading && !error && stats && activeTab === 'tickets' && (
                <div data-dash-reveal>
                  <TicketTypeManager
                    ticketTypes={stats.by_ticket_type}
                    eventId={selectedEventId}
                    onUpdate={fetchData}
                  />
                </div>
              )}

              {/* Discounts Tab */}
              {!loading && !error && activeTab === 'discounts' && (
                <div data-dash-reveal>
                  <DiscountCodeManager
                    codes={discountCodes}
                    eventId={selectedEventId}
                    onUpdate={fetchData}
                  />
                </div>
              )}

              {/* Buyers Tab */}
              {!loading && !error && activeTab === 'buyers' && (
                <div data-dash-reveal>
                  <BuyersList eventId={selectedEventId} />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <NewFooter />
    </div>
  )
}

// ============================================================================
// BUYERS LIST
// ============================================================================

function BuyersList({ eventId }: { eventId: string }) {
  const [buyers, setBuyers] = useState<
    Array<{
      user_id: string
      tickets_count: number
      order_count: number
      total_spent_cents: number
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const fetchBuyers = async () => {
      setLoading(true)
      try {
        const data = await ticketingApi.getEventBuyers(eventId, { page, per_page: 20 })
        setBuyers(data.buyers)
        setTotalPages(data.pages)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }

    fetchBuyers()
  }, [eventId, page])

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-16 text-white/50 border-t border-white/10">
        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] font-mono tracking-[0.22em] uppercase">
          Loading buyers…
        </span>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
          § / Ledger
        </span>
        <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 tabular-nums">
          {buyers.length} entries
        </span>
      </div>

      {buyers.length === 0 ? (
        <div className="border-t border-b border-white/10 py-24 text-center">
          <Users className="w-8 h-8 text-white/30 mx-auto mb-6" strokeWidth={1.25} />
          <h3
            className="font-headline text-3xl uppercase tracking-[-0.02em] mb-3"
            style={{ fontWeight: 600 }}
          >
            No buyers yet.
          </h3>
          <p className="text-white/40 text-[12px] font-mono tracking-[0.22em] uppercase">
            The floor hasn't spoken.
          </p>
        </div>
      ) : (
        <>
          <div className="border-t border-white/10">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-6 py-3 border-b border-white/10 text-[10px] font-mono tracking-[0.22em] uppercase text-white/40">
              <span>User</span>
              <span className="text-right">Tickets</span>
              <span className="text-right">Orders</span>
              <span className="text-right">Spend</span>
            </div>
            {buyers.map((buyer) => (
              <div
                key={buyer.user_id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-6 py-4 border-b border-white/10 items-baseline"
              >
                <span className="text-[13px] font-mono tracking-[0.05em] text-white truncate">
                  {buyer.user_id.slice(0, 12)}…
                </span>
                <span className="text-[14px] tabular-nums text-white text-right">
                  {buyer.tickets_count}
                </span>
                <span className="text-[14px] tabular-nums text-white/70 text-right">
                  {buyer.order_count}
                </span>
                <span
                  className="font-headline text-lg tabular-nums text-primary text-right"
                  style={{ fontWeight: 600 }}
                >
                  {(buyer.total_spent_cents / 100).toLocaleString('en-GB')}
                  <span className="text-[11px] font-mono text-white/40 ml-1.5 tracking-wider">
                    CZK
                  </span>
                </span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-[10px] font-mono tracking-[0.22em] uppercase border border-white/15 text-white/70 hover:border-white hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 tabular-nums">
                {String(page).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-[10px] font-mono tracking-[0.22em] uppercase border border-white/15 text-white/70 hover:border-white hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
