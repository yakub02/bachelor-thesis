import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { StatCard, TicketTypeManager, RecentOrders, DiscountCodeManager } from '@/components/organizer'
import { ticketingApi } from '@/services'
import { ravetureApi, type Event } from '@/services/ravetureApi'
import type { EventStats, DiscountCode, ApiError } from '@/types'
import { AnimatedBackground, GlowButton, GlowCard, NewNavbar, NewFooter } from '@/components/design'
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

  // Fetch organizer's events
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
      } catch (err) {
        console.error('Failed to fetch events:', err)
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
      '.dashboard-content',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    )
  }, [loading, activeTab])

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toLocaleString('cs-CZ')} CZK`
  }

  const tabs: Array<{ id: TabType; label: string; emoji: string }> = [
    { id: 'overview', label: 'Overview', emoji: '📊' },
    { id: 'tickets', label: 'Ticket Types', emoji: '🎫' },
    { id: 'discounts', label: 'Discount Codes', emoji: '🏷️' },
    { id: 'buyers', label: 'Buyers', emoji: '👥' },
  ]

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-bg-dark text-white flex items-center justify-center">
        <AnimatedBackground />
        <GlowCard className="p-8 text-center max-w-md relative z-10">
          <span className="text-4xl mb-4 block">🔒</span>
          <h1 className="text-xl font-bold mb-2">Login Required</h1>
          <p className="text-text-muted mb-6">You need to be logged in to access the dashboard.</p>
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
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
            <div>
              <Link
                to="/my-events"
                className="inline-flex items-center gap-2 text-text-muted text-sm font-mono hover:text-primary transition-colors group mb-4"
              >
                <span className="transform transition-transform group-hover:-translate-x-1">&larr;</span>
                Back to My Events
              </Link>

              <span className="text-primary text-xs font-mono uppercase tracking-widest block mb-2">
                [ Dashboard ]
              </span>
              <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight">
                Organizer Dashboard
              </h1>
            </div>

            {/* Event selector */}
            {events.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-text-muted text-sm font-mono">Event:</span>
                <select
                  value={selectedEventId || ''}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="px-4 py-2 bg-graphite border border-border-grey text-white font-mono focus:outline-none focus:border-primary min-w-[200px]"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* No events */}
          {!eventsLoading && events.length === 0 && (
            <GlowCard className="p-12 text-center">
              <span className="text-5xl mb-4 block">📅</span>
              <h2 className="text-xl font-bold mb-2">No Events Yet</h2>
              <p className="text-text-muted mb-6">
                Create your first event to see the dashboard.
              </p>
              <Link to="/create-event">
                <GlowButton>Create Event</GlowButton>
              </Link>
            </GlowCard>
          )}

          {selectedEventId && (
            <>
              {/* Tabs */}
              <div className="flex flex-wrap items-center gap-2 mb-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 font-mono text-sm transition-all',
                      activeTab === tab.id
                        ? 'bg-primary text-black'
                        : 'bg-graphite border border-border-grey text-text-muted hover:border-primary hover:text-white'
                    )}
                  >
                    <span>{tab.emoji}</span>
                    {tab.label}
                  </button>
                ))}

                {/* Live monitor link */}
                <Link
                  to={`/organizer/live/${selectedEventId}`}
                  className="ml-auto flex items-center gap-2 px-4 py-2 font-mono text-sm border border-green-500/40 text-green-400 hover:border-green-400 hover:bg-green-400/10 transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Live Monitor
                </Link>
              </div>

              {/* Loading state */}
              {loading && (
                <div className="text-center py-16">
                  <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-text-muted mt-4 font-mono">Loading dashboard...</p>
                </div>
              )}

              {/* Error state */}
              {error && (
                <GlowCard className="p-6 border-red-500/50">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h3 className="font-bold text-red-400">{error.error}</h3>
                      <p className="text-text-muted text-sm mt-1">{error.message}</p>
                    </div>
                  </div>
                </GlowCard>
              )}

              {/* Overview Tab */}
              {!loading && !error && stats && activeTab === 'overview' && (
                <div className="dashboard-content space-y-8">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      title="Total Revenue"
                      value={formatPrice(stats.summary.total_revenue_cents)}
                      subtitle={`${formatPrice(stats.summary.total_discounts_cents)} in discounts`}
                      icon="payments"
                      variant="success"
                    />
                    <StatCard
                      title="Tickets Sold"
                      value={stats.summary.total_sold}
                      subtitle={`of ${stats.summary.total_capacity} total`}
                      icon="confirmation_number"
                    />
                    <StatCard
                      title="Check-ins"
                      value={stats.summary.total_checkins}
                      subtitle={`${stats.summary.checkin_rate}% entry rate`}
                      icon="qr_code_scanner"
                    />
                    <StatCard
                      title="Confirmed Orders"
                      value={stats.orders.confirmed}
                      subtitle={`${stats.orders.pending} pending`}
                      icon="receipt_long"
                    />
                  </div>

                  {/* Charts / More stats */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sales breakdown */}
                    <GlowCard className="p-6">
                      <h3 className="text-sm font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
                        <span className="text-primary">◆</span>
                        Sales by Ticket Type
                      </h3>

                      <div className="space-y-4">
                        {stats.by_ticket_type.map((tt) => {
                          const percent = stats.summary.total_sold > 0
                            ? Math.round((tt.quantity_sold / stats.summary.total_sold) * 100)
                            : 0

                          return (
                            <div key={tt.id}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-mono">{tt.name}</span>
                                <span className="text-text-muted">{tt.quantity_sold} sold</span>
                              </div>
                              <div className="h-2 bg-bg-dark overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </GlowCard>

                    {/* Order status */}
                    <GlowCard className="p-6">
                      <h3 className="text-sm font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
                        <span className="text-primary">◆</span>
                        Order Status
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'Confirmed', value: stats.orders.confirmed, color: 'text-green-400' },
                          { label: 'Pending', value: stats.orders.pending, color: 'text-yellow-400' },
                          { label: 'Cancelled', value: stats.orders.cancelled, color: 'text-red-400' },
                          { label: 'Expired', value: stats.orders.expired, color: 'text-text-muted' },
                        ].map((item) => (
                          <div key={item.label} className="text-center p-4 bg-bg-dark border border-border-grey">
                            <div className={`text-2xl font-mono font-bold ${item.color}`}>
                              {item.value}
                            </div>
                            <div className="text-text-muted text-xs font-mono uppercase mt-1">
                              {item.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlowCard>
                  </div>

                  {/* Recent orders */}
                  <RecentOrders orders={stats.recent_orders} />
                </div>
              )}

              {/* Tickets Tab */}
              {!loading && !error && stats && activeTab === 'tickets' && (
                <div className="dashboard-content">
                  <TicketTypeManager
                    ticketTypes={stats.by_ticket_type}
                    eventId={selectedEventId}
                    onUpdate={fetchData}
                  />
                </div>
              )}

              {/* Discounts Tab */}
              {!loading && !error && activeTab === 'discounts' && (
                <div className="dashboard-content">
                  <DiscountCodeManager
                    codes={discountCodes}
                    eventId={selectedEventId}
                    onUpdate={fetchData}
                  />
                </div>
              )}

              {/* Buyers Tab */}
              {!loading && !error && activeTab === 'buyers' && (
                <div className="dashboard-content">
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

// Buyers list component
function BuyersList({ eventId }: { eventId: string }) {
  const [buyers, setBuyers] = useState<Array<{
    user_id: string
    tickets_count: number
    order_count: number
    total_spent_cents: number
  }>>([])
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
        // Handle error
      } finally {
        setLoading(false)
      }
    }

    fetchBuyers()
  }, [eventId, page])

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-muted mt-4 font-mono">Loading buyers...</p>
      </div>
    )
  }

  return (
    <GlowCard className="p-6">
      <h3 className="text-sm font-bold uppercase tracking-tight mb-6 flex items-center gap-2">
        <span className="text-primary">◆</span>
        Buyers
      </h3>

      {buyers.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <span className="text-4xl block mb-2">👥</span>
          <p className="font-mono">No buyers yet</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-text-muted font-mono uppercase border-b border-border-grey">
                  <th className="pb-3">User ID</th>
                  <th className="pb-3">Tickets</th>
                  <th className="pb-3">Orders</th>
                  <th className="pb-3">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey">
                {buyers.map((buyer) => (
                  <tr key={buyer.user_id} className="text-sm">
                    <td className="py-3 font-mono">{buyer.user_id.slice(0, 8)}...</td>
                    <td className="py-3">{buyer.tickets_count}</td>
                    <td className="py-3">{buyer.order_count}</td>
                    <td className="py-3 font-mono text-primary">
                      {(buyer.total_spent_cents / 100).toLocaleString('cs-CZ')} CZK
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <GlowButton
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </GlowButton>
              <span className="text-text-muted text-sm font-mono">
                Page {page} of {totalPages}
              </span>
              <GlowButton
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </GlowButton>
            </div>
          )}
        </>
      )}
    </GlowCard>
  )
}
