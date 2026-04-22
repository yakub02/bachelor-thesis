import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { QRCodeCanvas } from 'qrcode.react'
import { Copy, Download, FileDown, Check, AlertCircle, ArrowLeft } from 'lucide-react'
import { ticketingApi } from '@/services'
import type { Ticket, QRCodeData, ApiError } from '@/types'
import { NewNavbar, NewFooter } from '@/components/design'

function formatError(err: unknown): ApiError {
  if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
    return {
      error: 'Network Error',
      message: 'Could not connect to the ticketing service. Make sure it is running.',
    }
  }
  return err as ApiError
}

const STATUS_META: Record<
  string,
  { label: string; tone: 'ok' | 'warn' | 'err' | 'neutral' }
> = {
  valid:       { label: 'Valid for entry',   tone: 'ok'      },
  used:        { label: 'Already used',       tone: 'warn'    },
  invalidated: { label: 'Invalidated',        tone: 'err'     },
  listed:      { label: 'Listed for resale',  tone: 'neutral' },
  transferred: { label: 'Transferred',        tone: 'neutral' },
}

function toneClasses(tone: 'ok' | 'warn' | 'err' | 'neutral') {
  if (tone === 'ok')   return 'text-green-400 border-green-400/30 bg-green-400/5'
  if (tone === 'warn') return 'text-amber-400 border-amber-400/30 bg-amber-400/5'
  if (tone === 'err')  return 'text-red-400   border-red-400/30   bg-red-400/5'
  return                      'text-primary   border-primary/30   bg-primary/5'
}

function toneDot(tone: 'ok' | 'warn' | 'err' | 'neutral') {
  if (tone === 'ok')   return 'bg-green-400'
  if (tone === 'warn') return 'bg-amber-400'
  if (tone === 'err')  return 'bg-red-400'
  return                      'bg-primary'
}

