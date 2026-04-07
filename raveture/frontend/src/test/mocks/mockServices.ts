/**
 * Mock API Services for RAVETURE Tests
 *
 * This file provides mock implementations of API services for testing.
 * Use vi.mock() to replace real API calls with these mocks.
 */

import { vi } from 'vitest';
import {
  mockEvents,
  mockTicketTypes,
  mockOrders,
  mockTickets,
  mockUsers,
  mockVenues,
  mockDiscountCodes,
  mockEventStats,
} from './mockData';

/**
 * Mock Raveture API Service
 */
export const mockRavetureApi = {
  /**
   * Auth endpoints
   */
  auth: {
    login: vi.fn((email: string, password: string) =>
      Promise.resolve({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: mockUsers.regular,
      })
    ),

    register: vi.fn((name: string, email: string, password: string) =>
      Promise.resolve({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: { ...mockUsers.regular, name, email },
      })
    ),

    logout: vi.fn(() => Promise.resolve()),

    refreshToken: vi.fn(() =>
      Promise.resolve({
        access_token: 'new-mock-access-token',
      })
    ),

    forgotPassword: vi.fn((email: string) =>
      Promise.resolve({
        message: 'Password reset email sent',
      })
    ),

    resetPassword: vi.fn((token: string, newPassword: string) =>
      Promise.resolve({
        message: 'Password reset successful',
      })
    ),

    verifyResetToken: vi.fn((token: string) =>
      Promise.resolve({
        valid: true,
        email: 'user@example.com',
      })
    ),
  },

  /**
   * Events endpoints
   */
  events: {
    getAll: vi.fn((params?: any) => Promise.resolve(mockEvents)),

    getBySlug: vi.fn((slug: string) => {
      const event = mockEvents.find((e) => e.slug === slug);
      return Promise.resolve(event || mockEvents[0]);
    }),

    create: vi.fn((eventData: any) =>
      Promise.resolve({
        ...mockEvents[0],
        ...eventData,
        id: 'new-event-id',
      })
    ),

    update: vi.fn((id: string, eventData: any) =>
      Promise.resolve({
        ...mockEvents[0],
        ...eventData,
        id,
      })
    ),

    delete: vi.fn((id: string) => Promise.resolve()),

    getMyEvents: vi.fn(() => Promise.resolve(mockEvents.slice(0, 2))),
  },

  /**
   * Venues endpoints
   */
  venues: {
    getAll: vi.fn(() => Promise.resolve(mockVenues)),

    getBySlug: vi.fn((slug: string) => {
      const venue = mockVenues.find((v) => v.slug === slug);
      return Promise.resolve(venue || mockVenues[0]);
    }),

    create: vi.fn((venueData: any) =>
      Promise.resolve({
        ...mockVenues[0],
        ...venueData,
        id: 'new-venue-id',
      })
    ),

    update: vi.fn((id: string, venueData: any) =>
      Promise.resolve({
        ...mockVenues[0],
        ...venueData,
        id,
      })
    ),

    delete: vi.fn((id: string) => Promise.resolve()),

    getMyVenues: vi.fn(() => Promise.resolve(mockVenues)),
  },

  /**
   * Upload endpoints
   */
  upload: {
    uploadImage: vi.fn((file: File, category: string) =>
      Promise.resolve({
        url: `https://example.com/uploads/${category}/${file.name}`,
        filename: file.name,
      })
    ),

    deleteImage: vi.fn((filename: string) => Promise.resolve()),
  },
};

/**
 * Mock Ticketing API Service
 */
