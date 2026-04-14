// RAVETURE Ticketing Service API Client
// This service provides methods to interact with all ticketing endpoints

const API_BASE_URL = import.meta.env.VITE_TICKETING_API_URL || 'http://localhost:5001'

export function getApiBaseUrl(): string {
  return API_BASE_URL
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

interface AuthConfig {
  type: 'jwt' | 'apiKey'
  token: string
  userId?: string
}

class TicketingApiService {
  private authConfig: AuthConfig | null = null

  setAuth(config: AuthConfig | null) {
    this.authConfig = config
  }

  getAuth(): AuthConfig | null {
    return this.authConfig
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.authConfig) {
      if (this.authConfig.type === 'jwt') {
        headers['Authorization'] = `Bearer ${this.authConfig.token}`
      } else {
        headers['X-API-Key'] = this.authConfig.token
        if (this.authConfig.userId) {
          headers['X-User-ID'] = this.authConfig.userId
        }
      }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    const data = await response.json()

    if (!response.ok) {
      throw { status: response.status, ...data }
    }

    return data
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  async healthCheck() {
    return this.request<{ status: string; service: string; version: string }>('/health')
  }

  // ============================================================================
  // TICKET TYPES
  // ============================================================================

  async getTicketTypes(eventId: string) {
    return this.request<{
      event_id: string
      ticket_types: import('@/types').TicketType[]
      count: number
    }>(`/api/v1/events/${eventId}/ticket-types`)
  }

  async createTicketType(data: {
    event_id: string
    name: string
    description?: string
    price_cents: number
    currency?: string
    quantity_total: number
    sale_starts_at?: string
    sale_ends_at?: string
    max_per_order?: number
    resale_allowed?: boolean
    resale_max_price_percent?: number
  }) {
    return this.request<import('@/types').TicketType>('/api/v1/admin/ticket-types', {
      method: 'POST',
      body: data,
    })
  }

  // ============================================================================
  // TICKETS
  // ============================================================================

  async getMyTickets(params?: { event_id?: string; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.event_id) searchParams.set('event_id', params.event_id)
    if (params?.status) searchParams.set('status', params.status)
    const query = searchParams.toString()
    const response = await this.request<{ tickets: import('@/types').Ticket[]; count: number }>(
      `/api/v1/tickets${query ? `?${query}` : ''}`
    )

    // Fetch event names from RAVETURE API
    if (response.tickets.length > 0) {
      const { ravetureApi } = await import('./ravetureApi')

      // Get unique event IDs
      const eventIds = [...new Set(response.tickets.map(t => t.event_id).filter(Boolean))] as string[]

      // Fetch event details for each unique event ID
      const eventDetailsMap = new Map<string, string>()
      await Promise.all(
        eventIds.map(async (eventId) => {
          try {
            const event = await ravetureApi.getEvent(eventId)
            eventDetailsMap.set(eventId, event.name)
          } catch {
            // Ignore errors, event name will just be missing
          }
        })
      )

      // Add event names to tickets
      response.tickets = response.tickets.map(ticket => ({
        ...ticket,
        event_name: ticket.event_id ? eventDetailsMap.get(ticket.event_id) : undefined
      }))
    }

    return response
  }

  async getTicket(ticketId: string) {
    const ticket = await this.request<import('@/types').Ticket>(`/api/v1/tickets/${ticketId}`)

    // Fetch event name from RAVETURE API if event_id is present
    if (ticket.event_id) {
      try {
        const { ravetureApi } = await import('./ravetureApi')
        const event = await ravetureApi.getEvent(ticket.event_id)
        ticket.event_name = event.name
      } catch {
        // Ignore errors, event name will just be missing
      }
    }

    return ticket
  }

  async getTicketQR(ticketId: string) {
    return this.request<import('@/types').QRCodeData>(`/api/v1/tickets/${ticketId}/qr`)
  }

  async transferTicket(ticketId: string, recipientId: string) {
    return this.request<{
      message: string
      ticket_id: string
      new_owner_id: string
    }>(`/api/v1/tickets/${ticketId}/transfer`, {
      method: 'POST',
      body: { recipient_id: recipientId },
    })
  }

  // ============================================================================
  // ORDERS
  // ============================================================================

  async createOrder(data: {
    event_id: string
    items: Array<{ ticket_type_id: string; quantity: number }>
    discount_code?: string
    event_name?: string
    event_date?: string
    event_venue?: string
  }) {
    return this.request<{
      order: import('@/types').Order
      expires_in_seconds: number
      message: string
      discount?: {
        code: string
        type: string
        value: number
        amount_cents: number
      }
    }>('/api/v1/orders', {
      method: 'POST',
      body: data,
    })
  }

  async getOrder(orderId: string) {
    return this.request<import('@/types').Order>(`/api/v1/orders/${orderId}`)
  }

  async getMyOrders(params?: { status?: string; limit?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    const query = searchParams.toString()
    return this.request<{ orders: import('@/types').Order[]; count: number }>(
      `/api/v1/orders${query ? `?${query}` : ''}`
    )
  }

  async confirmOrder(orderId: string, data?: { payment_method?: string; payment_reference?: string; email?: string }) {
    return this.request<{
      message: string
      order: import('@/types').Order
      tickets: import('@/types').Ticket[]
    }>(`/api/v1/orders/${orderId}/confirm`, {
      method: 'POST',
      body: data || {},
    })
  }

  async cancelOrder(orderId: string) {
    return this.request<{
      message: string
      order: import('@/types').Order
    }>(`/api/v1/orders/${orderId}/cancel`, {
      method: 'POST',
    })
  }

  // ============================================================================
  // VALIDATION (DOOR ENTRY)
  // ============================================================================

  async scanTicket(data: {
    ticket_id: string
    event_id: string
    signature: string
    scanned_by?: string
    location?: string
  }) {
    return this.request<import('@/types').ValidationResult>('/api/v1/validate/scan', {
      method: 'POST',
      body: data,
    })
  }

  async getValidationStats(eventId: string) {
    return this.request<import('@/types').ValidationStats>(`/api/v1/validate/stats/${eventId}`)
  }

  // ============================================================================
  // RESALE MARKETPLACE
  // ============================================================================

  async getResaleListings(eventId: string) {
    return this.request<{
      listings: import('@/types').ResaleListing[]
      count: number
    }>(`/api/v1/resale/listings?event_id=${eventId}`)
  }

  async listTicketForResale(ticketId: string, askingPriceCents: number) {
    return this.request<{
      message: string
      listing: import('@/types').ResaleListing
      warning: string
    }>('/api/v1/resale/list', {
      method: 'POST',
      body: { ticket_id: ticketId, asking_price_cents: askingPriceCents },
    })
  }

  async cancelResaleListing(listingId: string) {
    return this.request<{
      message: string
      ticket_id: string
    }>(`/api/v1/resale/list/${listingId}`, {
      method: 'DELETE',
    })
  }

  async buyResaleTicket(listingId: string) {
    return this.request<{
      message: string
      ticket: import('@/types').Ticket
    }>(`/api/v1/resale/buy/${listingId}`, {
      method: 'POST',
    })
  }

  // ============================================================================
  // API CLIENTS
  // ============================================================================

  async registerApiClient(data: {
    name: string
    allowed_events?: string[]
    rate_limit_per_minute?: number
  }) {
    return this.request<{
      client: import('@/types').ApiClient
      api_key: string
      warning: string
    }>('/api/v1/clients', {
      method: 'POST',
      body: data,
    })
  }

  async getMyClientInfo() {
    return this.request<import('@/types').ApiClient>('/api/v1/clients/me')
  }

  // ============================================================================
  // PDF DOWNLOAD
  // ============================================================================

  async downloadTicketPdf(ticketId: string): Promise<Blob> {
    const headers: Record<string, string> = {}

    if (this.authConfig) {
      if (this.authConfig.type === 'jwt') {
        headers['Authorization'] = `Bearer ${this.authConfig.token}`
      } else {
        headers['X-API-Key'] = this.authConfig.token
        if (this.authConfig.userId) {
          headers['X-User-ID'] = this.authConfig.userId
        }
      }
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/tickets/${ticketId}/pdf`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const error = await response.json()
      throw { status: response.status, ...error }
    }

    return response.blob()
  }

  // ============================================================================
  // DISCOUNT CODES
  // ============================================================================

  async validateDiscountCode(data: {
    code: string
    event_id: string
    order_total_cents: number
  }) {
    return this.request<{
      valid: boolean
      discount_code?: {
        id: string
        code: string
        discount_type: string
        discount_value: number
      }
      discount_amount_cents?: number
      final_total_cents?: number
      message: string
      error?: string
    }>('/api/v1/discount-codes/validate', {
      method: 'POST',
      body: data,
    })
  }

  async createDiscountCode(data: {
    code: string
    event_id?: string
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    currency?: string
    min_order_cents?: number
    max_uses?: number
    max_uses_per_user?: number
    valid_from?: string
    valid_until?: string
    description?: string
  }) {
    return this.request<{
      discount_code: import('@/types').DiscountCode
      message: string
    }>('/api/v1/admin/discount-codes', {
      method: 'POST',
      body: data,
    })
  }

  async listDiscountCodes(params?: { event_id?: string; active_only?: boolean }) {
    const searchParams = new URLSearchParams()
    if (params?.event_id) searchParams.set('event_id', params.event_id)
    if (params?.active_only) searchParams.set('active_only', 'true')
    const query = searchParams.toString()
    return this.request<{
      discount_codes: import('@/types').DiscountCode[]
      count: number
    }>(`/api/v1/admin/discount-codes${query ? `?${query}` : ''}`)
  }

  async updateDiscountCode(codeId: string, data: {
    is_active?: boolean
    max_uses?: number
    valid_until?: string
    description?: string
  }) {
    return this.request<{
      discount_code: import('@/types').DiscountCode
      message: string
    }>(`/api/v1/admin/discount-codes/${codeId}`, {
      method: 'PUT',
      body: data,
    })
  }

  async deleteDiscountCode(codeId: string) {
    return this.request<{
      message: string
      code: string
    }>(`/api/v1/admin/discount-codes/${codeId}`, {
      method: 'DELETE',
    })
  }

  // ============================================================================
  // ADMIN / ORGANIZER STATISTICS
  // ============================================================================

  async getEventStats(eventId: string) {
    return this.request<import('@/types').EventStats>(`/api/v1/admin/events/${eventId}/stats`)
  }

  async getEventBuyers(eventId: string, params?: { page?: number; per_page?: number; search?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())
    if (params?.search) searchParams.set('search', params.search)
    const query = searchParams.toString()
    return this.request<import('@/types').BuyersList>(
      `/api/v1/admin/events/${eventId}/buyers${query ? `?${query}` : ''}`
    )
  }

  async getDiscountStats(eventId: string) {
    return this.request<{
      event_id: string
      total_discount_given_cents: number
      codes_used_count: number
      codes: Array<{
        code: string
        discount_type: string
        discount_value: number
        uses: number
        total_discount_cents: number
        is_active: boolean
      }>
    }>(`/api/v1/admin/events/${eventId}/discount-stats`)
  }

  async getCheckinDetails(eventId: string, params?: { page?: number; per_page?: number; result?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())
    if (params?.result) searchParams.set('result', params.result)
    const query = searchParams.toString()
    return this.request<{
      validations: Array<{
        id: string
        ticket_id: string
        event_id: string
        result: string
        location: string
        scanned_at: string
        ticket_type_name?: string
        ticket_owner_id?: string
      }>
      total: number
      page: number
      per_page: number
      pages: number
    }>(`/api/v1/admin/events/${eventId}/checkins${query ? `?${query}` : ''}`)
  }

  async updateTicketType(ticketTypeId: string, data: {
    is_active?: boolean
    quantity_total?: number
    sale_starts_at?: string | null
    sale_ends_at?: string | null
    max_per_order?: number
    description?: string
  }) {
    return this.request<{
      ticket_type: import('@/types').TicketType
      message: string
    }>(`/api/v1/admin/ticket-types/${ticketTypeId}`, {
      method: 'PUT',
      body: data,
    })
  }

  // ============================================================================
  // GOPAY PAYMENTS
  // ============================================================================

  async createPayment(data: {
    order_id: string
    email?: string
  }) {
    return this.request<{
      payment_id: string
      gateway_url: string
      message: string
    }>('/api/v1/payments/create', {
      method: 'POST',
      body: data,
    })
  }

  async getPaymentStatus(paymentId: string) {
    return this.request<{
      payment_id: string
      state: string
      order_id: string
      order_status: string
    }>(`/api/v1/payments/status/${paymentId}`)
  }
}

export const ticketingApi = new TicketingApiService()
