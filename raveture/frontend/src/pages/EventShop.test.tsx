import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/test-utils'
import { EventShop } from './EventShop'

// Hoist mock functions so they are available inside vi.mock factories
const { mockGetEvent, mockCheckPick, mockGetTicketTypes, mockGetResaleListings, mockCreateOrder } = vi.hoisted(() => ({
  mockGetEvent: vi.fn(),
  mockCheckPick: vi.fn(),
  mockGetTicketTypes: vi.fn(),
  mockGetResaleListings: vi.fn(),
  mockCreateOrder: vi.fn(),
}))

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

// Mock the ravetureApi — include auth methods used by AuthContext
vi.mock('@/services/ravetureApi', () => ({
  ravetureApi: {
    getEvent: mockGetEvent,
    checkPick: mockCheckPick,
    isAuthenticated: vi.fn(() => false),
    getCurrentUser: vi.fn(() => Promise.resolve(null)),
    setTokens: vi.fn(),
  },
}))

// Mock ticketingApi (imported from @/services)
vi.mock('@/services', async () => {
  const actual = await vi.importActual('@/services')
  return {
    ...actual,
    ticketingApi: {
      getTicketTypes: mockGetTicketTypes,
      getResaleListings: mockGetResaleListings,
      createOrder: mockCreateOrder,
      setAuth: vi.fn(),
    },
  }
})

// Mock react-router-dom to provide useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ eventId: '660e8400-e29b-41d4-a716-446655440001' }),
    useNavigate: () => vi.fn(),
  }
})

// API-compatible mock event (matching the Event interface from ravetureApi.ts)
const apiMockEvent = {
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
}

// API-compatible mock ticket types (with price_cents, max_per_order, quantity_available)
const apiMockTicketTypes = [
  {
    id: '770e8400-e29b-41d4-a716-446655440001',
    event_id: '660e8400-e29b-41d4-a716-446655440001',
    name: 'Early Bird',
    description: 'Zvýhodněná vstupenka pro první kupce',
    price_cents: 20000,
    currency: 'CZK',
    quantity_total: 50,
    quantity_available: 25,
    quantity_sold: 25,
    max_per_order: 4,
    is_active: true,
    sale_starts_at: '2026-03-01T00:00:00Z',
    sale_ends_at: '2026-04-20T23:59:59Z',
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440002',
    event_id: '660e8400-e29b-41d4-a716-446655440001',
    name: 'Standard',
    description: 'Standardní vstupenka',
    price_cents: 35000,
    currency: 'CZK',
    quantity_total: 200,
    quantity_available: 180,
    quantity_sold: 20,
    max_per_order: 10,
    is_active: true,
    sale_starts_at: '2026-03-01T00:00:00Z',
    sale_ends_at: '2026-04-24T20:00:00Z',
    created_at: '2026-03-01T00:00:00Z',
  },
]

const mockTicketTypesResponse = {
  event_id: '660e8400-e29b-41d4-a716-446655440001',
  ticket_types: apiMockTicketTypes,
}

const mockResaleResponse = {
  listings: [],
}

describe('EventShop Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches event on mount (getEvent called with eventId)', async () => {
    mockGetEvent.mockResolvedValue(apiMockEvent)
    mockGetTicketTypes.mockResolvedValue(mockTicketTypesResponse)
    mockGetResaleListings.mockResolvedValue(mockResaleResponse)

    renderWithProviders(<EventShop />)

    await waitFor(() => {
      expect(mockGetEvent).toHaveBeenCalledTimes(1)
    })
    expect(mockGetEvent).toHaveBeenCalledWith('660e8400-e29b-41d4-a716-446655440001')
  })

  it('fetches ticket types on mount after event is loaded', async () => {
    mockGetEvent.mockResolvedValue(apiMockEvent)
    mockGetTicketTypes.mockResolvedValue(mockTicketTypesResponse)
    mockGetResaleListings.mockResolvedValue(mockResaleResponse)

    renderWithProviders(<EventShop />)

    await waitFor(() => {
      expect(mockGetTicketTypes).toHaveBeenCalledTimes(1)
    })
    expect(mockGetTicketTypes).toHaveBeenCalledWith('660e8400-e29b-41d4-a716-446655440001')
  })

  it('renders ticket type names when loaded', async () => {
    mockGetEvent.mockResolvedValue(apiMockEvent)
    mockGetTicketTypes.mockResolvedValue(mockTicketTypesResponse)
    mockGetResaleListings.mockResolvedValue(mockResaleResponse)

    renderWithProviders(<EventShop />)

    await waitFor(() => {
      expect(screen.getByText('Early Bird')).toBeInTheDocument()
    })
    expect(screen.getByText('Standard')).toBeInTheDocument()
  })

  it('shows empty state when no ticket types are available', async () => {
    mockGetEvent.mockResolvedValue(apiMockEvent)
    mockGetTicketTypes.mockResolvedValue({ event_id: apiMockEvent.id, ticket_types: [] })
    mockGetResaleListings.mockResolvedValue(mockResaleResponse)

    renderWithProviders(<EventShop />)

    // Wait for the event to load and ticket types to resolve
    await waitFor(() => {
      expect(mockGetTicketTypes).toHaveBeenCalled()
    })
    // When no ticket types, the ticket list section should be empty (no ticket rows)
    await waitFor(() => {
      expect(screen.queryByText('Early Bird')).not.toBeInTheDocument()
      expect(screen.queryByText('Standard')).not.toBeInTheDocument()
    })
  })

  it('renders without crashing for unauthenticated user', async () => {
    mockGetEvent.mockResolvedValue(apiMockEvent)
    mockGetTicketTypes.mockResolvedValue(mockTicketTypesResponse)
    mockGetResaleListings.mockResolvedValue(mockResaleResponse)

    // renderWithProviders without authState means unauthenticated
    renderWithProviders(<EventShop />)

    // Page should render — event name should appear after loading
    await waitFor(() => {
      expect(screen.getByText('PSYCHOSOUND @ Artbar')).toBeInTheDocument()
    })
  })
})
