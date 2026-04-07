import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Input, Select, TextArea } from '@/components/ui'
import { ticketingApi, getApiBaseUrl } from '@/services'
import { cn } from '@/utils'
import type {
  TicketType,
  Ticket,
  Order,
  ResaleListing,
  QRCodeData,
  ValidationResult,
  ValidationStats,
  ApiClient,
  ApiError,
} from '@/types'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function formatError(err: unknown): ApiError {
  if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
    return {
      error: 'Network Error',
      message: 'Could not connect to the ticketing service. Make sure it is running on the correct port.',
    }
  }
  return err as ApiError
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface ResponseDisplayProps {
  title: string
  data: unknown
  error?: ApiError | null
  loading?: boolean
}

function ResponseDisplay({ title, data, error, loading }: ResponseDisplayProps) {
  return (
    <div className="mt-4">
      <div className="text-xs font-mono text-text-muted uppercase mb-2">{title}</div>
      <div
        className={cn(
          'p-4 border font-mono text-xs overflow-auto max-h-64',
          error ? 'border-error bg-error/10' : 'border-border-grey bg-graphite'
        )}
      >
        {loading ? (
          <span className="text-text-muted">Loading...</span>
        ) : error ? (
          <pre className="text-error whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
        ) : data ? (
          <pre className="text-success whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        ) : (
          <span className="text-text-muted">No response yet</span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// QUICK TOOLS SECTION
// ============================================================================

function QuickToolsSection() {
  const [generatedUUIDs, setGeneratedUUIDs] = useState<string[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleGenerateUUID = () => {
    setGeneratedUUIDs([generateUUID(), ...generatedUUIDs.slice(0, 9)])
  }

  const handleCopy = async (uuid: string, index: number) => {
    await navigator.clipboard.writeText(uuid)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  return (
    <Section title="Quick Tools" icon="build" defaultOpen={true}>
      <div className="space-y-4">
        <div>
          <h4 className="font-mono text-xs uppercase text-primary mb-3">UUID Generator</h4>
          <p className="text-text-secondary text-sm mb-3">
            Generate test UUIDs for event IDs, user IDs, etc. Click to copy.
          </p>
          <Button onClick={handleGenerateUUID} size="sm">
            Generate UUID
          </Button>
          {generatedUUIDs.length > 0 && (
            <div className="mt-3 space-y-1">
              {generatedUUIDs.map((uuid, i) => (
                <button
                  key={i}
                  onClick={() => handleCopy(uuid, i)}
                  className="w-full text-left font-mono text-xs p-2 bg-graphite border border-border-grey hover:border-primary transition-colors flex items-center justify-between"
                >
                  <span>{uuid}</span>
                  <span className="text-text-muted">
                    {copiedIndex === i ? 'Copied!' : 'Click to copy'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border-grey pt-4">
          <h4 className="font-mono text-xs uppercase text-primary mb-3">Test Workflow</h4>
          <ol className="text-sm text-text-secondary space-y-2 list-decimal list-inside">
            <li>Generate a UUID for your test event</li>
            <li>Set up authentication (JWT or API Key)</li>
            <li>Create a ticket type for the event</li>
            <li>Create an order and confirm it to get tickets</li>
            <li>Test QR code generation and validation</li>
            <li>Try listing a ticket for resale</li>
          </ol>
        </div>
      </div>
    </Section>
  )
}

interface SectionProps {
  title: string
  icon: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card hover={false} className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-graphite transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">{icon}</span>
          <span className="font-mono text-sm uppercase font-bold">{title}</span>
        </div>
        <span className="material-symbols-outlined text-text-muted">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {isOpen && <div className="p-4 border-t border-border-grey">{children}</div>}
    </Card>
  )
}

// ============================================================================
// AUTH SECTION
// ============================================================================

interface AuthSectionProps {
  onAuthChange: (auth: { type: 'jwt' | 'apiKey'; token: string; userId?: string } | null) => void
}

function AuthSection({ onAuthChange }: AuthSectionProps) {
  const [authType, setAuthType] = useState<'jwt' | 'apiKey'>('jwt')
  const [token, setToken] = useState('')
  const [userId, setUserId] = useState('')
  const [isApplied, setIsApplied] = useState(false)

  const handleApply = () => {
    if (!token) {
      onAuthChange(null)
      setIsApplied(false)
      return
    }
    onAuthChange({
      type: authType,
      token,
      userId: authType === 'apiKey' ? userId : undefined,
    })
    setIsApplied(true)
  }

  const handleClear = () => {
    setToken('')
    setUserId('')
    onAuthChange(null)
    setIsApplied(false)
  }

  return (
    <Section title="Authentication" icon="key" defaultOpen={true}>
      {isApplied && (
        <div className="mb-4 p-3 border border-success bg-success/10 flex items-center gap-2">
          <span className="material-symbols-outlined text-success">check_circle</span>
          <span className="text-success font-mono text-sm">
            {authType === 'jwt' ? 'JWT Token' : 'API Key'} applied successfully
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Auth Type"
          value={authType}
          onChange={(e) => {
            setAuthType(e.target.value as 'jwt' | 'apiKey')
            setIsApplied(false)
          }}
          options={[
            { value: 'jwt', label: 'JWT Token' },
            { value: 'apiKey', label: 'API Key' },
          ]}
        />
        <Input
          label={authType === 'jwt' ? 'JWT Token' : 'API Key'}
          value={token}
          onChange={(e) => {
            setToken(e.target.value)
            setIsApplied(false)
          }}
          placeholder={authType === 'jwt' ? 'eyJhbGc...' : 'rt_live...'}
        />
        {authType === 'apiKey' && (
          <Input
            label="User ID (X-User-ID)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="UUID of the user"
          />
        )}
      </div>
      <div className="flex gap-2 mt-4">
        <Button onClick={handleApply} size="sm">
          Apply Auth
        </Button>
        <Button onClick={handleClear} variant="outline" size="sm">
          Clear Auth
        </Button>
      </div>
    </Section>
  )
}

// ============================================================================
// HEALTH CHECK SECTION
// ============================================================================

function HealthCheckSection() {
  const [response, setResponse] = useState<{ status: string; service: string; version: string } | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCheck = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ticketingApi.healthCheck()
      setResponse(data)
    } catch (err) {
      setError(formatError(err))
      setResponse(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section title="Health Check" icon="favorite">
      <p className="text-text-secondary text-sm mb-4">
        Check if the ticketing service is running and healthy.
      </p>
      <Button onClick={handleCheck} size="sm" disabled={loading}>
        {loading ? 'Checking...' : 'Check Health'}
      </Button>
      <ResponseDisplay title="Response" data={response} error={error} loading={loading} />
    </Section>
  )
}

// ============================================================================
// TICKET TYPES SECTION
// ============================================================================

function TicketTypesSection() {
  const [eventId, setEventId] = useState('')
  const [ticketTypes, setTicketTypes] = useState<TicketType[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)

  // Create ticket type form
  const [createData, setCreateData] = useState({
    event_id: '',
    name: '',
    description: '',
    price_cents: 5000,
    currency: 'CZK',
    quantity_total: 100,
    max_per_order: 4,
    resale_allowed: true,
    resale_max_price_percent: 110,
  })
  const [createResponse, setCreateResponse] = useState<TicketType | null>(null)
  const [createError, setCreateError] = useState<ApiError | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  const handleFetch = async () => {
    if (!eventId) return
    setLoading(true)
    setError(null)
    try {
      const data = await ticketingApi.getTicketTypes(eventId)
      setTicketTypes(data.ticket_types)
    } catch (err) {
      setError(formatError(err))
      setTicketTypes(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setCreateLoading(true)
    setCreateError(null)
    try {
      const data = await ticketingApi.createTicketType({
        ...createData,
        price_cents: Number(createData.price_cents),
        quantity_total: Number(createData.quantity_total),
        max_per_order: Number(createData.max_per_order),
        resale_max_price_percent: Number(createData.resale_max_price_percent),
      })
      setCreateResponse(data)
    } catch (err) {
      setCreateError(formatError(err))
      setCreateResponse(null)
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <Section title="Ticket Types" icon="confirmation_number">
      <div className="space-y-6">
        {/* List ticket types */}
        <div>
          <h4 className="font-mono text-xs uppercase text-primary mb-3">List Ticket Types</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Event ID (UUID)"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleFetch} size="sm" disabled={loading || !eventId}>
              Fetch
            </Button>
          </div>
          <ResponseDisplay title="Ticket Types" data={ticketTypes} error={error} loading={loading} />
        </div>

        {/* Create ticket type */}
        <div className="border-t border-border-grey pt-6">
          <h4 className="font-mono text-xs uppercase text-primary mb-3">Create Ticket Type (Admin)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Event ID"
              value={createData.event_id}
              onChange={(e) => setCreateData({ ...createData, event_id: e.target.value })}
              placeholder="UUID"
            />
            <Input
              label="Name"
              value={createData.name}
              onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
              placeholder="Early Bird"
            />
            <Input
              label="Price (cents)"
              type="number"
              value={createData.price_cents}
              onChange={(e) => setCreateData({ ...createData, price_cents: Number(e.target.value) })}
            />
            <Input
              label="Currency"
              value={createData.currency}
              onChange={(e) => setCreateData({ ...createData, currency: e.target.value })}
            />
            <Input
              label="Quantity Total"
              type="number"
              value={createData.quantity_total}
              onChange={(e) => setCreateData({ ...createData, quantity_total: Number(e.target.value) })}
            />
            <Input
              label="Max Per Order"
              type="number"
              value={createData.max_per_order}
              onChange={(e) => setCreateData({ ...createData, max_per_order: Number(e.target.value) })}
            />
            <Input
              label="Resale Max Price %"
              type="number"
              value={createData.resale_max_price_percent}
              onChange={(e) => setCreateData({ ...createData, resale_max_price_percent: Number(e.target.value) })}
            />
            <Select
              label="Resale Allowed"
              value={createData.resale_allowed ? 'true' : 'false'}
              onChange={(e) => setCreateData({ ...createData, resale_allowed: e.target.value === 'true' })}
              options={[
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
              ]}
            />
          </div>
          <TextArea
            label="Description"
            value={createData.description}
            onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
            placeholder="Limited early bird tickets..."
            className="mt-4"
          />
          <Button onClick={handleCreate} size="sm" className="mt-4" disabled={createLoading}>
            Create Ticket Type
          </Button>
          <ResponseDisplay title="Created Type" data={createResponse} error={createError} loading={createLoading} />
        </div>
      </div>
    </Section>
  )
}

// ============================================================================
// ORDERS SECTION
// ============================================================================

function OrdersSection() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)

  // Create order
  const [createData, setCreateData] = useState({
    event_id: '',
    ticket_type_id: '',
    quantity: 1,
  })
  const [createResponse, setCreateResponse] = useState<{ order: Order } | null>(null)
  const [createError, setCreateError] = useState<ApiError | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  // Order actions
  const [orderId, setOrderId] = useState('')
  const [actionResponse, setActionResponse] = useState<unknown>(null)
  const [actionError, setActionError] = useState<ApiError | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const handleFetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ticketingApi.getMyOrders()
      setOrders(data.orders)
    } catch (err) {
      setError(formatError(err))
      setOrders(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrder = async () => {
    setCreateLoading(true)
    setCreateError(null)
    try {
      const data = await ticketingApi.createOrder({
        event_id: createData.event_id,
        items: [{ ticket_type_id: createData.ticket_type_id, quantity: Number(createData.quantity) }],
      })
      setCreateResponse(data)
    } catch (err) {
      setCreateError(formatError(err))
      setCreateResponse(null)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleConfirmOrder = async () => {
    if (!orderId) return
    setActionLoading(true)
    setActionError(null)
    try {
      const data = await ticketingApi.confirmOrder(orderId, { payment_method: 'card', payment_reference: 'test_txn_123' })
      setActionResponse(data)
    } catch (err) {
      setActionError(formatError(err))
      setActionResponse(null)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!orderId) return
    setActionLoading(true)
    setActionError(null)
    try {
      const data = await ticketingApi.cancelOrder(orderId)
      setActionResponse(data)
    } catch (err) {
      setActionError(formatError(err))
      setActionResponse(null)
    } finally {
      setActionLoading(false)
    }
  }

  const handleGetOrder = async () => {
    if (!orderId) return
    setActionLoading(true)
    setActionError(null)
    try {
      const data = await ticketingApi.getOrder(orderId)
      setActionResponse(data)
    } catch (err) {
      setActionError(formatError(err))
      setActionResponse(null)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Section title="Orders" icon="shopping_cart">
      <div className="space-y-6">
        {/* List orders */}
        <div>
          <h4 className="font-mono text-xs uppercase text-primary mb-3">My Orders</h4>
          <Button onClick={handleFetchOrders} size="sm" disabled={loading}>
            Fetch My Orders
          </Button>
          <ResponseDisplay title="Orders" data={orders} error={error} loading={loading} />
        </div>

        {/* Create order */}
        <div className="border-t border-border-grey pt-6">
          <h4 className="font-mono text-xs uppercase text-primary mb-3">Create Order</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Event ID"
              value={createData.event_id}
              onChange={(e) => setCreateData({ ...createData, event_id: e.target.value })}
              placeholder="UUID"
            />
            <Input
              label="Ticket Type ID"
              value={createData.ticket_type_id}
              onChange={(e) => setCreateData({ ...createData, ticket_type_id: e.target.value })}
              placeholder="UUID"
            />
            <Input
              label="Quantity"
              type="number"
              value={createData.quantity}
              onChange={(e) => setCreateData({ ...createData, quantity: Number(e.target.value) })}
            />
          </div>
          <Button onClick={handleCreateOrder} size="sm" className="mt-4" disabled={createLoading}>
            Create Order
          </Button>
          <ResponseDisplay title="Created Order" data={createResponse} error={createError} loading={createLoading} />
        </div>

        {/* Order actions */}
        <div className="border-t border-border-grey pt-6">
          <h4 className="font-mono text-xs uppercase text-primary mb-3">Order Actions</h4>
          <Input
            label="Order ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="UUID"
            className="mb-4"
          />
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleGetOrder} size="sm" variant="outline" disabled={actionLoading || !orderId}>
              Get Order
            </Button>
            <Button onClick={handleConfirmOrder} size="sm" disabled={actionLoading || !orderId}>
              Confirm Order
            </Button>
            <Button onClick={handleCancelOrder} size="sm" variant="ghost" disabled={actionLoading || !orderId}>
              Cancel Order
            </Button>
          </div>
          <ResponseDisplay title="Action Response" data={actionResponse} error={actionError} loading={actionLoading} />
        </div>
      </div>
    </Section>
  )
}

// ============================================================================
// TICKETS SECTION
// ============================================================================

function TicketsSection() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)

  const [ticketId, setTicketId] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [actionResponse, setActionResponse] = useState<unknown>(null)
  const [actionError, setActionError] = useState<ApiError | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [qrData, setQrData] = useState<QRCodeData | null>(null)
  const [qrError, setQrError] = useState<ApiError | null>(null)
  const [qrLoading, setQrLoading] = useState(false)

  const handleFetchTickets = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ticketingApi.getMyTickets()
      setTickets(data.tickets)
    } catch (err) {
      setError(formatError(err))
      setTickets(null)
    } finally {
      setLoading(false)
    }
  }

  const handleGetTicket = async () => {
    if (!ticketId) return
    setActionLoading(true)
    setActionError(null)
    try {
      const data = await ticketingApi.getTicket(ticketId)
      setActionResponse(data)
    } catch (err) {
      setActionError(formatError(err))
      setActionResponse(null)
    } finally {
      setActionLoading(false)
    }
  }

  const handleGetQR = async () => {
    if (!ticketId) return
    setQrLoading(true)
    setQrError(null)
    try {
      const data = await ticketingApi.getTicketQR(ticketId)
      setQrData(data)
    } catch (err) {
      setQrError(formatError(err))
      setQrData(null)
    } finally {
      setQrLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!ticketId || !recipientId) return
    setActionLoading(true)
    setActionError(null)
    try {
      const data = await ticketingApi.transferTicket(ticketId, recipientId)
      setActionResponse(data)
    } catch (err) {
      setActionError(formatError(err))
      setActionResponse(null)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Section title="Tickets" icon="local_activity">
      <div className="space-y-6">
        {/* List tickets */}
        <div>
          <h4 className="font-mono text-xs uppercase text-primary mb-3">My Tickets</h4>
          <Button onClick={handleFetchTickets} size="sm" disabled={loading}>
            Fetch My Tickets
          </Button>
          <ResponseDisplay title="Tickets" data={tickets} error={error} loading={loading} />
        </div>

        {/* Ticket actions */}
        <div className="border-t border-border-grey pt-6">
          <h4 className="font-mono text-xs uppercase text-primary mb-3">Ticket Actions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Ticket ID"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="UUID"
            />
            <Input
              label="Recipient ID (for transfer)"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              placeholder="UUID"
            />
          </div>
          <div className="flex gap-2 flex-wrap mt-4">
            <Button onClick={handleGetTicket} size="sm" variant="outline" disabled={actionLoading || !ticketId}>
              Get Ticket
            </Button>
            <Button onClick={handleGetQR} size="sm" variant="outline" disabled={qrLoading || !ticketId}>
              Get QR Code
            </Button>
            <Button onClick={handleTransfer} size="sm" disabled={actionLoading || !ticketId || !recipientId}>
              Transfer Ticket
            </Button>
          </div>
          <ResponseDisplay title="Action Response" data={actionResponse} error={actionError} loading={actionLoading} />
          <ResponseDisplay title="QR Code Data" data={qrData} error={qrError} loading={qrLoading} />
        </div>
      </div>
    </Section>
  )
}

// ============================================================================
// VALIDATION SECTION
// ============================================================================

function ValidationSection() {
  const [scanData, setScanData] = useState({
    ticket_id: '',
    event_id: '',
    signature: '',
    location: 'Main Entrance',
  })
  const [scanResult, setScanResult] = useState<ValidationResult | null>(null)
  const [scanError, setScanError] = useState<ApiError | null>(null)
  const [scanLoading, setScanLoading] = useState(false)

  const [statsEventId, setStatsEventId] = useState('')
  const [stats, setStats] = useState<ValidationStats | null>(null)
  const [statsError, setStatsError] = useState<ApiError | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const handleScan = async () => {
    setScanLoading(true)
    setScanError(null)
    try {
      const data = await ticketingApi.scanTicket(scanData)
      setScanResult(data)
    } catch (err) {
      setScanError(formatError(err))
      setScanResult(null)
    } finally {
      setScanLoading(false)
    }
  }

  const handleGetStats = async () => {
    if (!statsEventId) return
    setStatsLoading(true)
    setStatsError(null)
    try {
      const data = await ticketingApi.getValidationStats(statsEventId)
      setStats(data)
    } catch (err) {
      setStatsError(formatError(err))
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }

  return (
    <Section title="Door Validation" icon="qr_code_scanner">
      <div className="space-y-6">
        {/* Scan ticket */}
        <div>
          <h4 className="font-mono text-xs uppercase text-primary mb-3">Scan Ticket (Door Entry)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Ticket ID"
              value={scanData.ticket_id}
              onChange={(e) => setScanData({ ...scanData, ticket_id: e.target.value })}
              placeholder="UUID"
            />
            <Input
              label="Event ID"
              value={scanData.event_id}
              onChange={(e) => setScanData({ ...scanData, event_id: e.target.value })}
              placeholder="UUID"
            />
            <Input
              label="Signature (from QR)"
              value={scanData.signature}
              onChange={(e) => setScanData({ ...scanData, signature: e.target.value })}
              placeholder="64-character hex string"
            />
            <Input
              label="Location"
              value={scanData.location}
              onChange={(e) => setScanData({ ...scanData, location: e.target.value })}
            />
          </div>
          <Button onClick={handleScan} size="sm" className="mt-4" disabled={scanLoading}>
            Scan Ticket
          </Button>
          {scanResult && (
            <div
              className={cn(
                'mt-4 p-4 border font-mono text-lg font-bold',
                scanResult.allowed ? 'border-success bg-success/10 text-success' : 'border-error bg-error/10 text-error'
              )}
            >
              {scanResult.message}
              {scanResult.ticket_type && (
                <span className="text-sm text-text-secondary ml-2">({scanResult.ticket_type})</span>
              )}
            </div>
          )}
          <ResponseDisplay title="Scan Result" data={scanResult} error={scanError} loading={scanLoading} />
        </div>

        {/* Stats */}
        <div className="border-t border-border-grey pt-6">
          <h4 className="font-mono text-xs uppercase text-primary mb-3">Validation Statistics</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Event ID (UUID)"
              value={statsEventId}
              onChange={(e) => setStatsEventId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleGetStats} size="sm" disabled={statsLoading || !statsEventId}>
              Get Stats
            </Button>
          </div>
          {stats && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="p-4 border border-border-grey text-center">
                <div className="text-2xl font-bold text-primary">{stats.total_scans}</div>
                <div className="text-xs text-text-muted uppercase">Total Scans</div>
              </div>
              <div className="p-4 border border-success text-center">
                <div className="text-2xl font-bold text-success">{stats.entries_granted}</div>
                <div className="text-xs text-text-muted uppercase">Entries Granted</div>
              </div>
              <div className="p-4 border border-error text-center">
                <div className="text-2xl font-bold text-error">{stats.rejected}</div>
                <div className="text-xs text-text-muted uppercase">Rejected</div>
              </div>
            </div>
          )}
          <ResponseDisplay title="Stats" data={stats} error={statsError} loading={statsLoading} />
        </div>
      </div>
    </Section>
  )
}

// ============================================================================
// RESALE SECTION
// ============================================================================

function ResaleSection() {
  const [eventId, setEventId] = useState('')
  const [listings, setListings] = useState<ResaleListing[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)

  const [listData, setListData] = useState({ ticket_id: '', asking_price_cents: 5500 })
  const [listResponse, setListResponse] = useState<unknown>(null)
  const [listError, setListError] = useState<ApiError | null>(null)
  const [listLoading, setListLoading] = useState(false)

  const [listingId, setListingId] = useState('')
  const [actionResponse, setActionResponse] = useState<unknown>(null)
  const [actionError, setActionError] = useState<ApiError | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const handleFetchListings = async () => {
    if (!eventId) return
    setLoading(true)
    setError(null)
    try {
      const data = await ticketingApi.getResaleListings(eventId)
      setListings(data.listings)
    } catch (err) {
      setError(formatError(err))
      setListings(null)
    } finally {
      setLoading(false)
    }
  }

  const handleListTicket = async () => {
    setListLoading(true)
    setListError(null)
    try {
      const data = await ticketingApi.listTicketForResale(listData.ticket_id, Number(listData.asking_price_cents))
      setListResponse(data)
    } catch (err) {
      setListError(formatError(err))
      setListResponse(null)
    } finally {
      setListLoading(false)
    }
  }

  const handleCancelListing = async () => {
    if (!listingId) return
    setActionLoading(true)
    setActionError(null)
    try {
      const data = await ticketingApi.cancelResaleListing(listingId)
      setActionResponse(data)
    } catch (err) {
      setActionError(formatError(err))
      setActionResponse(null)
    } finally {
      setActionLoading(false)
    }
  }

  const handleBuyListing = async () => {
    if (!listingId) return
    setActionLoading(true)
    setActionError(null)
    try {
      const data = await ticketingApi.buyResaleTicket(listingId)
      setActionResponse(data)
    } catch (err) {
      setActionError(formatError(err))
      setActionResponse(null)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Section title="Resale Marketplace" icon="storefront">
      <div className="space-y-6">
        {/* Browse listings */}
        <div>
          <h4 className="font-mono text-xs uppercase text-primary mb-3">Browse Listings</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Event ID (UUID)"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleFetchListings} size="sm" disabled={loading || !eventId}>
              Fetch Listings
            </Button>
          </div>
          <ResponseDisplay title="Listings" data={listings} error={error} loading={loading} />
        </div>

        {/* List ticket for resale */}
        <div className="border-t border-border-grey pt-6">
          <h4 className="font-mono text-xs uppercase text-primary mb-3">List Ticket for Resale</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Ticket ID"
              value={listData.ticket_id}
              onChange={(e) => setListData({ ...listData, ticket_id: e.target.value })}
              placeholder="UUID"
            />
            <Input
              label="Asking Price (cents)"
              type="number"
              value={listData.asking_price_cents}
              onChange={(e) => setListData({ ...listData, asking_price_cents: Number(e.target.value) })}
            />
          </div>
          <Button onClick={handleListTicket} size="sm" className="mt-4" disabled={listLoading}>
            List for Resale
          </Button>
          <ResponseDisplay title="List Response" data={listResponse} error={listError} loading={listLoading} />
        </div>

        {/* Listing actions */}
        <div className="border-t border-border-grey pt-6">
          <h4 className="font-mono text-xs uppercase text-primary mb-3">Listing Actions</h4>
          <Input
            label="Listing ID"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            placeholder="UUID"
            className="mb-4"
          />
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleBuyListing} size="sm" disabled={actionLoading || !listingId}>
              Buy Listing
            </Button>
            <Button onClick={handleCancelListing} size="sm" variant="ghost" disabled={actionLoading || !listingId}>
              Cancel Listing
            </Button>
          </div>
          <ResponseDisplay title="Action Response" data={actionResponse} error={actionError} loading={actionLoading} />
        </div>
      </div>
    </Section>
  )
}

// ============================================================================
// API CLIENTS SECTION
// ============================================================================

function ApiClientsSection() {
  const [createData, setCreateData] = useState({
    name: '',
    rate_limit_per_minute: 60,
  })
  const [createResponse, setCreateResponse] = useState<{ client: ApiClient; api_key: string } | null>(null)
  const [createError, setCreateError] = useState<ApiError | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  const [clientInfo, setClientInfo] = useState<ApiClient | null>(null)
  const [clientError, setClientError] = useState<ApiError | null>(null)
  const [clientLoading, setClientLoading] = useState(false)

  const handleCreate = async () => {
    setCreateLoading(true)
    setCreateError(null)
    try {
      const data = await ticketingApi.registerApiClient({
        name: createData.name,
        rate_limit_per_minute: Number(createData.rate_limit_per_minute),
      })
      setCreateResponse(data)
    } catch (err) {
      setCreateError(formatError(err))
      setCreateResponse(null)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleGetClientInfo = async () => {
    setClientLoading(true)
    setClientError(null)
    try {
      const data = await ticketingApi.getMyClientInfo()
      setClientInfo(data)
    } catch (err) {
      setClientError(formatError(err))
      setClientInfo(null)
    } finally {
      setClientLoading(false)
    }
  }

  return (
    <Section title="API Clients" icon="api">
      <div className="space-y-6">
        {/* Register client */}
        <div>
          <h4 className="font-mono text-xs uppercase text-primary mb-3">Register API Client (Admin)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Client Name"
              value={createData.name}
              onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
              placeholder="PSYCHOSOUND"
            />
            <Input
              label="Rate Limit (per minute)"
              type="number"
              value={createData.rate_limit_per_minute}
              onChange={(e) => setCreateData({ ...createData, rate_limit_per_minute: Number(e.target.value) })}
            />
          </div>
          <Button onClick={handleCreate} size="sm" className="mt-4" disabled={createLoading}>
            Register Client
          </Button>
          {createResponse?.api_key && (
            <div className="mt-4 p-4 border border-primary bg-primary/10">
              <div className="text-xs text-text-muted uppercase mb-2">API Key (save this!)</div>
              <code className="font-mono text-primary break-all">{createResponse.api_key}</code>
            </div>
          )}
          <ResponseDisplay title="Created Client" data={createResponse} error={createError} loading={createLoading} />
        </div>

        {/* Get client info */}
        <div className="border-t border-border-grey pt-6">
          <h4 className="font-mono text-xs uppercase text-primary mb-3">Get My Client Info</h4>
          <p className="text-text-secondary text-sm mb-4">
            Requires API Key authentication. Set your API key in the Auth section above.
          </p>
          <Button onClick={handleGetClientInfo} size="sm" disabled={clientLoading}>
            Get Client Info
          </Button>
          <ResponseDisplay title="Client Info" data={clientInfo} error={clientError} loading={clientLoading} />
        </div>
      </div>
    </Section>
  )
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export function TicketAdmin() {
  const handleAuthChange = useCallback(
    (auth: { type: 'jwt' | 'apiKey'; token: string; userId?: string } | null) => {
      ticketingApi.setAuth(auth)
    },
    []
  )

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Header */}
      <header className="border-b border-border-grey">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <Link to="/" className="text-text-muted hover:text-white transition-colors text-sm font-mono">
              &larr; Back to Home
            </Link>
            <h1 className="text-2xl font-bold mt-2">
              <span className="text-primary">RAVETURE</span> Ticketing Admin
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Test and debug all ticketing service endpoints
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono text-text-muted uppercase">API Base URL</div>
            <code className="text-sm text-primary">{getApiBaseUrl()}</code>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <QuickToolsSection />
        <AuthSection onAuthChange={handleAuthChange} />
        <HealthCheckSection />
        <TicketTypesSection />
        <OrdersSection />
        <TicketsSection />
        <ValidationSection />
        <ResaleSection />
        <ApiClientsSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-border-grey py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-text-muted text-sm font-mono">
          RAVETURE Ticketing Service v1.0.0
        </div>
      </footer>
    </div>
  )
}
