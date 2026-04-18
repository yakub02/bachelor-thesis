import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { QRCodeDisplay } from '@/components/shop'
import { ticketingApi } from '@/services'
import { cn } from '@/utils'
import type { Ticket, QRCodeData, ApiError } from '@/types'
import { AnimatedBackground, GlowButton, GlowCard, NewNavbar, NewFooter } from '@/components/design'

function formatError(err: unknown): ApiError {
  if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
    return {
      error: 'Network Error',
      message: 'Could not connect to the ticketing service. Make sure it is running.',
    }
  }
  return err as ApiError
}

export function TicketDetail() {
  const { id: ticketId } = useParams<{ id: string }>()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [qrData, setQrData] = useState<QRCodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  // Fetch ticket details
  useEffect(() => {
    if (!ticketId) return

    const fetchTicket = async () => {
      setLoading(true)
      setError(null)

      try {
        const ticketData = await ticketingApi.getTicket(ticketId)
        setTicket(ticketData)
      } catch (err) {
        setError(formatError(err))
      } finally {
        setLoading(false)
      }
    }

    fetchTicket()
  }, [ticketId])

  // Fetch QR code
  const fetchQR = useCallback(async () => {
    if (!ticketId || !ticket || ticket.status !== 'valid') return

    setQrLoading(true)
    try {
      const data = await ticketingApi.getTicketQR(ticketId)
      setQrData(data)
    } catch {
      // QR fetch failure handled by empty qrData state
    } finally {
      setQrLoading(false)
    }
  }, [ticketId, ticket])

  // Initial QR fetch
  useEffect(() => {
    if (ticket?.status === 'valid') {
      fetchQR()
    }
  }, [ticket, fetchQR])

  // Auto-refresh QR code every 120 seconds (TODO: set back to 30000 for production)
  useEffect(() => {
    if (ticket?.status !== 'valid') return

    const interval = setInterval(() => {
      fetchQR()
    }, 120000)

    return () => clearInterval(interval)
  }, [ticket, fetchQR])

  useGSAP(() => {
    if (loading) return

    gsap.fromTo(
      '.ticket-content',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    )
  }, [loading])

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!ticketId) return

    setPdfLoading(true)
    try {
      const blob = await ticketingApi.downloadTicketPdf(ticketId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ticket_${ticketId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      // PDF download failure — browser will not initiate the download
    } finally {
      setPdfLoading(false)
    }
  }

  const statusColors: Record<string, string> = {
    valid: 'border-green-500/50 text-green-400 bg-green-500/10',
    used: 'border-text-muted text-text-muted bg-text-muted/10',
    invalidated: 'border-red-500/50 text-red-400 bg-red-500/10',
    listed: 'border-primary/50 text-primary bg-primary/10',
    transferred: 'border-text-secondary text-text-secondary bg-text-secondary/10',
  }

  const statusMessages: Record<string, string> = {
    valid: 'This ticket is valid for entry',
    used: 'This ticket has already been used',
    invalidated: 'This ticket is no longer valid',
    listed: 'This ticket is listed for resale',
    transferred: 'This ticket has been transferred',
  }

  const statusIcons: Record<string, string> = {
    valid: '✓',
    used: '✓',
    invalidated: '✕',
    listed: '📋',
    transferred: '➤',
  }

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <AnimatedBackground />
      <NewNavbar />

      <main className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-6">
          {/* Back link */}
          <Link
            to="/my-tickets"
            className="inline-flex items-center gap-2 text-text-muted text-sm font-mono hover:text-primary transition-colors group mb-8"
          >
            <span className="transform transition-transform group-hover:-translate-x-1">&larr;</span>
            Back to My Tickets
          </Link>

          {/* Loading state */}
          {loading && (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-text-muted mt-4 font-mono">Loading ticket...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <GlowCard className="p-6 border-red-500/50">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-bold text-red-400">{error.error}</h3>
                  <p className="text-text-muted text-sm mt-1">{error.message}</p>
                </div>
              </div>
            </GlowCard>
          )}

          {/* Ticket details */}
          {!loading && !error && ticket && (
            <div className="ticket-content space-y-6">
              {/* Status banner */}
              <GlowCard className={cn('p-4', statusColors[ticket.status])}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{statusIcons[ticket.status]}</span>
                  <span className="font-mono">{statusMessages[ticket.status]}</span>
                </div>
              </GlowCard>

              {/* Ticket info */}
              <GlowCard className="p-6">
                <span className="text-primary text-xs font-mono uppercase tracking-widest block mb-4">
                  [ Ticket Details ]
                </span>

                <div className="space-y-6">
                  <div>
                    <span className="text-text-muted text-xs font-mono uppercase block mb-1">Event</span>
                    <h2 className="text-xl font-bold text-primary">
                      {ticket.event_name || 'Event'}
                    </h2>
                  </div>

                  <div>
                    <span className="text-text-muted text-xs font-mono uppercase block mb-1">Ticket Type</span>
                    <h3 className="text-lg font-mono">
                      {ticket.ticket_type_name || 'Standard'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-grey">
                    <div>
                      <span className="text-text-muted text-xs font-mono uppercase block mb-1">Ticket Code</span>
                      <p className="font-mono text-sm break-all text-primary">{ticket.code}</p>
                    </div>
                    <div>
                      <span className="text-text-muted text-xs font-mono uppercase block mb-1">Issued</span>
                      <p className="font-mono text-sm">
                        {new Date(ticket.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {ticket.used_at && (
                    <div className="pt-4 border-t border-border-grey">
                      <span className="text-text-muted text-xs font-mono uppercase block mb-1">Used At</span>
                      <p className="font-mono text-sm">
                        {new Date(ticket.used_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </GlowCard>

              {/* QR Code */}
              {ticket.status === 'valid' && (
                <GlowCard className="p-6">
                  <h3 className="text-sm font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
                    <span className="text-primary">◆</span>
                    Entry QR Code
                  </h3>

                  {qrLoading && !qrData ? (
                    <div className="text-center py-8">
                      <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-text-muted mt-4 font-mono text-sm">Generating QR code...</p>
                    </div>
                  ) : qrData ? (
                    <div className="flex flex-col items-center">
                      <QRCodeDisplay qrData={qrData} />
                      <p className="text-text-muted text-xs text-center mt-4 font-mono">
                        Show this QR code at the entrance. It refreshes automatically every 2 minutes.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <span className="text-4xl">⚠️</span>
                      <p className="text-text-muted mt-4 font-mono">Failed to generate QR code</p>
                    </div>
                  )}
                </GlowCard>
              )}

              {/* Actions */}
              {(ticket.status === 'valid' || ticket.status === 'used') && (
                <GlowCard className="p-6">
                  <h3 className="text-sm font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
                    <span className="text-primary">◆</span>
                    Actions
                  </h3>

                  <GlowButton
                    variant="outline"
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? 'Downloading...' : '📄 Download PDF'}
                  </GlowButton>
                </GlowCard>
              )}
            </div>
          )}
        </div>
      </main>

      <NewFooter />
    </div>
  )
}
