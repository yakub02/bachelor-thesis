// Test event data for DEVELOPMENT ONLY
// These IDs must match what's seeded in the ticketing-service database
//
// PRODUCTION: Replace these with real event IDs from your database
// or load events dynamically from the API instead of using hardcoded data

export const TEST_EVENT = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'PSYCHOSOUND 2025',
  date: '2025-08-15',
  time: '22:00',
  location: 'Industrial Zone, Prague',
  description: 'The ultimate techno experience. 12 hours of non-stop beats.',
  imageUrl: '/events/psychosound.jpg',
}

export const TEST_TICKET_TYPES = {
  earlyBird: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'EARLY BIRD',
    price_cents: 5000,
    currency: 'CZK',
  },
  standard: {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'STANDARD',
    price_cents: 7500,
    currency: 'CZK',
  },
}
