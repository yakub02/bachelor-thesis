// RAVETURE Main Backend API Client
// Handles authentication, users, events, and organizer operations

const API_BASE_URL = import.meta.env.VITE_RAVETURE_API_URL || 'http://localhost:5000'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  skipAuth?: boolean
}

// Auth response types
export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export interface UserProfile {
  id: string
  email: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  role: 'user' | 'artist' | 'organizer' | 'moderator' | 'admin'
  is_verified: boolean
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

export interface UserPreferences {
  email_notifications: boolean
  push_notifications: boolean
  event_reminders: boolean
  dark_mode: boolean
  preferred_genres: string[]
  preferred_cities: string[]
}

export interface RegisterData {
  email: string
  username: string
  password: string
  display_name?: string
}

export interface LoginData {
  email: string
  password: string
}

export interface Event {
  id: string
  name: string
  slug: string
  description: string | null
  short_description: string | null
  event_type: string
  status: string
  starts_at: string
  ends_at: string | null
  doors_open_at: string | null
  venue_id: string | null
  cover_image_url: string | null
  flyer_url: string | null
  genres: string[]
  is_featured: boolean
  ticketing_enabled: boolean
  external_ticket_url: string | null
  min_age: number | null
  view_count: number
  interested_count: number
  organizer: Organizer | null
  venue: Venue | null
}

export interface Organizer {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  is_verified: boolean
  website_url: string | null
  instagram_url: string | null
}

export interface Venue {
  id: string
  name: string
  slug: string
  address: string | null
  city: string
  country: string
  capacity: number | null
  image_url: string | null
  latitude: number | null
  longitude: number | null
}

export interface Pick {
  id: string
  event_id: string
  reason: string
  featured_at: string
  expires_at: string | null
  curator: {
    id: string
    display_name: string | null
    username: string
    avatar_url: string | null
    role: string
  } | null
  event: Event
}

class RavetureApiService {
  private accessToken: string | null = null
  private refreshToken: string | null = null

  constructor() {
    // Load tokens from localStorage on init
    this.accessToken = localStorage.getItem('access_token')
    this.refreshToken = localStorage.getItem('refresh_token')
  }

  setTokens(tokens: AuthTokens | null) {
    if (tokens) {
      this.accessToken = tokens.access_token
      this.refreshToken = tokens.refresh_token
      localStorage.setItem('access_token', tokens.access_token)
      localStorage.setItem('refresh_token', tokens.refresh_token)
    } else {
      this.accessToken = null
      this.refreshToken = null
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  }

  getAccessToken(): string | null {
    return this.accessToken
  }

  isAuthenticated(): boolean {
    return !!this.accessToken
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (!options.skipAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    // Handle 401 - try to refresh token
    if (response.status === 401 && this.refreshToken && !options.skipAuth) {
      const refreshed = await this.tryRefreshToken()
      if (refreshed) {
        // Retry the request with new token
        headers['Authorization'] = `Bearer ${this.accessToken}`
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: options.method || 'GET',
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
        })
        const retryData = await retryResponse.json()
        if (!retryResponse.ok) {
          throw { status: retryResponse.status, ...retryData }
        }
        return retryData
      }
    }

    const data = await response.json()

    if (!response.ok) {
      throw { status: response.status, ...data }
    }

    return data
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.refreshToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        this.setTokens(data)
        return true
      }
    } catch {
      // Refresh failed
    }

    // Clear tokens on refresh failure
    this.setTokens(null)
    return false
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  async register(data: RegisterData): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const response = await this.request<{
      message: string
      user: UserProfile
      access_token: string
      refresh_token: string
    }>('/api/v1/auth/register', {
      method: 'POST',
      body: data,
      skipAuth: true,
    })

    const tokens = {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
    }
    this.setTokens(tokens)

    return { user: response.user, tokens }
  }

  async login(data: LoginData): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const response = await this.request<{
      message: string
      user: UserProfile
      access_token: string
      refresh_token: string
    }>('/api/v1/auth/login', {
      method: 'POST',
      body: data,
      skipAuth: true,
    })

    const tokens = {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
    }
    this.setTokens(tokens)

    return { user: response.user, tokens }
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/v1/auth/logout', { method: 'POST' })
    } finally {
      this.setTokens(null)
    }
  }

  async getCurrentUser(): Promise<{ user: UserProfile; preferences: UserPreferences }> {
    return this.request('/api/v1/auth/me')
  }

  async refreshTokens(): Promise<AuthTokens> {
    const response = await this.request<{
      access_token: string
      refresh_token: string
    }>('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.refreshToken}`,
      },
      skipAuth: true,
    })

    this.setTokens(response)
    return response
  }

  // ============================================================================
  // USER PROFILE
  // ============================================================================

  async getMyProfile(): Promise<UserProfile> {
    const response = await this.request<{ user: UserProfile }>('/api/v1/users/me')
    return response.user
  }

  async updateMyProfile(data: Partial<{
    display_name: string
    bio: string
    location: string
    avatar_url: string
    website_url: string
    soundcloud_url: string
    instagram_url: string
  }>): Promise<UserProfile> {
    const response = await this.request<{ user: UserProfile }>('/api/v1/users/me', {
      method: 'PUT',
      body: data,
    })
    return response.user
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    const response = await this.request<{ user: UserProfile }>(`/api/v1/users/${userId}`)
    return response.user
  }

  async getMyPreferences(): Promise<UserPreferences> {
    const response = await this.request<{ preferences: UserPreferences }>('/api/v1/users/me/preferences')
    return response.preferences
  }

  async updateMyPreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
    const response = await this.request<{ preferences: UserPreferences }>('/api/v1/users/me/preferences', {
      method: 'PUT',
      body: data,
    })
    return response.preferences
  }

  // ============================================================================
  // EVENTS (PUBLIC)
  // ============================================================================

  async getEvents(params?: {
    page?: number
    per_page?: number
    city?: string
    genre?: string
    from_date?: string
  }): Promise<{ events: Event[]; total: number; page: number; pages: number }> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())
    if (params?.city) searchParams.set('city', params.city)
    if (params?.genre) searchParams.set('genre', params.genre)
    if (params?.from_date) searchParams.set('from_date', params.from_date)
    const query = searchParams.toString()
    return this.request(`/api/v1/events${query ? `?${query}` : ''}`, { skipAuth: true })
  }

  async getFeaturedEvents(): Promise<{ events: Event[] }> {
    return this.request('/api/v1/events/featured', { skipAuth: true })
  }

  async getEvent(slug: string): Promise<Event> {
    const response = await this.request<{ event: Event }>(`/api/v1/events/${slug}`, { skipAuth: true })
    return response.event
  }

  // ============================================================================
  // MY EVENTS & ORGANIZER (AUTHENTICATED)
  // ============================================================================

  async getMyEvents(): Promise<{ events: Event[]; organizer: Organizer | null }> {
    return this.request('/api/v1/my-events')
  }

  async getMyOrganizer(): Promise<Organizer | null> {
    const response = await this.request<{ organizer: Organizer | null }>('/api/v1/my-organizer')
    return response.organizer
  }

  async createMyOrganizer(data: {
    name: string
    description?: string
    email?: string
    website_url?: string
    instagram_url?: string
  }): Promise<Organizer> {
    const response = await this.request<{ organizer: Organizer; message: string }>('/api/v1/my-organizer', {
      method: 'POST',
      body: data,
    })
    return response.organizer
  }

  async createEvent(data: {
    name: string
    description?: string
    short_description?: string
    starts_at: string
    ends_at?: string
    event_type?: string
    genres?: string[]
    ticketing_enabled?: boolean
    min_age?: number
    cover_image_url?: string
    venue_id?: string
  }): Promise<Event> {
    const response = await this.request<{ event: Event; message: string }>('/api/v1/events', {
      method: 'POST',
      body: data,
    })
    return response.event
  }

  async updateEvent(eventId: string, data: Partial<{
    name: string
    description: string
    short_description: string
    starts_at: string
    ends_at: string | null
    event_type: string
    genres: string[]
    ticketing_enabled: boolean
    min_age: number
    status: 'draft' | 'published' | 'cancelled'
    cover_image_url: string
  }>): Promise<Event> {
    const response = await this.request<{ event: Event; message: string }>(`/api/v1/events/${eventId}`, {
      method: 'PUT',
      body: data,
    })
    return response.event
  }

  // ============================================================================
  // VENUES
  // ============================================================================

  async getVenues(city?: string): Promise<{ venues: Venue[] }> {
    const query = city ? `?city=${encodeURIComponent(city)}` : ''
    return this.request(`/api/v1/venues${query}`, { skipAuth: true })
  }

  async getVenue(slug: string): Promise<Venue> {
    const response = await this.request<{ venue: Venue }>(`/api/v1/venues/${slug}`, { skipAuth: true })
    return response.venue
  }

  async createVenue(data: {
    name: string
    city: string
    address?: string
    country?: string
    capacity?: number
    description?: string
    latitude?: number
    longitude?: number
  }): Promise<Venue> {
    const response = await this.request<{ venue: Venue; message: string }>('/api/v1/venues', {
      method: 'POST',
      body: data,
    })
    return response.venue
  }

  async getMyVenues(): Promise<{ venues: Venue[] }> {
    return this.request('/api/v1/my-venues')
  }

  // ============================================================================
  // ORGANIZERS
  // ============================================================================

  async getOrganizers(): Promise<{ organizers: Organizer[] }> {
    return this.request('/api/v1/organizers', { skipAuth: true })
  }

  async getOrganizer(slug: string): Promise<Organizer> {
    const response = await this.request<{ organizer: Organizer }>(`/api/v1/organizers/${slug}`, { skipAuth: true })
    return response.organizer
  }

  async getOrganizerEvents(slug: string): Promise<{ events: Event[] }> {
    return this.request(`/api/v1/organizers/${slug}/events`, { skipAuth: true })
  }

  // ============================================================================
  // EVENT INTEREST
  // ============================================================================

  async markInterested(eventId: string): Promise<void> {
    await this.request(`/api/v1/events/${eventId}/interested`, { method: 'POST' })
  }

  async removeInterested(eventId: string): Promise<void> {
    await this.request(`/api/v1/events/${eventId}/interested`, { method: 'DELETE' })
  }

  // ============================================================================
  // ADMIN - USER MANAGEMENT
  // ============================================================================

  async getAllUsers(params?: {
    page?: number
    per_page?: number
    role?: string
    search?: string
  }): Promise<{
    users: UserProfile[]
    total: number
    page: number
    pages: number
  }> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())
    if (params?.role) searchParams.set('role', params.role)
    if (params?.search) searchParams.set('search', params.search)
    const query = searchParams.toString()
    return this.request(`/api/v1/admin/users${query ? `?${query}` : ''}`)
  }

  async updateUserRole(userId: string, role: string): Promise<{ user: UserProfile }> {
    return this.request(`/api/v1/admin/users/${userId}/role`, {
      method: 'PUT',
      body: { role }
    })
  }

  async banUser(userId: string): Promise<{ message: string }> {
    return this.request(`/api/v1/admin/users/${userId}/ban`, { method: 'POST' })
  }

  async unbanUser(userId: string): Promise<{ message: string }> {
    return this.request(`/api/v1/admin/users/${userId}/unban`, { method: 'POST' })
  }

  // ============================================================================
  // ADMIN - FEATURED EVENTS (RAVETURE PICKS)
  // ============================================================================

  async getFeaturedEventsWithCurator(): Promise<{
    featured_events: Array<{
      id: string
      event_id: string
      curator: {
        id: string
        display_name: string
        avatar_url: string | null
        role: string
      } | null
      reason: string
      featured_at: string
      event: Event
    }>
    count: number
  }> {
    return this.request('/api/v1/admin/featured-events')
  }

  async createFeaturedEvent(data: {
    event_id: string
    reason: string
    expires_at?: string
  }): Promise<{
    message: string
    featured_event: any
  }> {
    return this.request('/api/v1/admin/featured-events', {
      method: 'POST',
      body: data
    })
  }

  async removeFeaturedEvent(eventId: string): Promise<{ message: string }> {
    return this.request(`/api/v1/admin/featured-events/${eventId}`, {
      method: 'DELETE'
    })
  }

  async getPicks(): Promise<{ featured_events: Pick[]; count: number }> {
    return this.request<{ featured_events: Pick[]; count: number }>(
      '/api/v1/admin/featured-events'
    )
  }

  async createPick(data: {
    event_id: string
    reason: string
    expires_at?: string
  }): Promise<{ message: string; featured_event: Pick }> {
    return this.request<{ message: string; featured_event: Pick }>(
      '/api/v1/admin/featured-events',
      { method: 'POST', body: data }
    )
  }

  async removePick(event_id: string): Promise<{ message: string; event_id: string }> {
    return this.request<{ message: string; event_id: string }>(
      `/api/v1/admin/featured-events/${event_id}`,
      { method: 'DELETE' }
    )
  }

  async checkPick(event_id: string): Promise<boolean> {
    try {
      const { featured_events } = await this.getPicks()
      return featured_events.some(p => p.event_id === event_id)
    } catch {
      return false
    }
  }

  async getMedia(params: {
    type?: string
    sort?: string
    page?: number
    per_page?: number
    genre?: string
  }): Promise<{ media: any[]; total: number; page: number; pages: number }> {
    const qs = new URLSearchParams()
    if (params.type) qs.set('type', params.type)
    if (params.sort) qs.set('sort', params.sort)
    if (params.page) qs.set('page', String(params.page))
    if (params.per_page) qs.set('per_page', String(params.per_page))
    if (params.genre) qs.set('genre', params.genre)
    return this.request<{ media: any[]; total: number; page: number; pages: number }>(
      `/api/v1/media/?${qs.toString()}`
    )
  }

  async getForumThreads(categorySlug: string, page = 1): Promise<{
    category: any
    threads: any[]
    total: number
    page: number
    pages: number
  }> {
    return this.request<{
      category: any
      threads: any[]
      total: number
      page: number
      pages: number
    }>(`/api/v1/forum/categories/${categorySlug}/threads?page=${page}&per_page=20`)
  }

  async getForumCategory(slug: string): Promise<{ id: string; name: string; slug: string }> {
    const response = await this.request<{ category: { id: string; name: string; slug: string } }>(
      `/api/v1/forum/categories/${slug}`,
      { skipAuth: true }
    )
    return response.category
  }

  async createForumCategory(data: {
    name: string
    slug: string
    description?: string
  }): Promise<{ category: { id: string; name: string; slug: string } }> {
    return this.request<{ category: { id: string; name: string; slug: string } }>(
      '/api/v1/admin/forum/categories',
      { method: 'POST', body: data }
    )
  }

  async uploadImage(file: File, category = 'images'): Promise<{ url: string }> {
    const form = new FormData()
    form.append('file', file)
    form.append('category', category)
    const headers: Record<string, string> = {}
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`
    const res = await fetch(`${API_BASE_URL}/api/v1/upload/image`, {
      method: 'POST',
      headers,
      body: form,
    })
    const data = await res.json()
    if (!res.ok) throw data
    return data
  }

  async createForumThread(data: {
    category_id: string
    title: string
    content: string
    subtitle?: string
    cover_image_url?: string
  }): Promise<{ thread: any }> {
    return this.request<{ thread: any }>('/api/v1/forum/threads', {
      method: 'POST',
      body: data,
    })
  }

  async getForumThread(threadId: string): Promise<{ thread: any; posts: any[] }> {
    return this.request<{ thread: any; posts: any[] }>(
      `/api/v1/forum/threads/${threadId}`,
      { skipAuth: true }
    )
  }

  async deleteForumThread(threadId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/v1/forum/threads/${threadId}`, { method: 'DELETE' })
  }

  async updateForumThread(threadId: string, data: { title: string; content: string; subtitle?: string; cover_image_url?: string }): Promise<{ thread: any }> {
    return this.request<{ thread: any }>(`/api/v1/forum/threads/${threadId}`, {
      method: 'PUT',
      body: data,
    })
  }

  async getArchiveTimeline(): Promise<{ timeline: Array<{ year: number; count: number }> }> {
    return this.request<{ timeline: Array<{ year: number; count: number }> }>(
      '/api/v1/archive/timeline'
    )
  }

  async getArchivedEvents(params: {
    year?: number
    page?: number
    per_page?: number
    q?: string
  }): Promise<{ events: any[]; total: number; page: number; pages: number }> {
    const qs = new URLSearchParams()
    if (params.year) qs.set('year', String(params.year))
    if (params.page) qs.set('page', String(params.page))
    if (params.per_page) qs.set('per_page', String(params.per_page))
    if (params.q) qs.set('q', params.q)
    return this.request<{ events: any[]; total: number; page: number; pages: number }>(
      `/api/v1/archive/?${qs.toString()}`
    )
  }

  async getSystemStats(): Promise<{
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
  }> {
    return this.request('/api/v1/admin/stats')
  }
}

export const ravetureApi = new RavetureApiService()
