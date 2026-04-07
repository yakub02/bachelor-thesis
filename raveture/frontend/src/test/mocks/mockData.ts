/**
 * Mock Data for RAVETURE Tests
 *
 * This file contains realistic mock data for testing all components and pages.
 * Data is modeled after the actual API responses and database structure.
 */

import type { Event, TicketType, Order, Ticket, Venue } from '@/types';

/**
 * Mock Users
 */
export const mockUsers = {
  regular: {
    id: 1,
    email: 'user@example.com',
    name: 'John Doe',
    is_organizer: false,
    created_at: '2026-01-01T00:00:00Z',
  },
  organizer: {
    id: 2,
    email: 'organizer@psychosound.cz',
    name: 'PSYCHOSOUND Team',
    is_organizer: true,
    organizer_id: 1,
    created_at: '2026-01-01T00:00:00Z',
  },
  admin: {
    id: 3,
    email: 'admin@raveture.com',
    name: 'Admin User',
    is_organizer: true,
    is_admin: true,
    organizer_id: 2,
    created_at: '2026-01-01T00:00:00Z',
  },
};

/**
 * Mock Venues
 */
export const mockVenues: Venue[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Artbar',
    slug: 'artbar-prague',
    address: 'Opatovická 160/18',
    city: 'Praha',
    country: 'Česká republika',
    capacity: 150,
    description: 'Underground bar v centru Prahy',
    website: 'https://artbar.cz',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Fuchs2',
    slug: 'fuchs2-prague',
    address: 'Běhradská 329/18',
    city: 'Praha',
    country: 'Česká republika',
    capacity: 300,
    description: 'Ikonický underground klub',
    website: 'https://fuchs2.cz',
    created_at: '2026-01-01T00:00:00Z',
  },
];

/**
 * Mock Events
 */
export const mockEvents: Event[] = [
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    title: 'PSYCHOSOUND @ Artbar',
    slug: 'psychosound-artbar-2026',
    description:
      'Underground psytrance večer v intimním prostředí Artbaru. Lineup: DJ Quantum, Luna Waves, Cosmic Dreamer',
    cover_image: 'https://example.com/events/psychosound-artbar.jpg',
    start_date: '2026-04-24T20:00:00Z',
    end_date: '2026-04-25T04:00:00Z',
    venue_id: mockVenues[0].id,
    venue: mockVenues[0],
    organizer_id: 1,
    organizer: {
      id: 1,
      name: 'PSYCHOSOUND Team',
      slug: 'psychosound',
    },
    genre: 'Psytrance',
    min_age: 18,
    is_featured: true,
    status: 'published',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-20T10:00:00Z',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002',
    title: 'PSYCHOSOUND 3rd Anniversary',
    slug: 'psychosound-3rd-anniversary',
    description:
      'Oslava 3 let PSYCHOSOUND kolektivu! Velkolepý lineup s hosty ze zahraničí. Očekávejte nejlepší psytrance a progressive beats.',
    cover_image: 'https://example.com/events/psychosound-anniversary.jpg',
    start_date: '2026-07-17T21:00:00Z',
    end_date: '2026-07-18T06:00:00Z',
    venue_id: mockVenues[1].id,
    venue: mockVenues[1],
    organizer_id: 1,
    organizer: {
      id: 1,
      name: 'PSYCHOSOUND Team',
      slug: 'psychosound',
    },
    genre: 'Psytrance',
    min_age: 21,
    is_featured: true,
    status: 'published',
    created_at: '2026-03-05T00:00:00Z',
    updated_at: '2026-03-22T15:30:00Z',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440003',
    title: 'Techno Night vol. 12',
    slug: 'techno-night-vol-12',
    description: 'Měsíční techno party s lokálními DJs',
    cover_image: 'https://example.com/events/techno-night.jpg',
    start_date: '2026-05-10T22:00:00Z',
    end_date: '2026-05-11T05:00:00Z',
    venue_id: mockVenues[1].id,
    venue: mockVenues[1],
    organizer_id: 2,
    organizer: {
      id: 2,
      name: 'Techno Collective',
      slug: 'techno-collective',
    },
    genre: 'Techno',
    min_age: 18,
    is_featured: false,
    status: 'published',
    created_at: '2026-03-10T00:00:00Z',
    updated_at: '2026-03-10T00:00:00Z',
  },
];

/**
 * Mock Ticket Types
 */
export const mockTicketTypes: TicketType[] = [
  {
    id: '770e8400-e29b-41d4-a716-446655440001',
    event_id: mockEvents[0].id,
    name: 'Early Bird',
    description: 'Zvýhodněná vstupenka pro první kupce',
    price: 200.0,
    currency: 'CZK',
    quantity_total: 50,
    quantity_available: 25,
    quantity_sold: 25,
    is_active: true,
    sale_starts_at: '2026-03-01T00:00:00Z',
    sale_ends_at: '2026-04-20T23:59:59Z',
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440002',
    event_id: mockEvents[0].id,
    name: 'Standard',
    description: 'Standardní vstupenka',
    price: 350.0,
    currency: 'CZK',
    quantity_total: 200,
    quantity_available: 180,
    quantity_sold: 20,
    is_active: true,
    sale_starts_at: '2026-03-01T00:00:00Z',
    sale_ends_at: '2026-04-24T20:00:00Z',
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440003',
    event_id: mockEvents[0].id,
    name: 'VIP',
    description: 'VIP vstupenka s prioritním vstupem a drinkem zdarma',
    price: 500.0,
    currency: 'CZK',
    quantity_total: 30,
    quantity_available: 28,
    quantity_sold: 2,
    is_active: true,
    sale_starts_at: '2026-03-01T00:00:00Z',
    sale_ends_at: '2026-04-24T20:00:00Z',
    created_at: '2026-03-01T00:00:00Z',
  },
];