export const mockTicketingApi = {
  /**
   * Ticket Types endpoints
   */
  ticketTypes: {
    getByEvent: vi.fn((eventId: string) =>
      Promise.resolve(
        mockTicketTypes.filter((tt) => tt.event_id === eventId)
      )
    ),

    create: vi.fn((ticketTypeData: any) =>
      Promise.resolve({
        ...mockTicketTypes[0],
        ...ticketTypeData,
        id: 'new-ticket-type-id',
      })
    ),

    update: vi.fn((id: string, ticketTypeData: any) =>
      Promise.resolve({
        ...mockTicketTypes[0],
        ...ticketTypeData,
        id,
      })
    ),

    delete: vi.fn((id: string) => Promise.resolve()),

    activate: vi.fn((id: string) =>
      Promise.resolve({
        ...mockTicketTypes[0],
        id,
        is_active: true,
      })
    ),

    deactivate: vi.fn((id: string) =>
      Promise.resolve({
        ...mockTicketTypes[0],
        id,
        is_active: false,
      })
    ),
  },

  /**
   * Orders endpoints
   */
  orders: {
    create: vi.fn((orderData: any) =>
      Promise.resolve({
        ...mockOrders[1],
        ...orderData,
        id: 'new-order-id',
        status: 'pending',
      })
    ),

    confirm: vi.fn((orderId: string) =>
      Promise.resolve({
        ...mockOrders[0],
        id: orderId,
        status: 'confirmed',
        payment_status: 'paid',
      })
    ),

    cancel: vi.fn((orderId: string) =>
      Promise.resolve({
        ...mockOrders[1],
        id: orderId,
        status: 'cancelled',
      })
    ),

    getById: vi.fn((orderId: string) => {
      const order = mockOrders.find((o) => o.id === orderId);
      return Promise.resolve(order || mockOrders[0]);
    }),
  },

  /**
   * Tickets endpoints
   */
  tickets: {
    getMyTickets: vi.fn(() => Promise.resolve(mockTickets)),

    getById: vi.fn((ticketId: string) => {
      const ticket = mockTickets.find((t) => t.id === ticketId);
      return Promise.resolve(ticket || mockTickets[0]);
    }),

    getQRCode: vi.fn((ticketId: string) =>
      Promise.resolve({
        qr_code_data: 'mock-qr-code-data',
        expires_at: new Date(Date.now() + 30000).toISOString(),
      })
    ),

    validateTicket: vi.fn((ticketNumber: string, qrCode: string) =>
      Promise.resolve({
        valid: true,
        ticket: mockTickets[0],
      })
    ),

    downloadPDF: vi.fn((ticketId: string) =>
      Promise.resolve(new Blob(['mock pdf data'], { type: 'application/pdf' }))
    ),
  },

  /**
   * Discount Codes endpoints
   */
  discountCodes: {
    getByEvent: vi.fn((eventId: string) =>
      Promise.resolve(
        mockDiscountCodes.filter((dc) => dc.event_id === eventId)
      )
    ),

    validate: vi.fn((code: string, eventId: string) =>
      Promise.resolve({
        valid: true,
        discount: mockDiscountCodes[0],
      })
    ),

    create: vi.fn((discountData: any) =>
      Promise.resolve({
        ...mockDiscountCodes[0],
        ...discountData,
        id: 'new-discount-code-id',
      })
    ),

    update: vi.fn((id: string, discountData: any) =>
      Promise.resolve({
        ...mockDiscountCodes[0],
        ...discountData,
        id,
      })
    ),

    delete: vi.fn((id: string) => Promise.resolve()),
  },

  /**
   * Admin/Statistics endpoints
   */
  admin: {
    getEventStats: vi.fn((eventId: string) =>
      Promise.resolve({
        ...mockEventStats,
        event_id: eventId,
      })
    ),

    getBuyers: vi.fn((eventId: string) =>
      Promise.resolve([
        {
          order_id: mockOrders[0].id,
          user_name: mockUsers.regular.name,
          user_email: mockUsers.regular.email,
          tickets_count: 2,
          total_amount: 700.0,
          created_at: mockOrders[0].created_at,
        },
      ])
    ),
  },
};

/**
 * Mock fetch responses
 */
export function mockFetchSuccess(data: any, status = 200) {
  return Promise.resolve({
    ok: true,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response);
}

export function mockFetchError(message: string, status = 400) {
  return Promise.resolve({
    ok: false,
    status,
    json: async () => ({ error: message }),
    text: async () => JSON.stringify({ error: message }),
  } as Response);
}

/**
 * Mock setTimeout for testing timers
 */
export function mockTimers() {
  vi.useFakeTimers();
  return {
    advance: (ms: number) => vi.advanceTimersByTime(ms),
    runAll: () => vi.runAllTimers(),
    restore: () => vi.useRealTimers(),
  };
}

/**
 * Mock GSAP animations (to prevent animation-related test issues)
 */
export function mockGSAP() {
  return {
    to: vi.fn((target, vars) => ({
      kill: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
    })),
    from: vi.fn((target, vars) => ({
      kill: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
    })),
    fromTo: vi.fn((target, fromVars, toVars) => ({
      kill: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
    })),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      fromTo: vi.fn().mockReturnThis(),
      kill: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
    })),
  };
}
