import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import gsap from 'gsap'
import { Camera, Upload, RotateCcw, CheckCircle, XCircle, AlertCircle, QrCode } from 'lucide-react'
import { useAuth } from '@/context'
import { ticketingApi } from '@/services'
import { PageWrapper, GlowButton } from '@/components/design'
import type { ValidationResult } from '@/types'

// ============================================================================
// TYPES
// ============================================================================

interface QRPayload {
  ticket_id: string
  event_id: string
  signature: string
}

type ScanState = 'idle' | 'scanning' | 'result'
type Mode = 'camera' | 'upload'

// ============================================================================
// RESULT OVERLAY
// ============================================================================

const RESULT_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: 'ok' | 'warn' | 'err' }
> = {
  valid:               { label: 'Entry granted',         color: 'text-green-400',  bg: 'from-green-950/80',  icon: 'ok'   },
  already_used:        { label: 'Already used',          color: 'text-amber-400',  bg: 'from-amber-950/80',  icon: 'warn' },
  invalid_signature:   { label: 'Invalid signature',     color: 'text-red-400',    bg: 'from-red-950/80',    icon: 'err'  },
  invalid_status:      { label: 'Ticket not valid',      color: 'text-red-400',    bg: 'from-red-950/80',    icon: 'err'  },
  wrong_event:         { label: 'Wrong event',           color: 'text-red-400',    bg: 'from-red-950/80',    icon: 'err'  },
  not_found:           { label: 'Ticket not found',      color: 'text-red-400',    bg: 'from-red-950/80',    icon: 'err'  },
}

