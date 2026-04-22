import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/test-utils'
import { Events } from './Events'

// Hoist mock functions so they are available inside vi.mock factories
const { mockGetEvents } = vi.hoisted(() => ({
  mockGetEvents: vi.fn(),
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
    getEvents: mockGetEvents,
    isAuthenticated: vi.fn(() => false),
    getCurrentUser: vi.fn(),
    setTokens: vi.fn(),
  },
}))

// API-compatible mock events (matching the Event interface from ravetureApi.ts)
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
    description: '3rd anniversary celebration',
    short_description: null,
    event_type: 'party',
    status: 'published',
    starts_at: '2026-07-17T21:00:00Z',
    ends_at: '2026-07-18T06:00:00Z',
    doors_open_at: null,
    venue_id: '550e8400-e29b-41d4-a716-446655440002',
    venue: { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Fuchs2', city: 'Praha' },
    cover_image_url: null,
    flyer_url: null,
    genres: ['Psytrance', 'Progressive'],
    is_featured: true,
    ticketing_enabled: true,
    external_ticket_url: null,
    min_age: 21,
    view_count: 0,
    interested_count: 5,
    organizer_id: 1,
    organizer: { id: 1, name: 'PSYCHOSOUND Team', slug: 'psychosound' },
    created_at: '2026-03-05T00:00:00Z',
    updated_at: '2026-03-22T15:30:00Z',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440003',
    name: 'Techno Night vol. 12',
    slug: 'techno-night-vol-12',
    description: 'Monthly techno party',
    short_description: null,
    event_type: 'party',
    status: 'published',
    starts_at: '2026-05-10T22:00:00Z',
    ends_at: '2026-05-11T05:00:00Z',
    doors_open_at: null,
    venue_id: '550e8400-e29b-41d4-a716-446655440002',
    venue: { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Fuchs2', city: 'Praha' },
    cover_image_url: null,
    flyer_url: null,
    genres: ['Techno'],
    is_featured: false,
    ticketing_enabled: false,
    external_ticket_url: null,
    min_age: 18,
    view_count: 0,
    interested_count: 0,
    organizer_id: 2,
    organizer: { id: 2, name: 'Techno Collective', slug: 'techno-collective' },
    created_at: '2026-03-10T00:00:00Z',
    updated_at: '2026-03-10T00:00:00Z',
  },
]

const mockApiResponse = {
  events: apiMockEvents,
  total: 3,
  pages: 1,
  page: 1,
  per_page: 12,
}

describe('Events Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls ravetureApi.getEvents on mount with default params', async () => {
    mockGetEvents.mockResolvedValue(mockApiResponse)

    renderWithProviders(<Events />)

    await waitFor(() => {
      expect(mockGetEvents).toHaveBeenCalledTimes(1)
    })
    expect(mockGetEvents).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, per_page: 12 })
    )
  })

  it('shows loading skeleton while fetching events', () => {
    // Never resolve so we stay in loading state
    mockGetEvents.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<Events />)

    // Loading skeleton: 6 pulsing list items are rendered
    const skeletonItems = document.querySelectorAll('.animate-pulse')
    expect(skeletonItems.length).toBeGreaterThan(0)
  })

  it('renders event names after successful API response', async () => {
    mockGetEvents.mockResolvedValue(mockApiResponse)

    renderWithProviders(<Events />)

    await waitFor(() => {
      expect(screen.getByText('PSYCHOSOUND @ Artbar')).toBeInTheDocument()
    })
    expect(screen.getByText('PSYCHOSOUND 3rd Anniversary')).toBeInTheDocument()
    expect(screen.getByText('Techno Night vol. 12')).toBeInTheDocument()
  })

  it('shows empty state when API returns no events', async () => {
    mockGetEvents.mockResolvedValue({ events: [], total: 0, pages: 1, page: 1, per_page: 12 })

    renderWithProviders(<Events />)

    await waitFor(() => {
      expect(screen.getByText(/Quiet week/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when API call fails (error handled silently)', async () => {
    mockGetEvents.mockRejectedValue(new Error('Network error'))

    renderWithProviders(<Events />)

    // After the rejected promise settles, loading should stop and empty state shown
    await waitFor(() => {
      expect(screen.getByText(/Quiet week/i)).toBeInTheDocument()
    })
  })
})
