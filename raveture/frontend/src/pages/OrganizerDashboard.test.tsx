import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, createMockOrganizerAuthState } from '@/test/utils/test-utils'
import { OrganizerDashboard } from './OrganizerDashboard'
import { mockUsers } from '@/test/mocks/mockData'

// Hoist mock functions so they are available inside vi.mock factories
const { mockGetMyEvents, mockGetMyOrganizer, mockGetEventStats, mockListDiscountCodes } = vi.hoisted(
  () => ({
    mockGetMyEvents: vi.fn(),
    mockGetMyOrganizer: vi.fn(),
    mockGetEventStats: vi.fn(),
    mockListDiscountCodes: vi.fn(),
  })
)

// Mock GSAP and related modules
vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    fromTo: vi.fn(),
    to: vi.fn(),
    from: vi.fn(),
    set: vi.fn(),
    timeline: () => ({
      fromTo: vi.fn().mockReturnThis(),
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
    }),
  },
}))
vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { create: vi.fn(), refresh: vi.fn() },
}))
vi.mock('@gsap/react', () => ({
  useGSAP: vi.fn((fn: () => void) => fn()),
}))

// Mock ravetureApi — include auth methods used by AuthContext
vi.mock('@/services/ravetureApi', () => ({
  ravetureApi: {
    getMyEvents: mockGetMyEvents,
    getMyOrganizer: mockGetMyOrganizer,
    isAuthenticated: vi.fn(() => true),
    getCurrentUser: vi.fn(() =>
      Promise.resolve({ user: mockUsers.organizer, preferences: {} })
    ),
    setTokens: vi.fn(),
  },
}))

// Mock @/services barrel (AuthContext imports ticketingApi from here)
vi.mock('@/services', async () => {
  const actual = await vi.importActual('@/services')
  return {
    ...actual,
    ticketingApi: {
      getEventStats: mockGetEventStats,
      listDiscountCodes: mockListDiscountCodes,
      setAuth: vi.fn(),
    },
  }
})

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

// ---- Mock data ----

