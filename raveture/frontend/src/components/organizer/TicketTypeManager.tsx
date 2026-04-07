import { useState } from 'react'
import { Card, Button, Input, DateTimePicker } from '@/components/ui'
import { ticketingApi } from '@/services'
import { cn } from '@/utils'

interface TicketTypeData {
  id: string
  name: string
  description?: string
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
  max_per_order?: number
}

interface TicketTypeManagerProps {
  ticketTypes: TicketTypeData[]
  eventId: string
  onUpdate: () => void
  className?: string
}

export function TicketTypeManager({
  ticketTypes,
  eventId,
  onUpdate,
  className,
}: TicketTypeManagerProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newQuantity, setNewQuantity] = useState('')
  const [newSaleStartsAt, setNewSaleStartsAt] = useState<Date | undefined>()
  const [newSaleEndsAt, setNewSaleEndsAt] = useState<Date | undefined>()
  const [newMaxPerOrder, setNewMaxPerOrder] = useState('')

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editSaleStartsAt, setEditSaleStartsAt] = useState<Date | undefined>()
  const [editSaleEndsAt, setEditSaleEndsAt] = useState<Date | undefined>()
  const [editMaxPerOrder, setEditMaxPerOrder] = useState('')

  const handleToggleActive = async (ticketType: TicketTypeData) => {
    setLoading(ticketType.id)
    setError(null)

    try {
      await ticketingApi.updateTicketType(ticketType.id, {
        is_active: !ticketType.is_active,
      })
      onUpdate()
    } catch (err) {
      setError('Failed to update ticket type')
    } finally {
      setLoading(null)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim() || !newPrice || !newQuantity) return

    setLoading('create')
    setError(null)

    try {
      await ticketingApi.createTicketType({
        event_id: eventId,
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        price_cents: Math.round(parseFloat(newPrice) * 100),
        quantity_total: parseInt(newQuantity),
        currency: 'CZK',
        sale_starts_at: newSaleStartsAt?.toISOString(),
        sale_ends_at: newSaleEndsAt?.toISOString(),
        max_per_order: newMaxPerOrder ? parseInt(newMaxPerOrder) : undefined,
      })

      // Reset form
      setNewName('')
      setNewDescription('')
      setNewPrice('')
      setNewQuantity('')
      setNewSaleStartsAt(undefined)
      setNewSaleEndsAt(undefined)
      setNewMaxPerOrder('')
      setShowCreateForm(false)
      onUpdate()
    } catch (err) {
      const error = err as { message?: string; error?: string }
      setError(error.error || error.message || 'Failed to create ticket type')
    } finally {
      setLoading(null)
    }
  }

  const startEdit = (tt: TicketTypeData) => {
    setEditingId(tt.id)
    setEditDescription(tt.description || '')
    setEditQuantity(tt.quantity_total.toString())
    setEditSaleStartsAt(tt.sale_starts_at ? new Date(tt.sale_starts_at) : undefined)
    setEditSaleEndsAt(tt.sale_ends_at ? new Date(tt.sale_ends_at) : undefined)
    setEditMaxPerOrder(tt.max_per_order?.toString() || '')
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setError(null)
  }

  const handleSaveEdit = async (tt: TicketTypeData) => {
    const newQuantityTotal = parseInt(editQuantity)

    // Validate quantity >= quantity_sold
    if (newQuantityTotal < tt.quantity_sold) {
      setError(`Quantity cannot be less than ${tt.quantity_sold} (already sold)`)
      return
    }

    setLoading(tt.id)
    setError(null)

    try {
      await ticketingApi.updateTicketType(tt.id, {
        description: editDescription.trim() || undefined,
        quantity_total: newQuantityTotal,
        sale_starts_at: editSaleStartsAt?.toISOString() || null,
        sale_ends_at: editSaleEndsAt?.toISOString() || null,
        max_per_order: editMaxPerOrder ? parseInt(editMaxPerOrder) : undefined,
      })
      setEditingId(null)
      onUpdate()
    } catch (err) {
      const error = err as { message?: string; error?: string }
      setError(error.error || error.message || 'Failed to update ticket type')
    } finally {
      setLoading(null)
    }
  }

  const formatPrice = (cents: number) => `${(cents / 100).toFixed(0)} CZK`

  const getProgressPercent = (sold: number, total: number) => {
    return Math.min(100, Math.round((sold / total) * 100))
  }

  return (
    <Card hover={false} className={cn('p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">confirmation_number</span>
          <h3 className="font-mono text-sm uppercase font-bold">Ticket Types</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Add Ticket Type'}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 border border-error bg-error/10 text-error text-sm font-mono">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="mb-6 p-4 border border-border-grey rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name *"
              placeholder="Early Bird"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              label="Description"
              placeholder="Limited early bird offer"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (CZK) *"
              type="number"
              placeholder="350"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
            />
            <Input
              label="Quantity *"
              type="number"
              placeholder="100"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DateTimePicker
              label="Sale Starts At"
              value={newSaleStartsAt}
              onChange={setNewSaleStartsAt}
              placeholder="Immediately"
            />
            <DateTimePicker
              label="Sale Ends At"
              value={newSaleEndsAt}
              onChange={setNewSaleEndsAt}
              placeholder="No end date"
            />
          </div>

          <Input
            label="Max Per Order"
            type="number"
            placeholder="Unlimited"
            value={newMaxPerOrder}
            onChange={(e) => setNewMaxPerOrder(e.target.value)}
            className="w-48"
          />

          <Button
            onClick={handleCreate}
            disabled={loading === 'create' || !newName.trim() || !newPrice || !newQuantity}
          >
            {loading === 'create' ? 'Creating...' : 'Create Ticket Type'}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {ticketTypes.map((tt) => {
          const progressPercent = getProgressPercent(tt.quantity_sold, tt.quantity_total)
          const isAlmostSoldOut = progressPercent >= 90
          const isSoldOut = tt.quantity_available === 0
          const isEditing = editingId === tt.id

          return (
            <div
              key={tt.id}
              className={cn(
                'p-4 border rounded-lg',
                tt.is_active ? 'border-border-grey' : 'border-border-grey/50 opacity-60'
              )}
            >
              {isEditing ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-mono font-bold">{tt.name}</h4>
                      <span className="text-text-muted text-sm">
                        {formatPrice(tt.price_cents)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-text-muted/20 text-text-muted rounded">
                        Name & price are immutable
                      </span>
                    </div>
                  </div>

                  <Input
                    label="Description"
                    placeholder="Ticket description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label={`Quantity (min: ${tt.quantity_sold} sold)`}
                      type="number"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(e.target.value)}
                      min={tt.quantity_sold}
                    />
                    <Input
                      label="Max Per Order"
                      type="number"
                      placeholder="Unlimited"
                      value={editMaxPerOrder}
                      onChange={(e) => setEditMaxPerOrder(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <DateTimePicker
                      label="Sale Starts At"
                      value={editSaleStartsAt}
                      onChange={setEditSaleStartsAt}
                      placeholder="Immediately"
                    />
                    <DateTimePicker
                      label="Sale Ends At"
                      value={editSaleEndsAt}
                      onChange={setEditSaleEndsAt}
                      placeholder="No end date"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(tt)}
                      disabled={loading === tt.id}
                    >
                      {loading === tt.id ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-mono font-bold">{tt.name}</h4>
                        {!tt.is_active && (
                          <span className="text-xs px-2 py-0.5 bg-text-muted/20 text-text-muted rounded">
                            Inactive
                          </span>
                        )}
                        {isSoldOut && tt.is_active && (
                          <span className="text-xs px-2 py-0.5 bg-error/20 text-error rounded">
                            Sold Out
                          </span>
                        )}
                        {isAlmostSoldOut && !isSoldOut && tt.is_active && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-400/20 text-yellow-400 rounded">
                            Almost Sold Out
                          </span>
                        )}
                      </div>
                      <p className="text-text-secondary text-sm mt-1">
                        {formatPrice(tt.price_cents)}
                      </p>
                      {tt.description && (
                        <p className="text-text-muted text-xs mt-1">{tt.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(tt)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(tt)}
                        disabled={loading === tt.id}
                      >
                        {loading === tt.id ? (
                          <span className="material-symbols-outlined text-sm animate-spin">
                            progress_activity
                          </span>
                        ) : tt.is_active ? (
                          'Deactivate'
                        ) : (
                          'Activate'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-text-muted">
                        {tt.quantity_sold} / {tt.quantity_total} sold
                      </span>
                      <span
                        className={cn(
                          isSoldOut
                            ? 'text-error'
                            : isAlmostSoldOut
                              ? 'text-yellow-400'
                              : 'text-success'
                        )}
                      >
                        {tt.quantity_available} available
                      </span>
                    </div>

                    <div className="h-2 bg-bg-dark rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-500',
                          isSoldOut
                            ? 'bg-error'
                            : isAlmostSoldOut
                              ? 'bg-yellow-400'
                              : 'bg-success'
                        )}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {tt.quantity_reserved > 0 && (
                      <p className="text-xs text-text-muted">
                        {tt.quantity_reserved} reserved in pending orders
                      </p>
                    )}
                  </div>

                  {/* Sale dates info */}
                  {(tt.sale_starts_at || tt.sale_ends_at || tt.max_per_order) && (
                    <div className="mt-3 pt-3 border-t border-border-grey text-xs text-text-muted space-y-1">
                      {tt.sale_starts_at && (
                        <p>Sale starts: {new Date(tt.sale_starts_at).toLocaleString()}</p>
                      )}
                      {tt.sale_ends_at && (
                        <p>Sale ends: {new Date(tt.sale_ends_at).toLocaleString()}</p>
                      )}
                      {tt.max_per_order && (
                        <p>Max per order: {tt.max_per_order}</p>
                      )}
                    </div>
                  )}

                  {/* Revenue */}
                  <div className="mt-3 pt-3 border-t border-border-grey">
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted text-xs font-mono">Revenue</span>
                      <span className="font-mono text-primary font-bold">
                        {formatPrice(tt.revenue_cents)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}

        {ticketTypes.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <span className="material-symbols-outlined text-4xl">confirmation_number</span>
            <p className="mt-2 font-mono">No ticket types configured</p>
          </div>
        )}
      </div>
    </Card>
  )
}
