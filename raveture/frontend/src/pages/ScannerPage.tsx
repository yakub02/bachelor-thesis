import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import gsap from 'gsap'
import { Upload, RotateCcw, CheckCircle, XCircle, AlertCircle, Hash } from 'lucide-react'
import { useAuth } from '@/context'
import { ticketingApi } from '@/services'
import { NewNavbar, NewFooter } from '@/components/design'
import type { ValidationResult } from '@/types'

interface QRPayload {
  ticket_id: string
  event_id: string
  signature: string
}

type ScanState = 'idle' | 'scanning' | 'result'
type Mode = 'upload' | 'code'

const RESULT_CONFIG: Record<
  string,
  { label: string; tone: 'ok' | 'warn' | 'err' }
> = {
  valid:             { label: 'Entry granted',     tone: 'ok'   },
  already_used:      { label: 'Already used',      tone: 'warn' },
  invalid_signature: { label: 'Invalid signature', tone: 'err'  },
  invalid_status:    { label: 'Ticket not valid',  tone: 'err'  },
  wrong_event:       { label: 'Wrong event',       tone: 'err'  },
  not_found:         { label: 'Ticket not found',  tone: 'err'  },
}

function ResultIcon({ tone }: { tone: 'ok' | 'warn' | 'err' }) {
  if (tone === 'ok')   return <CheckCircle className="w-20 h-20 text-green-400" />
  if (tone === 'warn') return <AlertCircle className="w-20 h-20 text-amber-400" />
  return                      <XCircle     className="w-20 h-20 text-red-400" />
}

