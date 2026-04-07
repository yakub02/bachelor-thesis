import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { User, Mail, Shield, Settings, Ticket, Calendar, BarChart3, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context'
import { ravetureApi, ticketingApi } from '@/services'
import type { UserPreferences } from '@/services/ravetureApi'
import type { Ticket as TicketType, ApiError } from '@/types'
import { AnimatedBackground, GlowButton, GlowCard, NewNavbar, NewFooter } from '@/components/design'

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
        // Fetch user preferences and tickets in parallel
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
      '.profile-section',
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.15,
        ease: 'power3.out',
      }
    )
  }, [loading, authLoading])

  // Show loading state during auth initialization
  if (authLoading) {
    return (
      <div className="relative min-h-screen bg-bg-dark text-white flex items-center justify-center">
        <AnimatedBackground />
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-text-muted font-mono">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-bg-dark text-white">
        <AnimatedBackground />
        <NewNavbar />
        <main className="pt-24 pb-16">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <GlowCard className="p-12">
              <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
              <p className="text-text-muted mb-6">
                You need to be logged in to view your profile.
              </p>
              <Link to="/login">
                <GlowButton>Log In</GlowButton>
              </Link>
            </GlowCard>
          </div>
        </main>
        <NewFooter />
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
          <div className="mb-8 profile-section">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-text-muted text-sm font-mono hover:text-primary transition-colors group mb-6"
            >
              <span className="transform transition-transform group-hover:-translate-x-1">&larr;</span>
              Back to Home
            </Link>

            <span className="text-primary text-xs font-mono uppercase tracking-widest block mb-2">
              [ My Profile ]
            </span>
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight">
              Personal Dashboard
            </h1>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-text-muted mt-4 font-mono">Loading your profile...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <GlowCard className="p-6 border-red-500/50 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-red-400">{error.error}</h3>
                  <p className="text-text-muted text-sm mt-1">{error.message}</p>
                </div>
              </div>
            </GlowCard>
          )}

          {/* Profile Content */}
          {!loading && user && (
            <>
              {/* User Information */}
              <GlowCard className="p-6 mb-6 profile-section">
                <div className="flex items-start gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name || user.username}
                        className="w-24 h-24 rounded-full object-cover border-2 border-primary/50"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border-2 border-primary/50">
                        <span className="text-3xl font-bold uppercase">
                          {(user.display_name || user.username).charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* User Details */}
                  <div className="flex-grow">
                    <h2 className="text-2xl font-bold mb-1">
                      {user.display_name || user.username}
                    </h2>
                    <p className="text-text-muted text-sm mb-3">@{user.username}</p>

                    {user.bio && (
                      <p className="text-text-secondary mb-4">{user.bio}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        <span>{user.email}</span>
                      </div>
                      {user.is_verified && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">Verified</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="capitalize">{user.role}</span>
                      </div>
                    </div>
                  </div>

                  {/* Edit Button */}
                  <div>
                    <Link to="/settings">
                      <button className="px-4 py-2 text-sm font-mono uppercase border border-primary/50 hover:bg-primary/10 transition-colors flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Edit Profile
                      </button>
                    </Link>
                  </div>
                </div>
              </GlowCard>

              {/* Preferences */}
              {preferences && (
                <GlowCard className="p-6 mb-6 profile-section">
                  <h3 className="text-lg font-bold uppercase mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Preferences
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Genres */}
                    {preferences.preferred_genres && preferences.preferred_genres.length > 0 && (
                      <div>
                        <h4 className="text-sm font-mono text-text-muted uppercase mb-2">
                          Favorite Genres
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {preferences.preferred_genres.map((genre) => (
                            <span
                              key={genre}
                              className="px-3 py-1 text-xs font-mono uppercase bg-primary/10 border border-primary/30 text-primary"
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
                        <h4 className="text-sm font-mono text-text-muted uppercase mb-2">
                          Preferred Cities
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {preferences.preferred_cities.map((city) => (
                            <span
                              key={city}
                              className="px-3 py-1 text-xs font-mono uppercase bg-primary/10 border border-primary/30 text-primary"
                            >
                              {city}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notifications */}
                    <div>
                      <h4 className="text-sm font-mono text-text-muted uppercase mb-2">
                        Notifications
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          {preferences.email_notifications ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-text-muted" />
                          )}
                          <span>Email notifications</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {preferences.event_reminders ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-text-muted" />
                          )}
                          <span>Event reminders</span>
                        </div>
                      </div>
                    </div>

                    {/* Theme */}
                    <div>
                      <h4 className="text-sm font-mono text-text-muted uppercase mb-2">
                        Appearance
                      </h4>
                      <div className="flex items-center gap-2 text-sm">
                        <Settings className="w-4 h-4 text-primary" />
                        <span>{preferences.dark_mode ? 'Dark Mode' : 'Light Mode'}</span>
                      </div>
                    </div>
                  </div>
                </GlowCard>
              )}

              {/* Tickets Section */}
              <div className="profile-section">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold uppercase flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-primary" />
                    My Tickets ({tickets.length})
                  </h3>
                  <Link to="/my-tickets">
                    <button className="text-sm font-mono text-primary hover:underline">
                      View All →
                    </button>
                  </Link>
                </div>

                {tickets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {tickets.slice(0, 3).map((ticket) => (
                      <Link key={ticket.id} to={`/tickets/${ticket.id}`}>
                        <GlowCard className="p-4 group hover:border-primary/70 transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <Ticket className="w-8 h-8 text-primary" />
                            <span
                              className={`px-2 py-1 text-xs font-mono uppercase border ${
                                ticket.status === 'valid'
                                  ? 'text-green-400 border-green-500/50 bg-green-500/10'
                                  : 'text-text-muted border-border-grey bg-graphite/50'
                              }`}
                            >
                              {ticket.status}
                            </span>
                          </div>

                          {ticket.event_name ? (
                            <>
                              <div className="flex items-start gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors line-clamp-2">
                                  {ticket.event_name}
                                </h4>
                              </div>
                              <p className="text-xs text-text-muted uppercase font-mono">
                                {ticket.ticket_type_name || 'General Admission'}
                              </p>
                            </>
                          ) : (
                            <h4 className="font-bold text-sm uppercase group-hover:text-primary transition-colors">
                              {ticket.ticket_type_name || 'Event Ticket'}
                            </h4>
                          )}
                        </GlowCard>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <GlowCard className="p-8 text-center">
                    <Ticket className="w-16 h-16 text-text-muted mx-auto mb-3" />
                    <p className="text-text-muted">No tickets purchased yet.</p>
                    <Link to="/events" className="inline-block mt-4">
                      <GlowButton>Browse Events</GlowButton>
                    </Link>
                  </GlowCard>
                )}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 profile-section">
                <Link to="/my-tickets">
                  <GlowCard className="p-6 text-center hover:border-primary/70 transition-all group">
                    <Ticket className="w-12 h-12 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold uppercase text-sm group-hover:text-primary transition-colors">
                      My Tickets
                    </h4>
                  </GlowCard>
                </Link>

                {user.role === 'organizer' && (
                  <>
                    <Link to="/my-events">
                      <GlowCard className="p-6 text-center hover:border-primary/70 transition-all group">
                        <Calendar className="w-12 h-12 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <h4 className="font-bold uppercase text-sm group-hover:text-primary transition-colors">
                          My Events
                        </h4>
                      </GlowCard>
                    </Link>

                    <Link to="/organizer">
                      <GlowCard className="p-6 text-center hover:border-primary/70 transition-all group">
                        <BarChart3 className="w-12 h-12 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <h4 className="font-bold uppercase text-sm group-hover:text-primary transition-colors">
                          Dashboard
                        </h4>
                      </GlowCard>
                    </Link>
                  </>
                )}

                {user.role !== 'organizer' && (
                  <Link to="/events">
                    <GlowCard className="p-6 text-center hover:border-primary/70 transition-all group">
                      <Search className="w-12 h-12 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <h4 className="font-bold uppercase text-sm group-hover:text-primary transition-colors">
                        Browse Events
                      </h4>
                    </GlowCard>
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <NewFooter />
    </div>
  )
}
