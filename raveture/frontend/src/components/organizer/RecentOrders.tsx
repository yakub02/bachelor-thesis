import { Card } from '@/components/ui'
import { cn } from '@/utils'
import type { Order } from '@/types'

interface RecentOrdersProps {
  orders: Order[]
  className?: string
}

export function RecentOrders({ orders, className }: RecentOrdersProps) {
  const formatPrice = (cents: number, currency: string) => {
    return `${(cents / 100).toFixed(0)} ${currency}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statusColors: Record<Order['status'], string> = {
    pending: 'text-yellow-400 bg-yellow-400/10',
    confirmed: 'text-success bg-success/10',
    cancelled: 'text-error bg-error/10',
    refunded: 'text-text-muted bg-text-muted/10',
    expired: 'text-text-muted bg-text-muted/10',
  }

  return (
    <Card hover={false} className={cn('p-6', className)}>
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-primary">receipt_long</span>
        <h3 className="font-mono text-sm uppercase font-bold">Recent Orders</h3>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <span className="material-symbols-outlined text-4xl">inbox</span>
          <p className="mt-2 font-mono">No orders yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-text-muted font-mono uppercase border-b border-border-grey">
                <th className="pb-3">Reference</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Items</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-grey">
              {orders.map((order) => (
                <tr key={order.id} className="text-sm">
                  <td className="py-3 font-mono">{order.reference}</td>
                  <td className="py-3 text-text-secondary">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="py-3 text-text-secondary">
                    {order.items?.reduce((sum, item) => sum + item.quantity, 0) || '-'}
                  </td>
                  <td className="py-3 font-mono">
                    {formatPrice(order.total_cents, order.currency)}
                  </td>
                  <td className="py-3">
                    <span
                      className={cn(
                        'px-2 py-1 text-xs font-mono rounded',
                        statusColors[order.status]
                      )}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
