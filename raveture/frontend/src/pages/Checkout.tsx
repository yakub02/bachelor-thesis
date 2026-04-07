import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ticketingApi } from '@/services'
import type { Order, ApiError } from '@/types'
import { AnimatedBackground, GlowButton, GlowCard, NewNavbar, NewFooter } from '@/components/design'
import { cn } from '@/utils'

function formatError(err: unknown): ApiError {
  if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
    return {
      error: 'Network Error',
      message: 'Could not connect to the ticketing service. Make sure it is running.',
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

export function Checkout() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as CheckoutState | null

  const [timeLeft, setTimeLeft] = useState(state?.expiresInSeconds || 0)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState<ApiError | null>(null)

  useGSAP(() => {
    gsap.fromTo(
      '.checkout-card',
      { opacity: 0, y: 30, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' }
    )
  }, [])

  // Countdown timer
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

  // Redirect if no order data
  if (!state?.order) {
    return (
      <div className="relative min-h-screen bg-bg-dark text-white flex items-center justify-center">
        <AnimatedBackground />
        <GlowCard className="p-8 text-center max-w-md relative z-10">
          <span className="text-4xl mb-4 block">⚠️</span>
          <h2 className="text-xl font-bold mb-2">No Order Found</h2>
          <p className="text-text-muted mb-6">
            It looks like you navigated here directly. Please start from the event page.
          </p>
          <Link to="/">
            <GlowButton>Go to Home</GlowButton>
          </Link>
        </GlowCard>
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
      // Check if GoPay is configured (production) or use simulated payment (dev)
      const useGoPay = import.meta.env.VITE_USE_GOPAY === 'true'

      if (useGoPay) {
        // Create GoPay payment and redirect
        const payment = await ticketingApi.createPayment({
          order_id: order.id,
        })

        // Redirect to GoPay gateway
        window.location.href = payment.gateway_url
      } else {
        // Simulated payment for development
        await ticketingApi.confirmOrder(order.id, {
          payment_method: 'card',
          payment_reference: `sim_${Date.now()}`,
        })

        // Navigate to my tickets on success
        navigate('/my-tickets', {
          state: { justPurchased: true },
        })
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

  // Calculate totals
  const subtotal = order.total_cents + (discount?.amount_cents || 0)

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <AnimatedBackground />
      <NewNavbar />

      <main className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-6">
          {/* Back link */}
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-2 text-text-muted text-sm font-mono hover:text-primary transition-colors group mb-8"
          >
            <span className="transform transition-transform group-hover:-translate-x-1">&larr;</span>
            Cancel & Go Back
          </button>

          <div className="checkout-card">
            {/* Timer Card */}
            <GlowCard className={cn('p-6 mb-6', isExpired ? 'border-red-500/50' : 'border-primary/50')}>
              <div className="flex items-center justify-center gap-4">
                <div className={cn('text-3xl', isExpired ? 'text-red-400' : 'text-primary')}>
                  ⏱️
                </div>
                {isExpired ? (
                  <div className="text-center">
                    <span className="font-mono text-red-400 text-xl font-bold">Order Expired</span>
                    <p className="text-text-muted text-sm mt-1">Please start a new order</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-text-muted text-sm font-mono block">Complete within</span>
                    <span className="font-mono text-4xl font-bold text-primary">
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                )}
              </div>
            </GlowCard>

            {/* Event Name */}
            <div className="mb-6">
              <span className="text-primary text-xs font-mono uppercase tracking-widest block mb-2">
                [ Checkout ]
              </span>
              <h1 className="text-2xl font-bold uppercase tracking-tight">{eventName}</h1>
            </div>

            {/* Order Summary */}
            <GlowCard className="p-6 mb-6">
              <h3 className="text-sm font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
                <span className="text-primary">◆</span>
                Order Summary
              </h3>

              {/* Items */}
              <div className="space-y-3 mb-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-border-grey">
                    <div>
                      <span className="font-mono">{item.ticket_type_name || 'Ticket'}</span>
                      <span className="text-text-muted ml-2">× {item.quantity}</span>
                    </div>
                    <span className="font-mono text-primary">
                      {(item.unit_price_cents * item.quantity / 100).toFixed(0)} CZK
                    </span>
                  </div>
                ))}
              </div>

              {/* Subtotal */}
              {discount && (
                <>
                  <div className="flex justify-between items-center py-2 text-text-muted">
                    <span className="font-mono">Subtotal</span>
                    <span className="font-mono">{(subtotal / 100).toFixed(0)} CZK</span>
                  </div>
                  <div className="flex justify-between items-center py-2 text-green-400">
                    <span className="font-mono">Discount ({discount.code})</span>
                    <span className="font-mono">-{(discount.amount_cents / 100).toFixed(0)} CZK</span>
                  </div>
                </>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-4 border-t border-border-grey">
                <span className="text-text-muted text-xs font-mono uppercase">Total</span>
                <span className="text-3xl font-bold text-primary">
                  {(order.total_cents / 100).toFixed(0)} CZK
                </span>
              </div>
            </GlowCard>

            {/* Error */}
            {confirmError && (
              <GlowCard className="p-4 mb-6 border-red-500/50 bg-red-500/10">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="font-bold text-red-400">{confirmError.error}</h3>
                    <p className="text-text-muted text-sm mt-1">{confirmError.message}</p>
                  </div>
                </div>
              </GlowCard>
            )}

            {/* Pay Button */}
            <GlowButton
              onClick={handleConfirm}
              disabled={isExpired || confirmLoading}
              size="lg"
              className="w-full"
            >
              {confirmLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Processing Payment...
                </span>
              ) : isExpired ? (
                'Order Expired'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  💳 Pay Now (Simulated)
                </span>
              )}
            </GlowButton>

            <p className="text-text-muted text-xs text-center font-mono mt-4">
              This is a simulated payment for development purposes.
            </p>
          </div>
        </div>
      </main>

      <NewFooter />
    </div>
  )
}
