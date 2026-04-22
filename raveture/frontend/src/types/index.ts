import type { ReactNode, ComponentType } from 'react'

// ============================================================================
// BASE TYPES
// ============================================================================

export interface BaseProps {
  className?: string
  children?: ReactNode
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

export interface NavLink {
  label: string
  href: string
}

export interface FooterLinkGroup {
  title: string
  links: NavLink[]
}

export interface SocialLink {
  label: string
  href: string
  icon?: ComponentType<{ className?: string }>
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface Event {
  id: string
  title: string
  location: string
  date: string
  bpm: number
  imageUrl: string
  description?: string
  artists?: string[]
  ticketPrice?: string
  time?: string
}

// ============================================================================
// FEATURE TYPES
// ============================================================================

export interface Feature {
  icon: string
  title: string
  description: string
  highlighted?: boolean
}

// ============================================================================
// MODULE TYPES
// ============================================================================

export interface PlatformModule {
  number: string
  title: string
  description: string
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export interface EventCardProps {
  eventId: string
  title: string
  location: string
  date: string
  bpm: number
  imageUrl: string
  className?: string
}

export interface FeatureCardProps {
  icon: string
  title: string
  description: string
  highlighted?: boolean
  className?: string
}

export interface ModuleCardProps {
  number: string
  title: string
  description: string
  className?: string
}

export interface SectionHeaderProps {
  tag?: string
  title: string
  linkText?: string
  linkHref?: string
  className?: string
}

// ============================================================================
// TICKETING API TYPES
// ============================================================================

export interface TicketType {
  id: string
  event_id: string
  name: string
  description: string
  price_cents: number
  currency: string
  quantity_total: number
  quantity_sold: number
  quantity_reserved: number
  quantity_available: number
  is_on_sale: boolean
  sale_starts_at: string | null
  sale_ends_at: string | null
  max_per_order: number
  resale_allowed: boolean
  resale_max_price_percent: number
  is_active: boolean
  version: number
  created_at: string
  updated_at: string
}

export interface TicketResaleListing {
  id: string
  asking_price_cents: number
  original_price_cents: number
  listed_at: string
}

export interface Ticket {
  id: string
  ticket_type_id: string
  order_id: string
  owner_id: string
  status: 'valid' | 'used' | 'invalidated' | 'listed' | 'transferred'
  issued_at: string
  used_at: string | null
  transferred_count: number
  // Extended fields populated by the API from ticket_type
  code?: string
  ticket_type_name?: string
  event_name?: string
  event_id?: string
  price_cents?: number
  currency?: string
  resale_allowed?: boolean
  resale_max_price_percent?: number
  resale_listing?: TicketResaleListing
}

export interface OrderItem {
  id: string
  ticket_type_id: string
  ticket_type_name: string
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
}

export interface Order {
  id: string
  reference: string
  user_id: string
  event_id: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'expired'
  subtotal_cents: number
  discount_cents: number
  discount_code_id?: string
  total_cents: number
  currency: string
  expires_at: string
  confirmed_at: string | null
  created_at: string
  items?: OrderItem[]
}

export interface ResaleListing {
  id: string
  ticket_id: string
  event_id: string
  asking_price_cents: number
  original_price_cents: number
  status: 'active' | 'sold' | 'cancelled' | 'expired'
  listed_at: string
  sold_at?: string | null
  // Populated from ticket → ticket_type for marketplace display
  ticket_type_name?: string
  currency?: string
}

export interface QRCodeData {
  ticket_id: string
  event_id: string
  qr_data: string
  signature: string
  status: string
}

export interface ValidationResult {
  result: 'valid' | 'already_used' | 'invalid_signature' | 'invalid_status' | 'wrong_event' | 'not_found'
  allowed: boolean
  message: string
  ticket_type?: string
}

export interface ValidationStats {
  event_id: string
  total_scans: number
  entries_granted: number
  rejected: number
  breakdown: {
    valid: number
    already_used: number
    invalid_signature: number
    invalid_status: number
    wrong_event: number
    not_found: number
  }
}

export interface ApiClient {
  id: string
  name: string
  is_active: boolean
  rate_limit_per_minute: number
  allowed_events: string[] | null
  created_at: string
}

export interface ApiError {
  error: string
  message: string
  request_id?: string
  details?: Array<{ field: string; message: string }>
}

// ============================================================================
// DISCOUNT CODE TYPES
// ============================================================================

export interface DiscountCode {
  id: string
  code: string
  event_id?: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  currency: string
  min_order_cents: number
  max_uses?: number
  current_uses: number
  uses_remaining?: number
  max_uses_per_user?: number
  valid_from?: string
  valid_until?: string
  is_active: boolean
  is_valid: boolean
  description?: string
  created_at: string
}

// ============================================================================
// ADMIN / ORGANIZER TYPES
// ============================================================================

export interface EventStats {
  event_id: string
  summary: {
    total_capacity: number
    total_sold: number
    total_reserved: number
    total_available: number
    total_revenue_cents: number
    total_discounts_cents: number
    net_revenue_cents: number
    total_checkins: number
    checkin_rate: number
  }
  orders: {
    confirmed: number
    pending: number
    cancelled: number
    expired: number
    refunded: number
  }
  validations: Record<string, number>
  by_ticket_type: Array<{
    id: string
    name: string
    price_cents: number
    quantity_total: number
    quantity_sold: number
    quantity_reserved: number
    quantity_available: number
    revenue_cents: number
    is_active: boolean
    is_on_sale: boolean
    sale_starts_at?: string
    sale_ends_at?: string
  }>
  daily_sales: Array<{
    date: string
    orders: number
    revenue_cents: number
  }>
  recent_orders: Order[]
}

export interface Buyer {
  user_id: string
  tickets_count: number
  order_count: number
  total_spent_cents: number
  first_purchase?: string
  last_purchase?: string
  orders: Order[]
}

export interface BuyersList {
  buyers: Buyer[]
  total: number
  page: number
  per_page: number
  pages: number
}