/**
 * Mock Orders
 */
export const mockOrders: Order[] = [
  {
    id: '880e8400-e29b-41d4-a716-446655440001',
    order_number: 'RAV-20260324-0001',
    event_id: mockEvents[0].id,
    user_id: mockUsers.regular.id,
    user_email: mockUsers.regular.email,
    user_name: mockUsers.regular.name,
    total_amount: 700.0,
    currency: 'CZK',
    status: 'confirmed',
    payment_status: 'paid',
    expires_at: null,
    confirmed_at: '2026-03-24T10:00:00Z',
    created_at: '2026-03-24T09:55:00Z',
    tickets: [],
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440002',
    order_number: 'RAV-20260324-0002',
    event_id: mockEvents[0].id,
    user_id: mockUsers.regular.id,
    user_email: mockUsers.regular.email,
    user_name: mockUsers.regular.name,
    total_amount: 350.0,
    currency: 'CZK',
    status: 'pending',
    payment_status: 'pending',
    expires_at: '2026-03-24T11:10:00Z',
    confirmed_at: null,
    created_at: '2026-03-24T10:55:00Z',
    tickets: [],
  },
];

/**
 * Mock Tickets
 */
export const mockTickets: Ticket[] = [
  {
    id: '990e8400-e29b-41d4-a716-446655440001',
    order_id: mockOrders[0].id,
    event_id: mockEvents[0].id,
    ticket_type_id: mockTicketTypes[1].id,
    ticket_type_name: mockTicketTypes[1].name,
    ticket_number: 'RAV-20260324-0001-001',
    price_paid: 350.0,
    currency: 'CZK',
    status: 'valid',
    qr_code: 'mock-qr-code-data-1',
    holder_name: mockUsers.regular.name,
    holder_email: mockUsers.regular.email,
    checked_in_at: null,
    created_at: '2026-03-24T10:00:00Z',
    event: mockEvents[0],
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440002',
    order_id: mockOrders[0].id,
    event_id: mockEvents[0].id,
    ticket_type_id: mockTicketTypes[1].id,
    ticket_type_name: mockTicketTypes[1].name,
    ticket_number: 'RAV-20260324-0001-002',
    price_paid: 350.0,
    currency: 'CZK',
    status: 'valid',
    qr_code: 'mock-qr-code-data-2',
    holder_name: mockUsers.regular.name,
    holder_email: mockUsers.regular.email,
    checked_in_at: null,
    created_at: '2026-03-24T10:00:00Z',
    event: mockEvents[0],
  },
];

/**
 * Mock Discount Codes
 */
export const mockDiscountCodes = [
  {
    id: 'aa0e8400-e29b-41d4-a716-446655440001',
    code: 'EARLY2026',
    event_id: mockEvents[0].id,
    discount_type: 'percentage',
    discount_value: 15.0,
    max_uses: 50,
    uses_count: 12,
    valid_from: '2026-03-01T00:00:00Z',
    valid_until: '2026-03-31T23:59:59Z',
    is_active: true,
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'aa0e8400-e29b-41d4-a716-446655440002',
    code: 'VIP100',
    event_id: mockEvents[0].id,
    discount_type: 'fixed',
    discount_value: 100.0,
    max_uses: 10,
    uses_count: 3,
    valid_from: '2026-03-01T00:00:00Z',
    valid_until: '2026-04-24T20:00:00Z',
    is_active: true,
    created_at: '2026-03-05T00:00:00Z',
  },
];

/**
 * Mock Event Statistics
 */
export const mockEventStats = {
  event_id: mockEvents[0].id,
  total_revenue: 42350.0,
  currency: 'CZK',
  tickets_sold: 127,
  tickets_available: 153,
  tickets_total: 280,
  orders_confirmed: 98,
  orders_pending: 5,
  orders_cancelled: 3,
  ticket_types: [
    {
      ticket_type_id: mockTicketTypes[0].id,
      ticket_type_name: mockTicketTypes[0].name,
      quantity_sold: 50,
      quantity_available: 0,
      revenue: 10000.0,
    },
    {
      ticket_type_id: mockTicketTypes[1].id,
      ticket_type_name: mockTicketTypes[1].name,
      quantity_sold: 75,
      quantity_available: 125,
      revenue: 26250.0,
    },
    {
      ticket_type_id: mockTicketTypes[2].id,
      ticket_type_name: mockTicketTypes[2].name,
      quantity_sold: 2,
      quantity_available: 28,
      revenue: 1000.0,
    },
  ],
  daily_sales: [
    {
      date: '2026-03-24',
      tickets_sold: 15,
      revenue: 5250.0,
    },
    {
      date: '2026-03-23',
      tickets_sold: 22,
      revenue: 7700.0,
    },
  ],
};

/**
 * Helper function to get mock data by ID
 */
export const getMockEvent = (id: string) =>
  mockEvents.find((event) => event.id === id);

export const getMockTicketType = (id: string) =>
  mockTicketTypes.find((tt) => tt.id === id);

export const getMockOrder = (id: string) =>
  mockOrders.find((order) => order.id === id);

export const getMockTicket = (id: string) =>
  mockTickets.find((ticket) => ticket.id === id);

export const getMockVenue = (id: string) =>
  mockVenues.find((venue) => venue.id === id);