const apiMockEvents = [
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    name: 'PSYCHOSOUND @ Artbar',
    slug: 'psychosound-artbar-2026',
    description: 'Underground psytrance event',
    short_description: null,
    event_type: 'party',
    status: 'published',
    starts_at: '2026-04-24T20:00:00Z',
    ends_at: '2026-04-25T04:00:00Z',
    doors_open_at: null,
    venue_id: '550e8400-e29b-41d4-a716-446655440001',
    venue: { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Artbar', city: 'Praha' },
    cover_image_url: 'https://example.com/events/psychosound-artbar.jpg',
    flyer_url: null,
    genres: ['Psytrance'],
    is_featured: true,
    ticketing_enabled: true,
    external_ticket_url: null,
    min_age: 18,
    view_count: 0,
    interested_count: 0,
    organizer_id: 1,
    organizer: { id: 1, name: 'PSYCHOSOUND Team', slug: 'psychosound' },
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-20T10:00:00Z',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002',
    name: 'PSYCHOSOUND 3rd Anniversary',
    slug: 'psychosound-3rd-anniversary',
    description: 'Oslava 3 let PSYCHOSOUND kolektivu',
    short_description: null,
    event_type: 'party',
    status: 'published',
    starts_at: '2026-07-17T21:00:00Z',
    ends_at: '2026-07-18T06:00:00Z',
    doors_open_at: null,
    venue_id: '550e8400-e29b-41d4-a716-446655440002',
    venue: { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Fuchs2', city: 'Praha' },
    cover_image_url: 'https://example.com/events/psychosound-anniversary.jpg',
    flyer_url: null,
    genres: ['Psytrance'],
    is_featured: true,
    ticketing_enabled: true,
    external_ticket_url: null,
    min_age: 21,
    view_count: 0,
    interested_count: 0,
    organizer_id: 1,
    organizer: { id: 1, name: 'PSYCHOSOUND Team', slug: 'psychosound' },
    created_at: '2026-03-05T00:00:00Z',
    updated_at: '2026-03-22T15:30:00Z',
  },
]

const mockEventsResponse = { events: apiMockEvents, organizer: null }
const mockEmptyEventsResponse = { events: [], organizer: null }

const mockOrganizerProfile = {
  id: 1,
  name: 'PSYCHOSOUND Team',
  slug: 'psychosound',
  bio: 'Underground psytrance collective',
  website: null,
  created_at: '2026-01-01T00:00:00Z',
}

const mockStatsResponse = {
  event_id: apiMockEvents[0].id,
  summary: {
    total_revenue_cents: 4235000,
    total_discounts_cents: 0,
    total_sold: 127,
    total_capacity: 280,
    total_checkins: 90,
    checkin_rate: 71,
  },
  orders: {
    confirmed: 98,
    pending: 5,
    cancelled: 3,
  },
  by_ticket_type: [],
  daily_sales: [],
  recent_orders: [],
}

const mockDiscountCodesResponse = { discount_codes: [] }

const organizerAuthState = createMockOrganizerAuthState()

describe('OrganizerDashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches organizer events on mount', async () => {
    mockGetMyEvents.mockResolvedValue(mockEventsResponse)
    mockGetMyOrganizer.mockResolvedValue(mockOrganizerProfile)
    mockGetEventStats.mockResolvedValue(mockStatsResponse)
    mockListDiscountCodes.mockResolvedValue(mockDiscountCodesResponse)

    renderWithProviders(<OrganizerDashboard />, { authState: organizerAuthState })

    await waitFor(() => {
      expect(mockGetMyEvents).toHaveBeenCalledTimes(1)
    })
  })

  it('fetches organizer profile on mount via getMyEvents', async () => {
    mockGetMyEvents.mockResolvedValue({ ...mockEventsResponse, organizer: mockOrganizerProfile })
    mockGetMyOrganizer.mockResolvedValue(mockOrganizerProfile)
    mockGetEventStats.mockResolvedValue(mockStatsResponse)
    mockListDiscountCodes.mockResolvedValue(mockDiscountCodesResponse)

    renderWithProviders(<OrganizerDashboard />, { authState: organizerAuthState })

    // The dashboard loads organizer profile as part of getMyEvents response
    await waitFor(() => {
      expect(mockGetMyEvents).toHaveBeenCalledTimes(1)
    })

    // Organizer Dashboard heading confirms profile data is accessible
    expect(screen.getByText('Organizer Dashboard')).toBeInTheDocument()
  })

  it('shows empty state when organizer has no events', async () => {
    mockGetMyEvents.mockResolvedValue(mockEmptyEventsResponse)
    mockGetMyOrganizer.mockResolvedValue(mockOrganizerProfile)
    mockGetEventStats.mockResolvedValue(mockStatsResponse)
    mockListDiscountCodes.mockResolvedValue(mockDiscountCodesResponse)

    renderWithProviders(<OrganizerDashboard />, { authState: organizerAuthState })

    await waitFor(() => {
      expect(screen.getByText('No events filed.')).toBeInTheDocument()
    })
  })

  it('renders without crashing with events', async () => {
    mockGetMyEvents.mockResolvedValue(mockEventsResponse)
    mockGetMyOrganizer.mockResolvedValue(mockOrganizerProfile)
    mockGetEventStats.mockResolvedValue(mockStatsResponse)
    mockListDiscountCodes.mockResolvedValue(mockDiscountCodesResponse)

    renderWithProviders(<OrganizerDashboard />, { authState: organizerAuthState })

    await waitFor(() => {
      expect(mockGetMyEvents).toHaveBeenCalledTimes(1)
    })

    // Dashboard heading should be present
    expect(screen.getByText('Organizer Dashboard')).toBeInTheDocument()
  })

  it('renders event list correctly when events exist', async () => {
    mockGetMyEvents.mockResolvedValue(mockEventsResponse)
    mockGetMyOrganizer.mockResolvedValue(mockOrganizerProfile)
    mockGetEventStats.mockResolvedValue(mockStatsResponse)
    mockListDiscountCodes.mockResolvedValue(mockDiscountCodesResponse)

    renderWithProviders(<OrganizerDashboard />, { authState: organizerAuthState })

    // Event names appear in the select dropdown as <option>s
    // (may also appear in header span for the currently-selected event)
    await waitFor(() => {
      const options = screen.getAllByRole('option')
      const optionTexts = options.map((o) => o.textContent)
      expect(optionTexts).toContain('PSYCHOSOUND @ Artbar')
      expect(optionTexts).toContain('PSYCHOSOUND 3rd Anniversary')
    })
  })
})
