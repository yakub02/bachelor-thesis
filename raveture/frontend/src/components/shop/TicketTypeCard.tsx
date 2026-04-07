import { Button, Card } from '@/components/ui'
import { cn } from '@/utils'
import type { TicketType } from '@/types'

interface TicketTypeCardProps {
  ticketType: TicketType
  quantity: number
  onQuantityChange: (quantity: number) => void
  className?: string
}

export function TicketTypeCard({
  ticketType,
  quantity,
  onQuantityChange,
  className,
}: TicketTypeCardProps) {
  const isSoldOut = ticketType.quantity_available === 0
  const maxQuantity = Math.min(ticketType.max_per_order, ticketType.quantity_available)

  const formatPrice = (cents: number, currency: string) => {
    return `${(cents / 100).toFixed(0)} ${currency}`
  }

  return (
    <Card hover={false} className={cn('p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        {/* Ticket info */}
        <div className="flex-1">
          <h3 className="font-mono text-lg font-bold uppercase">{ticketType.name}</h3>
          {ticketType.description && (
            <p className="text-text-secondary text-sm mt-1">{ticketType.description}</p>
          )}
          <div className="mt-3 flex items-center gap-4">
            <span className="text-primary font-mono text-xl font-bold">
              {formatPrice(ticketType.price_cents, ticketType.currency)}
            </span>
            <span className="text-text-muted text-xs font-mono">
              {ticketType.quantity_available} left
            </span>
          </div>
        </div>

        {/* Quantity selector */}
        <div className="flex flex-col items-end gap-2">
          {isSoldOut ? (
            <span className="text-error font-mono text-sm uppercase">Sold Out</span>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
                disabled={quantity === 0}
                className="w-10 h-10 p-0 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">remove</span>
              </Button>
              <span className="font-mono text-lg w-8 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQuantityChange(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity}
                className="w-10 h-10 p-0 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </Button>
            </div>
          )}
          {quantity > 0 && (
            <span className="text-text-muted text-xs font-mono">
              = {formatPrice(ticketType.price_cents * quantity, ticketType.currency)}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
