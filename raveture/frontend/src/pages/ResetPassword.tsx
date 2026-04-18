import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useLang } from '@/context'
import { AnimatedBackground, GlowButton, GlowCard, GlowInput } from '@/components/design'
import { ravetureApi } from '@/services'

export function ResetPassword() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useGSAP(() => {
    const tl = gsap.timeline()
    tl.fromTo(
      '.reset-logo',
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    )
      .fromTo(
        '.reset-card',
        { opacity: 0, y: 30, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' },
        '-=0.3'
      )
      .fromTo(
        '.reset-back',
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power3.out' },
        '-=0.2'
      )
  }, [])

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      return
    }
    ravetureApi.verifyResetToken(token).then(res => {
      setTokenValid(res.valid)
    }).catch(() => {
      setTokenValid(false)
    })
  }, [token])

  const validatePassword = (): string | null => {
    if (password.length < 8) return t.auth.pwdMin
    if (!/[A-Z]/.test(password)) return t.auth.pwdUpper
    if (!/[a-z]/.test(password)) return t.auth.pwdLower
    if (!/[0-9]/.test(password)) return t.auth.pwdNumber
    if (password !== confirmPassword) return t.auth.pwdMatch
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validatePassword()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    try {
      await ravetureApi.resetPassword(token, password)
      navigate('/login?reset=success')
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
        <Link to="/" className="reset-logo flex items-center gap-3 justify-center mb-12 group">
          <div className="w-10 h-10 bg-primary transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(218,120,88,0.5)]" />
          <h1 className="text-3xl font-bold tracking-tighter uppercase">RAVETURE</h1>
        </Link>

        <GlowCard className="reset-card p-8">
          {tokenValid === null && (
            <div className="text-center py-8 text-text-muted font-mono text-sm">
              {t.common.loading}
            </div>
          )}

          {tokenValid === false && (
            <div className="text-center py-4">
              <span className="material-symbols-outlined text-5xl text-red-500 mb-4 block">
                link_off
              </span>
              <h2 className="text-2xl font-bold uppercase tracking-tight mb-3">
                {t.auth.resetInvalidToken}
              </h2>
              <p className="text-text-muted text-sm mb-8">
                {t.auth.resetExpiredHint}
              </p>
              <Link
                to="/forgot-password"
                className="text-primary hover:text-white transition-colors font-mono uppercase text-sm"
              >
                {t.auth.forgotBtn}
              </Link>
            </div>
          )}

          {tokenValid === true && (
            <>
              <div className="mb-8">
                <span className="text-primary text-xs font-mono uppercase tracking-widest mb-2 block">
                  {t.auth.resetBadge}
                </span>
                <h2 className="text-2xl font-bold uppercase tracking-tight">{t.auth.resetTitle}</h2>
                <p className="text-text-muted text-sm mt-2">{t.auth.resetSubtitle}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <GlowInput
                    label={t.auth.newPassword}
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Min. 8 chars, uppercase, lowercase, number"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null) }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-[38px] text-text-muted hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

                <div className="relative">
                  <GlowInput
                    label={t.auth.confirmPassword}
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(null) }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-[38px] text-text-muted hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

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
                  disabled={isLoading || !password || !confirmPassword}
                >
                  {isLoading ? t.auth.resetting : t.auth.resetBtn}
                </GlowButton>
              </form>
            </>
          )}
        </GlowCard>

        <div className="reset-back mt-8 text-center">
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
