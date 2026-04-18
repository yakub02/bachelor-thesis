import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Clock, AlertTriangle, CreditCard, ArrowLeft } from 'lucide-react'
import { ticketingApi } from '@/services'
import type { Order, ApiError } from '@/types'
import { NewNavbar, NewFooter } from '@/components/design'
import { cn } from '@/utils'
import { useAuth, useLang } from '@/context'

function formatError(err: unknown): ApiError {
  if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
    return {
      error: 'Network Error',
      message: 'Could not reach the ticketing service. Try again in a moment.',
    }
  }
  return err as ApiError
}

interface CheckoutState {
  order: Order
  expiresInSeconds: number
  eventName: string
  discount?: {
    code: string
    type: string
    value: number
    amount_cents: number
  }
}

const USE_GOPAY = import.meta.env.VITE_USE_GOPAY === 'true'

export function Checkout() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as CheckoutState | null
  const { user } = useAuth()
  const { t } = useLang()

  const [timeLeft, setTimeLeft] = useState(state?.expiresInSeconds || 0)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState<ApiError | null>(null)

  useGSAP(() => {
    gsap.fromTo(
      '[data-checkout-reveal]',
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out' }
    )
  }, [])

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  if (!state?.order) {
    return (
      <div className="relative min-h-screen bg-bg-dark text-white flex flex-col">
        <NewNavbar />
        <main className="flex-1 flex items-center justify-center px-6 py-24">
          <div className="max-w-md w-full text-center">
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-4">
              § 404 / No order
            </div>
            <h2
              className="font-headline text-3xl sm:text-4xl uppercase tracking-[-0.02em] mb-4"
              style={{ fontWeight: 700 }}
            >
              Nothing to check out.
            </h2>
            <p className="text-white/55 text-[14px] leading-[1.6] mb-8">
              It looks like you navigated here directly. Start from an event page to pick tickets.
            </p>
            <Link
              to="/events"
              className="inline-flex items-center gap-3 px-5 py-3 bg-primary text-black text-[11px] font-mono tracking-[0.2em] uppercase font-semibold hover:bg-white transition-colors duration-200"
            >
              <span>See the programme</span>
              <span>→</span>
            </Link>
          </div>
        </main>
        <NewFooter />
      </div>
    )
  }

  const { order, eventName, discount } = state
  const isExpired = timeLeft <= 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleConfirm = async () => {
    setConfirmLoading(true)
    setConfirmError(null)

    try {
      if (USE_GOPAY) {
        const payment = await ticketingApi.createPayment({ order_id: order.id })
        window.location.href = payment.gateway_url
      } else {
        await ticketingApi.confirmOrder(order.id, {
          payment_method: 'card',
          payment_reference: `sim_${Date.now()}`,
          email: user?.email,
        })
        navigate('/my-tickets', { state: { justPurchased: true } })
      }
    } catch (err) {
      setConfirmError(formatError(err))
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleCancel = async () => {
    try {
      await ticketingApi.cancelOrder(order.id)
    } catch {
      // Ignore errors on cancel
    }
    navigate(-1)
  }

  const subtotal = order.total_cents + (discount?.amount_cents || 0)

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <NewNavbar />

      <main className="pt-24 pb-20">
        {/* Issue strip */}
        <div className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-9 flex items-center gap-5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 tabular-nums">
            <span className="text-primary text-xs leading-none">◆</span>
            <span className="text-white font-medium">Checkout</span>
            <span className="opacity-40">/</span>
            <span>Order Nº&nbsp;{String(order.id || '').slice(0, 6).toUpperCase() || '000000'}</span>
            <div className="ml-auto flex items-center gap-2">
              <span className={cn('w-1 h-1', isExpired ? 'bg-destructive' : 'bg-primary')} />
              <span className={isExpired ? 'text-destructive' : ''}>
                {isExpired ? 'Expired' : 'Holding seats'}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-[720px] mx-auto px-6 pt-12 pb-8">
          <button
            onClick={handleCancel}
            className="group inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors mb-10"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{t.checkout.backToEvent}</span>
          </button>

          {/* Header */}
          <div data-checkout-reveal className="mb-10">
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-4">
              § 01 / {t.checkout.badge}
            </div>
            <h1
              className="font-headline text-[clamp(2rem,5vw,3.5rem)] leading-[0.95] tracking-[-0.03em] uppercase"
              style={{ fontWeight: 700 }}
            >
              {eventName}
            </h1>
          </div>

          {/* Countdown block */}
          <div
            data-checkout-reveal
            className={cn(
              'border-t border-b py-8 mb-10 flex items-center justify-between gap-6',
              isExpired ? 'border-destructive/40' : 'border-white/10'
            )}
          >
            <div className="flex items-center gap-4">
              <Clock
                className={cn(
                  'w-5 h-5',
                  isExpired ? 'text-destructive' : 'text-primary'
                )}
                strokeWidth={1.25}
              />
              <div>
                <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 mb-1">
                  {isExpired ? t.checkout.orderExpired : t.checkout.timeLeft}
                </div>
                <div
                  className={cn(
                    'font-headline text-3xl sm:text-4xl leading-none tabular-nums',
                    isExpired ? 'text-destructive' : 'text-white'
                  )}
                  style={{ fontWeight: 600 }}
                >
                  {isExpired ? '—:—' : formatTime(timeLeft)}
                </div>
              </div>
            </div>
            {!isExpired && (
              <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 hidden sm:block max-w-[180px] text-right">
                Seats are held while the clock runs.
              </div>
            )}
          </div>

          {/* Order summary */}
          <div data-checkout-reveal className="mb-10">
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-5">
              § 02 / Summary
            </div>

            <div className="border-t border-white/10">
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-4 border-b border-white/10"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] text-white truncate">
                      {item.ticket_type_name || 'Ticket'}
                    </div>
                    <div className="text-[11px] font-mono tracking-[0.18em] uppercase text-white/40 mt-1 tabular-nums">
                      × {item.quantity}
                    </div>
                  </div>
                  <div className="font-headline text-lg tabular-nums text-white/90 pl-4">
                    {(item.unit_price_cents * item.quantity / 100).toFixed(0)}
                    <span className="text-[11px] font-mono text-white/40 ml-1.5 tracking-wider">CZK</span>
                  </div>
                </div>
              ))}

              {discount && (
                <>
                  <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <span className="text-[12px] text-white/50">{t.eventShop.subtotal}</span>
                    <span className="text-[14px] tabular-nums text-white/70">
                      {(subtotal / 100).toFixed(0)} <span className="text-[11px] font-mono text-white/40 ml-1 tracking-wider">CZK</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <span className="text-[12px] text-primary">
                      {t.checkout.discount} <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-70">· {discount.code}</span>
                    </span>
                    <span className="text-[14px] tabular-nums text-primary">
                      −{(discount.amount_cents / 100).toFixed(0)} <span className="text-[11px] font-mono opacity-70 ml-1 tracking-wider">CZK</span>
                    </span>
                  </div>
                </>
              )}

              {/* Total */}
              <div className="flex items-baseline justify-between pt-5">
                <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50">
                  {t.checkout.total}
                </span>
                <span
                  className="font-headline text-4xl sm:text-5xl leading-none tabular-nums text-primary"
                  style={{ fontWeight: 700 }}
                >
                  {(order.total_cents / 100).toFixed(0)}
                  <span className="text-sm font-mono text-white/40 ml-2 tracking-wider">CZK</span>
                </span>
              </div>
            </div>
          </div>

          {/* Error */}
          {confirmError && (
            <div
              data-checkout-reveal
              className="border-t border-b border-destructive/40 py-5 px-5 mb-8 flex items-start gap-4"
            >
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="min-w-0">
                <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-destructive mb-1.5">
                  {confirmError.error}
                </div>
                <p className="text-[13px] text-white/70 leading-[1.55]">
                  {confirmError.message}
                </p>
              </div>
            </div>
          )}

          {/* Pay action */}
          <div data-checkout-reveal>
            <button
              onClick={handleConfirm}
              disabled={isExpired || confirmLoading}
              className="group w-full inline-flex items-center justify-between gap-6 px-6 py-5 bg-primary text-black font-mono text-[11px] tracking-[0.22em] uppercase font-semibold hover:bg-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary"
            >
              <span className="inline-flex items-center gap-3">
                {confirmLoading ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" strokeWidth={1.75} />
                )}
                <span>
                  {confirmLoading
                    ? t.checkout.confirming
                    : isExpired
                    ? t.checkout.orderExpired
                    : t.checkout.confirm}
                </span>
              </span>
              {!confirmLoading && !isExpired && (
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              )}
            </button>

            {!USE_GOPAY && (
              <p className="mt-4 text-[10px] font-mono tracking-[0.22em] uppercase text-white/30 text-center">
                Sandbox · No card charged
              </p>
            )}
          </div>
        </div>
      </main>

      <NewFooter />
    </div>
  )
}