function ResultIcon({ kind }: { kind: 'ok' | 'warn' | 'err' }) {
  if (kind === 'ok')   return <CheckCircle  className="w-20 h-20 text-green-400 drop-shadow-[0_0_24px_rgba(74,222,128,0.5)]" />
  if (kind === 'warn') return <AlertCircle  className="w-20 h-20 text-amber-400 drop-shadow-[0_0_24px_rgba(251,191,36,0.5)]" />
  return                      <XCircle      className="w-20 h-20 text-red-400   drop-shadow-[0_0_24px_rgba(248,113,113,0.5)]" />
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function ScannerPage() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // ----- auth guard -----
  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return }
    if (user?.role !== 'organizer' && user?.role !== 'admin') { navigate('/'); return }
  }, [isAuthenticated, user, navigate])

  // ----- state -----
  const [mode, setMode] = useState<Mode>('camera')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [resultError, setResultError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // ----- refs -----
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const rafRef     = useRef<number>(0)
  const overlayRef = useRef<HTMLDivElement>(null)
  const autoResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ============================================================
  // CAMERA
  // ============================================================

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        startFrameLoop()
      }
    } catch (err) {
      const e = err as Error
      if (e.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Use photo upload instead.')
      } else if (e.name === 'NotFoundError') {
        setCameraError('No camera found. Use photo upload instead.')
      } else {
        setCameraError(`Camera unavailable: ${e.message}`)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  // ============================================================
  // FRAME LOOP  (camera mode)
  // ============================================================

  const processFrame = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(video, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })

    if (code) {
      stopCamera()
      handleQRString(code.data)
      return
    }

    rafRef.current = requestAnimationFrame(processFrame)
  }, [stopCamera]) // eslint-disable-line react-hooks/exhaustive-deps

  const startFrameLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(processFrame)
  }, [processFrame])

  // ============================================================
  // LIFECYCLE — start / stop camera when mode changes
  // ============================================================

  useEffect(() => {
    if (mode === 'camera' && scanState === 'idle') {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [mode, scanState, startCamera, stopCamera])

  // ============================================================
  // QR PARSING + API CALL
  // ============================================================

  const handleQRString = useCallback(async (raw: string) => {
    setScanState('scanning')
    setResult(null)
    setResultError(null)

    // QR format: "{ticket_id}:{event_id}:{signature}"
    let payload: QRPayload
    try {
      const parts = raw.trim().split(':')
      // UUIDs contain hyphens (not colons), signature is 64-char hex — exactly 3 parts
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
        location:  'Scanner',
      })
      setResult(data)
    } catch (err) {
      const e = err as { message?: string }
      setResultError(e.message ?? 'API error')
    } finally {
      setScanState('result')
      scheduleAutoReset()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // PHOTO UPLOAD
  // ============================================================

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Show spinner immediately — don't wait for image decode
    setScanState('scanning')

    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)

      // Scale down very large images — jsQR accuracy drops above ~2000px
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
  }, [handleQRString])

  // ============================================================
  // AUTO-RESET  (back to idle after 4 seconds)
  // ============================================================

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

  // ============================================================
  // GSAP — result overlay entrance
  // ============================================================

  useEffect(() => {
    if (scanState === 'result' && overlayRef.current) {
      gsap.fromTo(overlayRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'power3.out' }
      )
    }
  }, [scanState])

  // ============================================================
  // DERIVED VALUES
  // ============================================================

  const cfg = result ? (RESULT_CONFIG[result.result] ?? RESULT_CONFIG['not_found']) : null

  if (!isAuthenticated || (user?.role !== 'organizer' && user?.role !== 'admin')) {
    return null
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <PageWrapper>
      <div className="min-h-screen flex flex-col items-center pt-24 pb-16 px-4">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3 text-xs font-mono uppercase tracking-widest text-primary">
            <QrCode className="w-3.5 h-3.5" />
            Ticket Scanner
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Scan QR Code</h1>
          <p className="text-text-muted text-sm mt-2">
            Camera auto-detects — or upload a photo
          </p>
        </div>

        {/* ── Mode toggle ────────────────────────────────────── */}
        <div className="flex gap-2 mb-6 bg-bg-card border border-border-grey/40 p-1 rounded-none">
          <button
            onClick={() => { reset(); setMode('camera') }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
              mode === 'camera'
                ? 'bg-primary text-bg-dark'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Camera
          </button>
          <button
            onClick={() => { reset(); setMode('upload') }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
              mode === 'upload'
                ? 'bg-primary text-bg-dark'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
        </div>

        {/* ── Scanner viewport ───────────────────────────────── */}
        <div className="relative w-full max-w-sm aspect-square bg-black border border-border-grey/60 overflow-hidden">

          {/* Camera mode */}
          {mode === 'camera' && scanState !== 'result' && (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              {/* Hidden processing canvas */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Corner frame overlay */}
              {!cameraError && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* top-left */}
                  <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-primary" />
                  {/* top-right */}
                  <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-primary" />
                  {/* bottom-left */}
                  <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-primary" />
                  {/* bottom-right */}
                  <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-primary" />

                  {/* Scan line animation */}
                  <div className="absolute left-8 right-8 h-px bg-primary/60 shadow-[0_0_8px_rgba(218,120,88,0.8)] animate-scan-line" />
                </div>
              )}

              {/* Camera error */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-bg-dark/80">
                  <AlertCircle className="w-10 h-10 text-amber-400" />
                  <p className="text-sm text-text-muted">{cameraError}</p>
                </div>
              )}

              {/* Scanning spinner */}
              {scanState === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-dark/70">
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          )}

          {/* Upload mode */}
          {mode === 'upload' && scanState === 'idle' && (
            <label className="absolute inset-0 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/5 transition-colors">
              <Upload className="w-12 h-12 text-primary/60" />
              <span className="text-sm font-mono text-text-muted uppercase tracking-wider">
                Tap to select photo
              </span>
              <span className="text-xs text-text-muted/60">
                PNG, JPG, WEBP supported
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}

          {/* Scanning spinner for upload */}
          {mode === 'upload' && scanState === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-dark">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Result overlay */}
          {scanState === 'result' && (
            <div
              ref={overlayRef}
              className={`absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-gradient-to-b ${
                cfg ? cfg.bg : 'from-red-950/80'
              } to-bg-dark`}
            >
              {cfg ? (
                <>
                  <ResultIcon kind={cfg.icon} />
                  <div>
                    <p className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</p>
                    {result?.ticket_type && (
                      <p className="text-sm text-text-muted mt-1">{result.ticket_type}</p>
                    )}
                    <p className="text-xs text-text-muted/70 mt-2">{result?.message}</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-20 h-20 text-red-400" />
                  <p className="text-xl font-bold text-red-400">Scan failed</p>
                  <p className="text-sm text-text-muted">{resultError}</p>
                </>
              )}

              {/* Auto-reset countdown hint */}
              <p className="text-[10px] font-mono text-text-muted/40 uppercase tracking-wider mt-2">
                Auto reset in 4 s
              </p>
            </div>
          )}
        </div>

        {/* ── Action buttons ─────────────────────────────────── */}
        <div className="mt-6 flex gap-3">
          {scanState === 'result' && (
            <GlowButton variant="primary" size="sm" onClick={reset}>
              <RotateCcw className="w-3.5 h-3.5 mr-2" />
              Scan next
            </GlowButton>
          )}
          {mode === 'camera' && scanState === 'idle' && cameraError && (
            <GlowButton variant="outline" size="sm" onClick={startCamera}>
              Retry camera
            </GlowButton>
          )}
        </div>

        {/* ── Info text ──────────────────────────────────────── */}
        <p className="mt-8 text-xs text-text-muted/50 font-mono text-center max-w-xs">
          QR codes rotate every 2 min. Scan within the validity window.
          Results are logged regardless of outcome.
        </p>
      </div>
    </PageWrapper>
  )
}
