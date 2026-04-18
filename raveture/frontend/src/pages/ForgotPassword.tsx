import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useLang } from '@/context'
import { AnimatedBackground, GlowButton, GlowCard, GlowInput } from '@/components/design'
import { ravetureApi } from '@/services'

export function ForgotPassword() {
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useGSAP(() => {
    const tl = gsap.timeline()
    tl.fromTo(
      '.forgot-logo',
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    )
      .fromTo(
        '.forgot-card',
        { opacity: 0, y: 30, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' },
        '-=0.3'
      )
      .fromTo(
        '.forgot-back',
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power3.out' },
        '-=0.2'
      )
  }, [])

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setIsLoading(true)
    try {
      await ravetureApi.forgotPassword(email)
      setSubmitted(true)
    } catch {
      setError(t.auth.resetFailed)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-bg-dark">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-md mx-4 py-12">
        {/* Logo */}
        <Link to="/" className="forgot-logo flex items-center gap-3 justify-center mb-12 group">
          <div className="w-10 h-10 bg-primary transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(218,120,88,0.5)]" />
          <h1 className="text-3xl font-bold tracking-tighter uppercase">RAVETURE</h1>
        </Link>

        <GlowCard className="forgot-card p-8">
          {submitted ? (
            <div className="text-center py-4">
              <span className="material-symbols-outlined text-5xl text-primary mb-4 block">
                mark_email_read
              </span>
              <h2 className="text-2xl font-bold uppercase tracking-tight mb-3">
                {t.auth.forgotSuccessTitle}
              </h2>
              <p className="text-text-muted text-sm leading-relaxed mb-8">
                {t.auth.forgotSuccessMsg}
              </p>
              <Link
                to="/login"
                className="text-primary hover:text-white transition-colors font-mono uppercase text-sm"
              >
                {t.auth.backToLogin}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <span className="text-primary text-xs font-mono uppercase tracking-widest mb-2 block">
                  {t.auth.forgotBadge}
                </span>
                <h2 className="text-2xl font-bold uppercase tracking-tight">{t.auth.forgotTitle}</h2>
                <p className="text-text-muted text-sm mt-2">{t.auth.forgotSubtitle}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <GlowInput
                  label={t.auth.email}
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null) }}
                  autoComplete="email"
                />

                {error && (
                  <div className="p-4 border border-red-500/50 bg-red-500/10 text-red-400 text-sm font-mono">
                    <div className="flex items-start gap-2">
                      <span className="text-red-500">!</span>
                      {error}
                    </div>
                  </div>
                )}

                <GlowButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isLoading || !email}
                >
                  {isLoading ? t.auth.forgotSending : t.auth.forgotBtn}
                </GlowButton>
              </form>

              <div className="mt-8 pt-6 border-t border-border-grey text-center">
                <Link
                  to="/login"
                  className="text-text-muted text-sm hover:text-primary transition-colors font-mono"
                >
                  {t.auth.backToLogin}
                </Link>
              </div>
            </>
          )}
        </GlowCard>

        <div className="forgot-back mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-text-muted text-sm font-mono hover:text-primary transition-colors group"
          >
            <span className="transform transition-transform group-hover:-translate-x-1">&larr;</span>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