export function ScannerPage() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return }
    if (user?.role !== 'organizer' && user?.role !== 'admin') { navigate('/'); return }
  }, [isAuthenticated, user, navigate])

  const [mode, setMode] = useState<Mode>('upload')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [resultError, setResultError] = useState<string | null>(null)

  const [codeInput, setCodeInput] = useState<string>('')

  const overlayRef   = useRef<HTMLDivElement>(null)
  const autoResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleAutoReset = useCallback(() => {
    if (autoResetRef.current) clearTimeout(autoResetRef.current)
    autoResetRef.current = setTimeout(() => reset(), 4000)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    if (autoResetRef.current) clearTimeout(autoResetRef.current)
    setScanState('idle')
    setResult(null)
    setResultError(null)
  }, [])

  useEffect(() => () => {
    if (autoResetRef.current) clearTimeout(autoResetRef.current)
  }, [])

  const handleQRString = useCallback(async (raw: string) => {
    setResult(null)
    setResultError(null)

    let payload: QRPayload
    try {
      const parts = raw.trim().split(':')
      if (parts.length !== 3) throw new Error('wrong part count')
      const [ticket_id, event_id, signature] = parts
      if (!ticket_id || !event_id || !signature || signature.length !== 64) {
        throw new Error('missing or malformed fields')
      }
      payload = { ticket_id, event_id, signature }
    } catch {
      setResultError('Invalid QR code — not a RAVETURE ticket')
      setScanState('result')
      scheduleAutoReset()
      return
    }

    try {
      const data = await ticketingApi.scanTicket({
        ticket_id: payload.ticket_id,
        event_id:  payload.event_id,
        signature: payload.signature,
        location:  'Scanner (upload)',
      })
      setResult(data)
    } catch (err) {
      const e = err as { message?: string }
      setResultError(e.message ?? 'API error')
    } finally {
      setScanState('result')
      scheduleAutoReset()
    }
  }, [scheduleAutoReset])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setScanState('scanning')

    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)

      const MAX_SIDE = 1200
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w > MAX_SIDE || h > MAX_SIDE) {
        const scale = MAX_SIDE / Math.max(w, h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0, w, h)

      const imageData = ctx.getImageData(0, 0, w, h)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })
      if (code) {
        handleQRString(code.data)
      } else {
        setResultError('No QR code found in the image')
        setScanState('result')
        scheduleAutoReset()
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setResultError('Could not load image')
      setScanState('result')
      scheduleAutoReset()
    }
    img.src = url
  }, [handleQRString, scheduleAutoReset])

  const handleCodeSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = codeInput.trim().toLowerCase().replace(/[\s-]/g, '')
    if (normalized.length !== 12) {
      setResultError('Code must be exactly 12 characters')
      setScanState('result')
      scheduleAutoReset()
      return
    }

    setScanState('scanning')
    setResult(null)
    setResultError(null)

    try {
      const data = await ticketingApi.scanTicketByCode({
        code: normalized,
        location: 'Manual entry',
      })
      setResult(data)
    } catch (err) {
      const e = err as { message?: string }
      setResultError(e.message ?? 'API error')
    } finally {
      setScanState('result')
      setCodeInput('')
      scheduleAutoReset()
    }
  }, [codeInput, scheduleAutoReset])

  useEffect(() => {
    if (scanState === 'result' && overlayRef.current) {
      gsap.fromTo(overlayRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'power3.out' }
      )
    }
  }, [scanState])

  const cfg = result ? (RESULT_CONFIG[result.result] ?? RESULT_CONFIG['not_found']) : null

  if (!isAuthenticated || (user?.role !== 'organizer' && user?.role !== 'admin')) {
    return null
  }

  const switchMode = (next: Mode) => {
    reset()
    setMode(next)
  }

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <NewNavbar />

      <main className="pt-24 pb-20">
        {/* Issue strip */}
        <div className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-9 flex items-center gap-5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 tabular-nums">
            <span className="text-primary text-xs leading-none">◆</span>
            <span className="text-white font-medium">Door</span>
            <span className="opacity-40">/</span>
            <span>Scanner</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="w-1 h-1 bg-primary" />
              <span>
                {scanState === 'idle' && 'Awaiting input'}
                {scanState === 'scanning' && 'Processing'}
                {scanState === 'result' && 'Result ready'}
              </span>
            </div>
          </div>
        </div>

        {/* Header */}
        <section className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 pt-14 pb-10 sm:pt-20 sm:pb-12">
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-5">
              § 01 / The Gate
            </div>
            <div className="grid grid-cols-12 gap-6 sm:gap-10 items-end">
              <h1
                className="col-span-12 md:col-span-8 font-headline text-[clamp(1.75rem,7vw,5.5rem)] leading-[0.95] tracking-[-0.035em] uppercase"
                style={{ fontWeight: 700 }}
              >
                Validate the <span className="text-primary">entry.</span>
              </h1>
              <p className="col-span-12 md:col-span-4 text-sm md:text-[15px] leading-[1.65] text-white/60 max-w-md">
                Upload a photo of the ticket QR, or key the 12-char code by hand. Live camera scanning ships with the mobile app.
              </p>
            </div>
          </div>
        </section>

        {/* Mode strip */}
        <section className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-6">
            <div className="grid grid-cols-2 border border-white/10">
              <button
                onClick={() => switchMode('upload')}
                className={`flex items-center justify-center gap-2 px-4 py-4 text-[10px] font-mono uppercase tracking-[0.22em] border-r border-white/10 transition-colors ${
                  mode === 'upload'
                    ? 'bg-primary text-black'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload QR photo
              </button>
              <button
                onClick={() => switchMode('code')}
                className={`flex items-center justify-center gap-2 px-4 py-4 text-[10px] font-mono uppercase tracking-[0.22em] transition-colors ${
                  mode === 'code'
                    ? 'bg-primary text-black'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                Enter code
              </button>
            </div>
          </div>
        </section>

        {/* Viewport + side panel */}
        <section className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-12 sm:py-16">
            <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-8">
              <div className="relative aspect-square bg-black border border-white/10 overflow-hidden">

            {/* UPLOAD */}
            {mode === 'upload' && scanState === 'idle' && (
              <label className="absolute inset-0 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/5 transition-colors">
                <Upload className="w-12 h-12 text-primary/60" />
                <span className="text-[10px] font-mono text-white/60 uppercase tracking-[0.22em]">
                  Tap to select a photo
                </span>
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.22em]">
                  PNG · JPG · WEBP
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}

            {mode === 'upload' && scanState === 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center bg-bg-dark">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* CODE */}
            {mode === 'code' && scanState === 'idle' && (
              <form
                onSubmit={handleCodeSubmit}
                className="absolute inset-0 flex flex-col gap-5 p-8 justify-center"
              >
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.22em] text-white/50 mb-2">
                    Ticket code (12 chars)
                  </label>
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="a1b2c3d4e5f6"
                    maxLength={16}
                    autoComplete="off"
                    autoFocus
                    spellCheck={false}
                    className="w-full bg-black border border-white/20 px-3 py-3 text-lg font-mono tracking-[0.2em] text-primary focus:outline-none focus:border-primary uppercase"
                  />
                </div>

                <button
                  type="submit"
                  disabled={codeInput.trim().length < 12}
                  className="w-full bg-primary text-black py-3 text-[10px] font-mono uppercase tracking-[0.22em] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Validate entry
                </button>

                <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.22em] leading-[1.6]">
                  The code is printed on the PDF ticket and on the holder's ticket detail page.
                </p>
              </form>
            )}

            {mode === 'code' && scanState === 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center bg-bg-dark">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* RESULT */}
            {scanState === 'result' && (
              <div
                ref={overlayRef}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-bg-dark"
              >
                {cfg ? (
                  <>
                    <ResultIcon tone={cfg.tone} />
                    <div>
                      <p
                        className={`font-headline text-3xl uppercase tracking-[-0.02em] leading-tight ${
                          cfg.tone === 'ok'   ? 'text-green-400' :
                          cfg.tone === 'warn' ? 'text-amber-400' :
                                                'text-red-400'
                        }`}
                        style={{ fontWeight: 700 }}
                      >
                        {cfg.label}
                      </p>
                      {result?.ticket_type && (
                        <p className="text-sm text-white/60 mt-2">{result.ticket_type}</p>
                      )}
                      <p className="text-xs text-white/40 mt-1">{result?.message}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-20 h-20 text-red-400" />
                    <p
                      className="font-headline text-2xl uppercase tracking-[-0.02em] text-red-400"
                      style={{ fontWeight: 700 }}
                    >
                      Scan failed
                    </p>
                    <p className="text-sm text-white/60">{resultError}</p>
                  </>
                )}

                <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.22em] mt-2">
                  Auto reset in 4 s
                </p>
              </div>
            )}
          </div>

          {/* Right: metadata panel */}
          <div className="flex flex-col border border-white/10">
            <div className="px-6 py-5 border-b border-white/10">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary mb-2">
                § Mode
              </div>
              <div
                className="font-headline text-2xl uppercase tracking-[-0.02em] leading-tight"
                style={{ fontWeight: 700 }}
              >
                {mode === 'upload' && 'Photo upload'}
                {mode === 'code' && 'Manual code'}
              </div>
            </div>

            <div className="px-6 py-5 border-b border-white/10">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary mb-3">
                § Protocol
              </div>
              <ul className="space-y-2 text-sm text-white/60 leading-[1.55]">
                <li className="flex gap-2">
                  <span className="text-primary">→</span>
                  QR signature is server-signed and single-use
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">→</span>
                  Manual codes bypass the QR signature — staff only
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">→</span>
                  Every attempt is logged, regardless of result
                </li>
              </ul>
            </div>

            <div className="px-6 py-5 flex-1 flex flex-col justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary mb-2">
                  § Current state
                </div>
                <div className={`text-[11px] font-mono uppercase tracking-[0.22em] ${
                  scanState === 'idle'     ? 'text-white/50'  :
                  scanState === 'scanning' ? 'text-primary'   :
                                             'text-white'
                }`}>
                  {scanState === 'idle'     && '◇ Awaiting input'}
                  {scanState === 'scanning' && '◆ Processing…'}
                  {scanState === 'result'   && '◆ Result ready'}
                </div>
              </div>

              {scanState === 'result' && (
                <button
                  onClick={reset}
                  className="w-full flex items-center justify-center gap-2 py-3 text-[10px] font-mono uppercase tracking-[0.22em] border border-white/20 text-white/70 hover:border-white hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Scan next
                </button>
              )}
            </div>
          </div>
            </div>
          </div>
        </section>

      </main>

      <NewFooter />
    </div>
  )
}
