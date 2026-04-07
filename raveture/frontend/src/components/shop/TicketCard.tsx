import { Link } from 'react-router-dom'
import { Card } from '@/components/ui'
import { cn } from '@/utils'
import type { Ticket } from '@/types'

interface TicketCardProps {
  ticket: Ticket
  ticketTypeName?: string
  eventName?: string
  className?: string
}

export function TicketCard({ ticket, ticketTypeName, eventName, className }: TicketCardProps) {
  const statusColors: Record<Ticket['status'], string> = {
    valid: 'border-success text-success',
    used: 'border-text-muted text-text-muted',
    invalidated: 'border-error text-error',
    listed: 'border-primary text-primary',
    transferred: 'border-text-secondary text-text-secondary',
  }

  const statusIcons: Record<Ticket['status'], string> = {
    valid: 'check_circle',
    used: 'verified',
    invalidated: 'cancel',
    listed: 'storefront',
    transferred: 'swap_horiz',
  }

  return (
    <Link to={`/tickets/${ticket.id}`}>
      <Card
        className={cn(
          'p-4 cursor-pointer hover:border-primary transition-colors',
          className
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {eventName && (
              <div className="text-primary font-mono text-xs uppercase mb-1">
                {eventName}
              </div>
            )}
            <h3 className="font-mono font-bold">
              {ticketTypeName || 'Ticket'}
            </h3>
            <div className="text-text-muted text-xs font-mono mt-1">
              #{ticket.id.slice(0, 8)}...
            </div>
          </div>

          {/* Status badge */}
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 border text-xs font-mono uppercase',
              statusColors[ticket.status]
            )}
          >
            <span className="material-symbols-outlined text-sm">
              {statusIcons[ticket.status]}
            </span>
            <span>{ticket.status}</span>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-4 pt-3 border-t border-border-grey flex items-center justify-between text-xs text-text-muted font-mono">
          <span>Issued: {new Date(ticket.issued_at).toLocaleDateString()}</span>
          {ticket.status === 'valid' && (
            <span className="flex items-center gap-1 text-primary">
              <span className="material-symbols-outlined text-sm">qr_code_2</span>
              View QR
            </span>
          )}
        </div>
      </Card>
    </Link>
  )
}
