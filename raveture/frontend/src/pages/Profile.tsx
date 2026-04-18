import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  Mail,
  Shield,
  Settings,
  Ticket,
  Calendar,
  BarChart3,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '@/context'
import { ravetureApi, ticketingApi } from '@/services'
import type { UserPreferences } from '@/services/ravetureApi'
import type { Ticket as TicketType, ApiError } from '@/types'
import { NewNavbar, NewFooter } from '@/components/design'

function formatError(err: unknown): ApiError {
  if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
    return {
      error: 'Network Error',
      message: 'Could not connect to the service.',
    }
  }
  return err as ApiError
}

export function Profile() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const [prefsData, ticketsData] = await Promise.all([
          ravetureApi.getMyPreferences().catch(() => null),
          ticketingApi.getMyTickets().catch(() => ({ tickets: [] })),
        ])

        setPreferences(prefsData)
        setTickets(ticketsData.tickets)
      } catch (err) {
        setError(formatError(err))
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchData()
    }
  }, [isAuthenticated, authLoading])

  useGSAP(() => {
    if (loading || authLoading) return

    gsap.fromTo(
      '[data-profile-reveal]',
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power3.out',
      }
    )
  }, [loading, authLoading])

  // Auth loading state
  if (authLoading) {
    return (
      <div className="relative min-h-screen bg-bg-dark text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/50">
          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-mono tracking-[0.22em] uppercase">Loading…</span>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
        <NewNavbar />
        <main className="pt-24 pb-20">
          <div className="border-b border-white/10">
            <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-9 flex items-center gap-5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 tabular-nums">
              <span className="text-primary text-xs leading-none">◆</span>
              <span className="text-white font-medium">Profile</span>
              <span className="opacity-40">/</span>
              <span>Restricted</span>
            </div>
          </div>

          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 pt-24">
            <div className="max-w-xl">
              <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-4">
                § Access required
              </div>
              <h1
                className="font-headline uppercase leading-[0.92] tracking-[-0.03em] mb-6"
                style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700 }}
              >
                Authentication required.
              </h1>
              <p className="text-white/55 text-[13px] leading-[1.6] mb-8 border-t border-white/10 pt-6">
                You need to be logged in to view your profile.
              </p>
              <Link
                to="/login"
                className="group inline-flex items-center justify-between gap-4 px-5 py-4 bg-primary text-black font-mono text-[11px] tracking-[0.22em] uppercase font-semibold hover:bg-white transition-colors duration-200"
              >
                <span>Log In</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </div>
        </main>
        <NewFooter />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <NewNavbar />

      <main className="pt-24 pb-20">
        {/* Issue strip */}
        <div className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-9 flex items-center gap-5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 tabular-nums">
            <span className="text-primary text-xs leading-none">◆</span>
            <span className="text-white font-medium">Profile</span>
            <span className="opacity-40">/</span>
            <span>Dashboard</span>
            {user && (
              <div className="ml-auto flex items-center gap-2">
                <span className="w-1 h-1 bg-primary" />
                <span>@{user.username}</span>
              </div>
            )}
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
          <div data-profile-reveal className="mb-14">
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-4">
              § 01 / Profile
            </div>
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <h1
                className="font-headline uppercase leading-[0.92] tracking-[-0.03em]"
                style={{ fontSize: 'clamp(2.25rem,6vw,5rem)', fontWeight: 700 }}
              >
                Personal Dashboard
              </h1>
              {tickets.length > 0 && (
                <div className="text-right">
                  <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-1">
                    Tickets
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

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3 py-16 text-white/50 border-t border-white/10">
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-mono tracking-[0.22em] uppercase">
                Loading profile…
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="border-t border-b border-destructive/40 py-5 px-5 flex items-start gap-4 mb-10">
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

          {/* Profile content */}
          {!loading && user && (
            <div className="space-y-14">
              {/* Identity */}
              <section data-profile-reveal>
                <div className="flex items-baseline justify-between mb-4 border-t border-white/10 pt-4">
                  <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
                    § Identity
                  </span>
                  <Link
                    to="/settings"
                    className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 hover:text-white transition-colors"
                  >
                    <Settings className="w-3 h-3" strokeWidth={1.75} />
                    <span>Edit</span>
                  </Link>
                </div>

                <div className="border-t border-white/10 py-6 flex items-start gap-6 flex-wrap sm:flex-nowrap">
                  {/* Avatar */}
                  <div className="shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name || user.username}
                        className="w-20 h-20 object-cover border border-white/15"
                      />
                    ) : (
                      <div className="w-20 h-20 border border-white/15 bg-white/5 flex items-center justify-center">
                        <span
                          className="font-headline text-3xl uppercase"
                          style={{ fontWeight: 600 }}
                        >
                          {(user.display_name || user.username).charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-1">
                      Handle
                    </div>
                    <h2
                      className="font-headline text-2xl uppercase tracking-[-0.02em] leading-tight mb-1 truncate"
                      style={{ fontWeight: 600 }}
                    >
                      {user.display_name || user.username}
                    </h2>
                    <p className="text-[12px] font-mono text-white/50 mb-4">
                      @{user.username}
                    </p>

                    {user.bio && (
                      <p className="text-[13px] text-white/70 leading-[1.6] mb-4 border-t border-white/10 pt-4">
                        {user.bio}
                      </p>
                    )}

                    <div className="border-t border-white/10 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-1.5">
                          Email
                        </div>
                        <div className="flex items-center gap-2 text-[13px] text-white/80 min-w-0">
                          <Mail className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.75} />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-1.5">
                          Status
                        </div>
                        <div className="flex items-center gap-2 text-[13px]">
                          {user.is_verified ? (
                            <>
                              <CheckCircle2
                                className="w-3.5 h-3.5 text-primary shrink-0"
                                strokeWidth={1.75}
                              />
                              <span className="text-primary">Verified</span>
                            </>
                          ) : (
                            <>
                              <XCircle
                                className="w-3.5 h-3.5 text-white/40 shrink-0"
                                strokeWidth={1.75}
                              />
                              <span className="text-white/50">Unverified</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-1.5">
                          Role
                        </div>
                        <div className="flex items-center gap-2 text-[13px] text-white/80">
                          <Shield className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.75} />
                          <span className="capitalize">{user.role}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Preferences */}
              {preferences && (
                <section data-profile-reveal>
                  <div className="flex items-baseline justify-between mb-4 border-t border-white/10 pt-4">
                    <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
                      § Preferences
                    </span>
                  </div>

                  <div className="border-t border-white/10 py-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Genres */}
                    {preferences.preferred_genres && preferences.preferred_genres.length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-3">
                          Favorite Genres
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {preferences.preferred_genres.map((genre) => (
                            <span
                              key={genre}
                              className="px-3 py-1.5 text-[10px] font-mono tracking-[0.22em] uppercase border border-white/15 text-white/70"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cities */}
                    {preferences.preferred_cities && preferences.preferred_cities.length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-3">
                          Preferred Cities
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {preferences.preferred_cities.map((city) => (
                            <span
                              key={city}
                              className="px-3 py-1.5 text-[10px] font-mono tracking-[0.22em] uppercase border border-white/15 text-white/70"
                            >
                              {city}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notifications */}
                    <div>
                      <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-3">
                        Notifications
                      </div>
                      <div className="space-y-2 text-[13px]">
                        <div className="flex items-center gap-2">
                          {preferences.email_notifications ? (
                            <CheckCircle2
                              className="w-3.5 h-3.5 text-primary shrink-0"
                              strokeWidth={1.75}
                            />
                          ) : (
                            <XCircle
                              className="w-3.5 h-3.5 text-white/40 shrink-0"
                              strokeWidth={1.75}
                            />
                          )}
                          <span
                            className={
                              preferences.email_notifications ? 'text-white/80' : 'text-white/40'
                            }
                          >
                            Email notifications
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {preferences.event_reminders ? (
                            <CheckCircle2
                              className="w-3.5 h-3.5 text-primary shrink-0"
                              strokeWidth={1.75}
                            />
                          ) : (
                            <XCircle
                              className="w-3.5 h-3.5 text-white/40 shrink-0"
                              strokeWidth={1.75}
                            />
                          )}
                          <span
                            className={
                              preferences.event_reminders ? 'text-white/80' : 'text-white/40'
                            }
                          >
                            Event reminders
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Theme */}
                    <div>
                      <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-3">
                        Appearance
                      </div>
                      <div className="flex items-center gap-2 text-[13px] text-white/80">
                        <Settings className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.75} />
                        <span>{preferences.dark_mode ? 'Dark Mode' : 'Light Mode'}</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Tickets */}
              <section data-profile-reveal>
                <div className="flex items-baseline justify-between mb-4 border-t border-white/10 pt-4">
                  <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
                    § My Tickets
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 tabular-nums">
                      {String(tickets.length).padStart(2, '0')}
                    </span>
                    {tickets.length > 0 && (
                      <Link
                        to="/my-tickets"
                        className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 hover:text-white transition-colors"
                      >
                        View all →
                      </Link>
                    )}
                  </div>
                </div>

                {tickets.length > 0 ? (
                  <div className="border-t border-white/10">
                    {tickets.slice(0, 3).map((ticket) => (
                      <Link
                        key={ticket.id}
                        to={`/tickets/${ticket.id}`}
                        className="group grid grid-cols-12 gap-4 items-center py-5 border-b border-white/10 hover:bg-white/[0.02] px-2 -mx-2 transition-colors"
                      >
                        <div className="col-span-12 sm:col-span-1 flex items-center">
                          <Ticket
                            className="w-5 h-5 text-primary"
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className="col-span-8 sm:col-span-7 min-w-0">
                          <div className="text-[13px] text-white truncate group-hover:text-primary transition-colors">
                            {ticket.event_name || ticket.ticket_type_name || 'Event Ticket'}
                          </div>
                          {ticket.event_name && (
                            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mt-1 truncate">
                              {ticket.ticket_type_name || 'General Admission'}
                            </div>
                          )}
                        </div>
                        <div className="col-span-3 sm:col-span-3">
                          <span
                            className={
                              'inline-flex items-center gap-1.5 text-[10px] font-mono tracking-[0.22em] uppercase ' +
                              (ticket.status === 'valid'
                                ? 'text-primary'
                                : 'text-white/40')
                            }
                          >
                            <span
                              className={
                                'w-1 h-1 ' +
                                (ticket.status === 'valid' ? 'bg-primary' : 'bg-white/40')
                              }
                            />
                            {ticket.status}
                          </span>
                        </div>
                        <div className="col-span-1 sm:col-span-1 flex justify-end">
                          <ArrowUpRight
                            className="w-4 h-4 text-white/30 group-hover:text-white transition-colors"
                            strokeWidth={1.5}
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="border-t border-b border-white/10 py-16 text-center">
                    <Ticket
                      className="w-10 h-10 text-white/20 mx-auto mb-4"
                      strokeWidth={1.25}
                    />
                    <p className="text-[13px] text-white/55 mb-6">No tickets purchased yet.</p>
                    <Link
                      to="/events"
                      className="group inline-flex items-center gap-3 px-5 py-3 bg-primary text-black font-mono text-[11px] tracking-[0.22em] uppercase font-semibold hover:bg-white transition-colors"
                    >
                      <span>Browse Events</span>
                      <span className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </Link>
                  </div>
                )}
              </section>

              {/* Quick actions */}
              <section data-profile-reveal>
                <div className="flex items-baseline justify-between mb-4 border-t border-white/10 pt-4">
                  <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
                    § Shortcuts
                  </span>
                </div>

                <div className="border-t border-white/10 grid grid-cols-1 md:grid-cols-3">
                  <Link
                    to="/my-tickets"
                    className="group flex items-center justify-between gap-4 py-6 md:px-6 border-b md:border-b-0 md:border-r border-white/10 hover:bg-white/[0.02] transition-colors"
                  >
                    <div>
                      <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-2">
                        Ledger
                      </div>
                      <div className="font-headline text-xl uppercase tracking-[-0.01em] group-hover:text-primary transition-colors" style={{ fontWeight: 600 }}>
                        My Tickets
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-white/40 group-hover:text-white transition-colors">
                      <Ticket className="w-5 h-5" strokeWidth={1.5} />
                      <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                  </Link>

                  {user.role === 'organizer' ? (
                    <>
                      <Link
                        to="/my-events"
                        className="group flex items-center justify-between gap-4 py-6 md:px-6 border-b md:border-b-0 md:border-r border-white/10 hover:bg-white/[0.02] transition-colors"
                      >
                        <div>
                          <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-2">
                            Catalogue
                          </div>
                          <div className="font-headline text-xl uppercase tracking-[-0.01em] group-hover:text-primary transition-colors" style={{ fontWeight: 600 }}>
                            My Events
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-white/40 group-hover:text-white transition-colors">
                          <Calendar className="w-5 h-5" strokeWidth={1.5} />
                          <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
                        </div>
                      </Link>
                      <Link
                        to="/organizer"
                        className="group flex items-center justify-between gap-4 py-6 md:px-6 hover:bg-white/[0.02] transition-colors"
                      >
                        <div>
                          <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-2">
                            Panel
                          </div>
                          <div className="font-headline text-xl uppercase tracking-[-0.01em] group-hover:text-primary transition-colors" style={{ fontWeight: 600 }}>
                            Dashboard
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-white/40 group-hover:text-white transition-colors">
                          <BarChart3 className="w-5 h-5" strokeWidth={1.5} />
                          <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
                        </div>
                      </Link>
                    </>
                  ) : (
                    <Link
                      to="/events"
                      className="group flex items-center justify-between gap-4 py-6 md:px-6 md:col-span-2 hover:bg-white/[0.02] transition-colors"
                    >
                      <div>
                        <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-2">
                          Discover
                        </div>
                        <div className="font-headline text-xl uppercase tracking-[-0.01em] group-hover:text-primary transition-colors" style={{ fontWeight: 600 }}>
                          Browse Events
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-white/40 group-hover:text-white transition-colors">
                        <Search className="w-5 h-5" strokeWidth={1.5} />
                        <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
                      </div>
                    </Link>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      <NewFooter />
    </div>
  )
}