export function TicketDetail() {
  const { id: ticketId } = useParams<{ id: string }>()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [qrData, setQrData] = useState<QRCodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!ticketId) return

    const fetchTicket = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await ticketingApi.getTicket(ticketId)
        setTicket(data)
      } catch (err) {
        setError(formatError(err))
      } finally {
        setLoading(false)
      }
    }

    fetchTicket()
  }, [ticketId])

  const fetchQR = useCallback(async () => {
    if (!ticketId || !ticket || ticket.status !== 'valid') return
    setQrLoading(true)
    try {
      const data = await ticketingApi.getTicketQR(ticketId)
      setQrData(data)
    } catch {
      // Empty qrData state signals the UI to show the error message.
    } finally {
      setQrLoading(false)
    }
  }, [ticketId, ticket])

  useEffect(() => {
    if (ticket?.status === 'valid') fetchQR()
  }, [ticket, fetchQR])

  useGSAP(() => {
    if (loading) return
    gsap.fromTo(
      '[data-tix-reveal]',
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.05, ease: 'power3.out' }
    )
  }, [loading])

  const flashCopied = (field: string) => {
    setCopiedField(field)
    setTimeout(() => setCopiedField((cur) => (cur === field ? null : cur)), 1500)
  }

  const copyText = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value)
      flashCopied(field)
    } catch {
      window.prompt('Copy this value manually:', value)
    }
  }

  const handleDownloadQrPng = async () => {
    const canvas = qrCanvasRef.current
    if (!canvas) return
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ticket_${ticket?.code ?? ticketId}.png`
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

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
      // PDF download failure is silent; the download simply does not start.
    } finally {
      setPdfLoading(false)
    }
  }

  const statusMeta = ticket ? STATUS_META[ticket.status] : null
  const shortId = ticketId ? ticketId.slice(-8).toUpperCase() : ''

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <NewNavbar />

      <main className="pt-24 pb-20">
        {/* Issue strip */}
        <div className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-9 flex items-center gap-5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 tabular-nums">
            <span className="text-primary text-xs leading-none">◆</span>
            <span className="text-white font-medium">My Collection</span>
            <span className="opacity-40">/</span>
            <span>Pass {shortId && `#${shortId}`}</span>
            {statusMeta && (
              <div className="ml-auto flex items-center gap-2">
                <span className={`w-1 h-1 ${toneDot(statusMeta.tone)}`} />
                <span>{statusMeta.label}</span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 pt-12">
          <Link
            to="/my-tickets"
            className="group inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors mb-10"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to my tickets</span>
          </Link>

          {loading && (
            <div className="flex items-center gap-3 py-16 text-white/50 border-t border-white/10">
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-mono tracking-[0.22em] uppercase">
                Loading pass…
              </span>
            </div>
          )}

          {error && (
            <div className="border-t border-b border-red-400/40 py-5 px-5 flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-red-400 mb-1.5">
                  {error.error}
                </div>
                <p className="text-[13px] text-white/70 leading-[1.55]">{error.message}</p>
              </div>
            </div>
          )}

          {!loading && !error && ticket && statusMeta && (
            <>
              {/* ── Header ────────────────────────────────────────── */}
              <div data-tix-reveal className="mb-14">
                <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-4">
                  § 01 / Pass
                </div>
                <div className="flex items-end justify-between gap-6 flex-wrap">
                  <div className="min-w-0">
                    <h1
                      className="font-headline uppercase leading-[0.92] tracking-[-0.03em] break-words"
                      style={{ fontSize: 'clamp(2.25rem,6vw,5rem)', fontWeight: 700 }}
                    >
                      {ticket.event_name || 'Event'}
                    </h1>
                    <p className="text-[11px] font-mono tracking-[0.22em] uppercase text-white/50 mt-4">
                      {ticket.ticket_type_name || 'Standard'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-1">
                      Status
                    </div>
                    <span
                      className={`inline-block px-3 py-1 border text-[10px] font-mono tracking-[0.22em] uppercase ${toneClasses(statusMeta.tone)}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-10 md:gap-14">

                {/* ── QR section ──────────────────────────────── */}
                <section data-tix-reveal>
                  <div className="flex items-baseline justify-between mb-4 border-t border-white/10 pt-4">
                    <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
                      § 02 / Entry QR
                    </span>
                    <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40">
                      Static · single use
                    </span>
                  </div>

                  <div className="border-b border-white/10 py-10 flex flex-col items-center">
                    {ticket.status !== 'valid' && (
                      <div className="w-full text-center py-16 border border-dashed border-white/10">
                        <p className="text-white/50 font-mono text-[10px] uppercase tracking-[0.22em]">
                          QR unavailable — ticket is {ticket.status}
                        </p>
                      </div>
                    )}

                    {ticket.status === 'valid' && qrLoading && !qrData && (
                      <div className="py-16">
                        <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-white/50 mt-4 font-mono text-[10px] uppercase tracking-[0.22em]">Generating…</p>
                      </div>
                    )}

                    {ticket.status === 'valid' && qrData && (
                      <>
                        <div className="bg-white p-5">
                          <QRCodeCanvas
                            ref={qrCanvasRef}
                            value={qrData.qr_data}
                            size={260}
                            level="H"
                            includeMargin={false}
                          />
                        </div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 mt-5 text-center max-w-xs">
                          Show at the door, or download for validation testing
                        </p>
                      </>
                    )}

                    {ticket.status === 'valid' && !qrLoading && !qrData && (
                      <div className="w-full text-center py-16">
                        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" strokeWidth={1.5} />
                        <p className="text-white/50 font-mono text-[10px] uppercase tracking-[0.22em] mt-3">
                          QR generation failed
                        </p>
                      </div>
                    )}
                  </div>

                  {ticket.status === 'valid' && qrData && (
                    <div className="grid grid-cols-2 border-b border-white/10">
                      <button
                        onClick={handleDownloadQrPng}
                        className="flex items-center justify-center gap-2 py-4 text-[11px] font-mono uppercase tracking-[0.22em] border-r border-white/10 text-white/60 hover:text-primary hover:bg-white/[0.03] transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Download PNG
                      </button>
                      <button
                        onClick={handleDownloadPdf}
                        disabled={pdfLoading}
                        className="flex items-center justify-center gap-2 py-4 text-[11px] font-mono uppercase tracking-[0.22em] text-white/60 hover:text-primary hover:bg-white/[0.03] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <FileDown className="w-3.5 h-3.5" strokeWidth={1.75} />
                        {pdfLoading ? 'Downloading…' : 'Download PDF'}
                      </button>
                    </div>
                  )}
                </section>

                {/* ── Details section ─────────────────────────── */}
                <section data-tix-reveal>
                  <div className="flex items-baseline justify-between mb-4 border-t border-white/10 pt-4">
                    <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">
                      § 03 / Details
                    </span>
                    <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 tabular-nums">
                      #{shortId}
                    </span>
                  </div>

                  {/* Ticket code */}
                  <div className="border-b border-white/10 py-6">
                    <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50 mb-3">
                      Ticket code
                    </div>
                    <div className="flex items-center gap-3">
                      <code
                        className="font-headline text-2xl tabular-nums tracking-[0.1em] text-primary break-all"
                        style={{ fontWeight: 600 }}
                      >
                        {ticket.code ?? '—'}
                      </code>
                      {ticket.code && (
                        <button
                          onClick={() => copyText(ticket.code!, 'code')}
                          title="Copy code"
                          className="flex-shrink-0 w-9 h-9 flex items-center justify-center border border-white/20 text-white/60 hover:text-primary hover:border-primary transition-colors"
                        >
                          {copiedField === 'code'
                            ? <Check className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
                            : <Copy  className="w-3.5 h-3.5" strokeWidth={1.75} />}
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 mt-3">
                      Use this to validate at /scan
                    </p>
                  </div>

                  {/* Issued + transfers */}
                  <div className="border-b border-white/10 py-5 grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50 mb-1.5">
                        Issued
                      </div>
                      <div className="text-[13px] font-mono tabular-nums text-white">
                        {new Date(ticket.issued_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50 mb-1.5">
                        Transfers
                      </div>
                      <div className="text-[13px] font-mono tabular-nums text-white">
                        {ticket.transferred_count}
                      </div>
                    </div>
                  </div>

                  {/* Scanned at */}
                  {ticket.used_at && (
                    <div className="border-b border-white/10 py-5">
                      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50 mb-1.5">
                        Scanned at
                      </div>
                      <div className="text-[13px] font-mono tabular-nums text-white">
                        {new Date(ticket.used_at).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {/* Price + resale */}
                  {ticket.price_cents != null && (
                    <div className="border-b border-white/10 py-5 grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50 mb-1.5">
                          Price
                        </div>
                        <div
                          className="font-headline text-xl tabular-nums text-white"
                          style={{ fontWeight: 600 }}
                        >
                          {Math.floor(ticket.price_cents / 100)}
                          <span className="text-[11px] font-mono text-white/40 ml-1.5 tracking-wider">
                            {ticket.currency?.toUpperCase() ?? ''}
                          </span>
                        </div>
                      </div>
                      {ticket.resale_allowed && (
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50 mb-1.5">
                            Resale cap
                          </div>
                          <div
                            className="font-headline text-xl tabular-nums text-primary"
                            style={{ fontWeight: 600 }}
                          >
                            {ticket.resale_max_price_percent ?? 100}
                            <span className="text-[11px] font-mono text-white/40 ml-1 tracking-wider">
                              %
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ticket ID */}
                  <div className="border-b border-white/10 py-5">
                    <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50 mb-2">
                      Ticket ID
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] font-mono text-white/60 break-all">
                        {ticket.id}
                      </code>
                      <button
                        onClick={() => copyText(ticket.id, 'id')}
                        title="Copy ticket ID"
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center border border-white/20 text-white/60 hover:text-primary hover:border-primary transition-colors"
                      >
                        {copiedField === 'id'
                          ? <Check className="w-3 h-3 text-primary" strokeWidth={1.75} />
                          : <Copy  className="w-3 h-3" strokeWidth={1.75} />}
                      </button>
                    </div>
                  </div>
                </section>

              </div>
            </>
          )}
        </div>
      </main>

      <NewFooter />
    </div>
  )
}
