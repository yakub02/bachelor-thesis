import { Card } from '@/components/ui'
import { cn } from '@/utils'
import type { Order } from '@/types'

interface OrderSummaryProps {
  order: Order
  className?: string
  discount?: {
    code: string
    type: string
    value: number
    amount_cents: number
  }
}

export function OrderSummary({ order, className, discount }: OrderSummaryProps) {
  const formatPrice = (cents: number, currency: string) => {
    return `${(cents / 100).toFixed(0)} ${currency}`
  }

  const hasDiscount = order.discount_cents > 0 || discount

  return (
    <Card hover={false} className={cn('p-6', className)}>
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary">receipt_long</span>
        <h3 className="font-mono text-sm uppercase font-bold">Order Summary</h3>
      </div>

      <div className="space-y-3">
        {order.items?.map((item) => (
          <div key={item.id} className="flex justify-between items-center">
            <div>
              <span className="font-mono text-sm">{item.ticket_type_name}</span>
              <span className="text-text-muted text-xs ml-2">x {item.quantity}</span>
            </div>
            <span className="font-mono text-sm">
              {formatPrice(item.subtotal_cents, order.currency)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-border-grey mt-4 pt-4 space-y-2">
        {/* Subtotal (if discount applied) */}
        {hasDiscount && (
          <div className="flex justify-between items-center text-text-secondary">
            <span className="font-mono text-sm">Subtotal</span>
            <span className="font-mono text-sm">
              {formatPrice(order.subtotal_cents || order.total_cents + (order.discount_cents || 0), order.currency)}
            </span>
          </div>
        )}

        {/* Discount */}
        {hasDiscount && (
          <div className="flex justify-between items-center text-success">
            <span className="font-mono text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">local_offer</span>
              Discount
              {(discount?.code || order.discount_code_id) && (
                <span className="text-xs opacity-75">
                  ({discount?.code || 'Code applied'})
                </span>
              )}
            </span>
            <span className="font-mono text-sm">
              -{formatPrice(order.discount_cents || discount?.amount_cents || 0, order.currency)}
            </span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-center pt-2">
          <span className="font-mono text-sm uppercase font-bold">Total</span>
          <span className="font-mono text-xl text-primary font-bold">
            {formatPrice(order.total_cents, order.currency)}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border-grey">
        <div className="flex justify-between text-xs text-text-muted font-mono">
          <span>Order Reference</span>
          <span>{order.reference}</span>
        </div>
      </div>
    </Card>
  )
}
