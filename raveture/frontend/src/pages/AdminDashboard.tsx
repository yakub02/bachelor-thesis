import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  Users,
  Shield,
  Star,
  TrendingUp,
  Search,
  Ban,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/context'
import { ravetureApi } from '@/services'
import type { UserProfile as UserProfileType } from '@/services/ravetureApi'
import { AnimatedBackground, GlowButton, GlowCard, GlowInput, NewNavbar, NewFooter } from '@/components/design'

interface SystemStats {
  users: {
    total: number
    active: number
    by_role: Record<string, number>
  }
  events: {
    total: number
    published: number
    draft: number
    featured: number
  }
}

export function AdminDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'users' | 'picks' | 'stats'>('stats')
  const [users, setUsers] = useState<UserProfileType[]>([])
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user is admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'admin')) {
      navigate('/')
    }
  }, [authLoading, isAuthenticated, user, navigate])

  // Fetch data
  useEffect(() => {
    if (user?.role !== 'admin') return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        if (activeTab === 'users') {
          const response = await ravetureApi.getAllUsers({
            search: search || undefined,
            role: roleFilter || undefined
          })
          setUsers(response.users)
        } else if (activeTab === 'stats') {
          const statsData = await ravetureApi.getSystemStats()
          setStats(statsData)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeTab, search, roleFilter, user])

  useGSAP(() => {
    if (loading) return

    gsap.fromTo(
      '.admin-card',
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.1,
        ease: 'power2.out'
      }
    )
  }, [loading, activeTab])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await ravetureApi.updateUserRole(userId, newRole)
      // Refresh users
      const response = await ravetureApi.getAllUsers({ search: search || undefined })
      setUsers(response.users)
    } catch (err: any) {
      alert(err.message || 'Failed to update role')
    }
  }

  const handleBanUser = async (userId: string) => {
    if (!confirm('Are you sure you want to ban this user?')) return

    try {
      await ravetureApi.banUser(userId)
      // Refresh users
      const response = await ravetureApi.getAllUsers({ search: search || undefined })
      setUsers(response.users)
    } catch (err: any) {
      alert(err.message || 'Failed to ban user')
    }
  }

  const handleUnbanUser = async (userId: string) => {
    try {
      await ravetureApi.unbanUser(userId)
      // Refresh users
      const response = await ravetureApi.getAllUsers({ search: search || undefined })
      setUsers(response.users)
    } catch (err: any) {
      alert(err.message || 'Failed to unban user')
    }
  }

  if (authLoading || user?.role !== 'admin') {
    return null
  }

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <AnimatedBackground />
      <NewNavbar />

      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-primary text-xs font-mono uppercase tracking-widest mb-2">
              <Shield className="w-4 h-4" />
              <span>[ Admin Panel ]</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight">
              RAVETURE Admin
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 font-mono uppercase text-sm border transition-all ${
                activeTab === 'stats'
                  ? 'bg-primary text-black border-primary'
                  : 'bg-transparent text-white border-border-grey hover:border-primary'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-mono uppercase text-sm border transition-all ${
                activeTab === 'users'
                  ? 'bg-primary text-black border-primary'
                  : 'bg-transparent text-white border-border-grey hover:border-primary'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Users
            </button>
            <button
              onClick={() => setActiveTab('picks')}
              className={`px-6 py-3 font-mono uppercase text-sm border transition-all ${
                activeTab === 'picks'
                  ? 'bg-primary text-black border-primary'
                  : 'bg-transparent text-white border-border-grey hover:border-primary'
              }`}
            >
              <Star className="w-4 h-4 inline mr-2" />
              RAVETURE Picks
            </button>
          </div>

          {/* Content */}
          {loading && (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-text-muted mt-4 font-mono">Loading...</p>
            </div>
          )}

          {error && (
            <GlowCard className="p-6 border-red-500/50 mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-400" />
                <p className="text-red-400">{error}</p>
              </div>
            </GlowCard>
          )}

          {!loading && activeTab === 'stats' && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Users */}
              <GlowCard className="p-6 admin-card">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-primary" />
                  <span className="text-3xl font-bold">{stats.users.total}</span>
                </div>
                <h3 className="text-text-muted text-sm font-mono uppercase">Total Users</h3>
                <p className="text-xs text-text-secondary mt-2">
                  {stats.users.active} active
                </p>
              </GlowCard>

              {/* Total Events */}
              <GlowCard className="p-6 admin-card">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <span className="text-3xl font-bold">{stats.events.total}</span>
                </div>
                <h3 className="text-text-muted text-sm font-mono uppercase">Total Events</h3>
                <p className="text-xs text-text-secondary mt-2">
                  {stats.events.published} published
                </p>
              </GlowCard>

              {/* Featured Events */}
              <GlowCard className="p-6 admin-card">
                <div className="flex items-center justify-between mb-4">
                  <Star className="w-8 h-8 text-primary" />
                  <span className="text-3xl font-bold">{stats.events.featured}</span>
                </div>
                <h3 className="text-text-muted text-sm font-mono uppercase">RAVETURE Picks</h3>
              </GlowCard>

              {/* Admins */}
              <GlowCard className="p-6 admin-card">
                <div className="flex items-center justify-between mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                  <span className="text-3xl font-bold">{stats.users.by_role.admin || 0}</span>
                </div>
                <h3 className="text-text-muted text-sm font-mono uppercase">Admins</h3>
                <p className="text-xs text-text-secondary mt-2">
                  {stats.users.by_role.moderator || 0} moderators
                </p>
              </GlowCard>

              {/* Role Breakdown */}
              <GlowCard className="p-6 admin-card md:col-span-2">
                <h3 className="text-sm font-mono uppercase mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Users by Role
                </h3>
                <div className="space-y-2">
                  {Object.entries(stats.users.by_role).map(([role, count]) => (
                    <div key={role} className="flex justify-between items-center">
                      <span className="text-text-muted capitalize">{role}</span>
                      <span className="font-mono text-primary">{count}</span>
                    </div>
                  ))}
                </div>
              </GlowCard>
            </div>
          )}

          {!loading && activeTab === 'users' && (
            <div>
              {/* Search & Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <GlowInput
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-dark border border-border-grey text-white font-mono focus:outline-none focus:border-primary"
                >
                  <option value="">All Roles</option>
                  <option value="user">User</option>
                  <option value="artist">Artist</option>
                  <option value="organizer">Organizer</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Users Table */}
              <GlowCard className="p-6 admin-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-grey">
                      <th className="text-left py-3 px-2 font-mono uppercase text-xs text-text-muted">User</th>
                      <th className="text-left py-3 px-2 font-mono uppercase text-xs text-text-muted">Email</th>
                      <th className="text-left py-3 px-2 font-mono uppercase text-xs text-text-muted">Role</th>
                      <th className="text-left py-3 px-2 font-mono uppercase text-xs text-text-muted">Status</th>
                      <th className="text-left py-3 px-2 font-mono uppercase text-xs text-text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border-grey/50 hover:bg-primary/5">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.username} className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-xs">{u.username.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{u.display_name || u.username}</p>
                              <p className="text-xs text-text-muted">@{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-text-muted">{u.email}</td>
                        <td className="py-3 px-2">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="px-2 py-1 bg-graphite border border-border-grey text-white text-xs font-mono"
                          >
                            <option value="user">User</option>
                            <option value="artist">Artist</option>
                            <option value="organizer">Organizer</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-3 px-2">
                          {u.is_active ? (
                            <span className="flex items-center gap-1 text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-xs">Active</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-400">
                              <XCircle className="w-4 h-4" />
                              <span className="text-xs">Banned</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {u.is_active ? (
                            <button
                              onClick={() => handleBanUser(u.id)}
                              className="flex items-center gap-1 px-3 py-1 text-xs border border-red-500/50 text-red-400 hover:bg-red-500/10"
                            >
                              <Ban className="w-3 h-3" />
                              Ban
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnbanUser(u.id)}
                              className="flex items-center gap-1 px-3 py-1 text-xs border border-green-500/50 text-green-400 hover:bg-green-500/10"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Unban
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlowCard>
            </div>
          )}

          {!loading && activeTab === 'picks' && (
            <div>
              <GlowCard className="p-8 text-center admin-card">
                <Star className="w-16 h-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">RAVETURE Picks Management</h3>
                <p className="text-text-muted mb-6">
                  Feature events as curated RAVETURE Picks from event pages
                </p>
                <Link to="/events">
                  <GlowButton>Browse Events</GlowButton>
                </Link>
              </GlowCard>
            </div>
          )}
        </div>
      </main>

      <NewFooter />
    </div>
  )
}
