import { useState } from 'react'
import { Card, Button, Input, Select } from '@/components/ui'
import { ticketingApi } from '@/services'
import { cn } from '@/utils'
import type { DiscountCode } from '@/types'

interface DiscountCodeManagerProps {
  codes: DiscountCode[]
  eventId: string
  onUpdate: () => void
  className?: string
}

export function DiscountCodeManager({
  codes,
  eventId,
  onUpdate,
  className,
}: DiscountCodeManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [newCode, setNewCode] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [description, setDescription] = useState('')

  const handleCreate = async () => {
    if (!newCode.trim() || !discountValue) return

    setLoading(true)
    setError(null)

    try {
      await ticketingApi.createDiscountCode({
        code: newCode.trim().toUpperCase(),
        event_id: eventId,
        discount_type: discountType,
        discount_value: discountType === 'percentage'
          ? parseInt(discountValue)
          : parseInt(discountValue) * 100, // Convert to cents for fixed
        max_uses: maxUses ? parseInt(maxUses) : undefined,
        description: description || undefined,
      })

      // Reset form
      setNewCode('')
      setDiscountValue('')
      setMaxUses('')
      setDescription('')
      setShowCreateForm(false)
      onUpdate()
    } catch (err) {
      const error = err as { message?: string }
      setError(error.message || 'Failed to create discount code')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (codeId: string) => {
    setLoading(true)
    try {
      await ticketingApi.deleteDiscountCode(codeId)
      onUpdate()
    } catch {
      setError('Failed to deactivate code')
    } finally {
      setLoading(false)
    }
  }

  const formatDiscount = (code: DiscountCode) => {
    if (code.discount_type === 'percentage') {
      return `${code.discount_value}% off`
    }
    return `${(code.discount_value / 100).toFixed(0)} ${code.currency} off`
  }

  return (
    <Card hover={false} className={cn('p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">local_offer</span>
          <h3 className="font-mono text-sm uppercase font-bold">Discount Codes</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Create Code'}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 border border-error bg-error/10 text-error text-sm font-mono">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <div className="mb-6 p-4 border border-border-grey rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code"
              placeholder="FRIENDS20"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              className="font-mono uppercase"
            />
            <Select
              label="Type"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
              options={[
                { value: 'percentage', label: 'Percentage' },
                { value: 'fixed', label: 'Fixed Amount' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={discountType === 'percentage' ? 'Discount %' : 'Amount (CZK)'}
              type="number"
              placeholder={discountType === 'percentage' ? '20' : '100'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
            <Input
              label="Max Uses (optional)"
              type="number"
              placeholder="Unlimited"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>

          <Input
            label="Description (optional)"
            placeholder="Friends & Family discount"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Button onClick={handleCreate} disabled={loading || !newCode.trim() || !discountValue}>
            {loading ? 'Creating...' : 'Create Discount Code'}
          </Button>
        </div>
      )}

      {/* Codes list */}
      <div className="space-y-3">
        {codes.map((code) => (
          <div
            key={code.id}
            className={cn(
              'p-4 border rounded-lg flex items-center justify-between',
              code.is_active ? 'border-border-grey' : 'border-border-grey/50 opacity-60'
            )}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">{code.code}</span>
                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                  {formatDiscount(code)}
                </span>
                {!code.is_active && (
                  <span className="text-xs px-2 py-0.5 bg-text-muted/20 text-text-muted rounded">
                    Inactive
                  </span>
                )}
              </div>
              <div className="text-text-muted text-xs mt-1 space-x-3">
                <span>
                  Used: {code.current_uses}{code.max_uses ? ` / ${code.max_uses}` : ''}
                </span>
                {code.description && (
                  <span className="text-text-secondary">{code.description}</span>
                )}
              </div>
            </div>

            {code.is_active && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(code.id)}
                className="text-error hover:text-error"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </Button>
            )}
          </div>
        ))}

        {codes.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <span className="material-symbols-outlined text-4xl">local_offer</span>
            <p className="mt-2 font-mono">No discount codes yet</p>
          </div>
        )}
      </div>
    </Card>
  )
}
