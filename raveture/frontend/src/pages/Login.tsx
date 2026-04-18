import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Eye, EyeOff, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { useAuth, useLang } from '@/context'

export function Login() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuth()
  const { t } = useLang()

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const resetSuccess = searchParams.get('reset') === 'success'

  useGSAP(() => {
    gsap.fromTo(
      '[data-login-reveal]',
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out' }
    )
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.email || !formData.password) {
      setError(t.auth.fillAll)
      return
    }

    try {
      await login(formData.email, formData.password)
      navigate('/')
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message)
      } else if (err && typeof err === 'object' && 'error' in err) {
        setError((err as { error: string }).error)
      } else {
        setError(t.auth.loginFailed)
      }
    }
  }

  return (
    <div className="relative min-h-screen bg-bg-dark text-white flex flex-col">
      {/* Issue strip */}
      <div className="border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-9 flex items-center gap-5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 tabular-nums">
          <span className="text-primary text-xs leading-none">◆</span>
          <Link to="/" className="text-white font-medium hover:text-primary transition-colors">
            RAVETURE
          </Link>
          <span className="opacity-40">/</span>
          <span>Access</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-1 h-1 bg-primary" />
            <span>Entrance</span>
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-[420px]">
          <Link
            to="/"
            data-login-reveal
            className="group inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors mb-10"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Home</span>
          </Link>

          <div data-login-reveal className="mb-10">
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-3">
              § 01 / {t.auth.loginBadge}
            </div>
            <h1
              className="font-headline text-[clamp(2rem,7vw,2.75rem)] uppercase leading-[0.95] tracking-[-0.03em] mb-3"
              style={{ fontWeight: 700 }}
            >
              {t.auth.loginTitle}
            </h1>
            <p className="text-white/55 text-[13px] leading-[1.6]">
              {t.auth.loginSubtitle}
            </p>
          </div>

          <form
            data-login-reveal
            onSubmit={handleSubmit}
            className="border-t border-white/10"
          >
            {resetSuccess && (
              <div className="border-b border-primary/40 py-4 flex items-start gap-3">
                <CheckCircle2
                  className="w-4 h-4 text-primary shrink-0 mt-0.5"
                  strokeWidth={1.75}
                />
                <p className="text-[13px] text-white/80 leading-[1.5]">
                  {t.auth.resetSuccess}
                </p>
              </div>
            )}

            {/* Email */}
            <label className="block border-b border-white/10 py-4">
              <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 mb-1.5 block">
                {t.auth.email}
              </span>
              <input
                type="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                className="w-full bg-transparent text-[15px] text-white placeholder-white/25 focus:outline-none"
              />
            </label>

            {/* Password */}
            <label className="block border-b border-white/10 py-4">
              <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 mb-1.5 block">
                {t.auth.password}
              </span>
              <div className="flex items-center gap-3">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  className="flex-1 min-w-0 bg-transparent text-[15px] text-white placeholder-white/25 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="text-white/40 hover:text-white transition-colors shrink-0"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </label>

            <div className="flex justify-end py-3 border-b border-white/10">
              <Link
                to="/forgot-password"
                className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 hover:text-white transition-colors"
              >
                {t.auth.forgotPassword}
              </Link>
            </div>

            {error && (
              <div className="border-b border-destructive/40 py-4 flex items-start gap-3">
                <AlertTriangle
                  className="w-4 h-4 text-destructive shrink-0 mt-0.5"
                  strokeWidth={1.5}
                />
                <p className="text-[13px] text-white/80 leading-[1.5]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group mt-6 w-full inline-flex items-center justify-between gap-4 px-5 py-4 bg-primary text-black font-mono text-[11px] tracking-[0.22em] uppercase font-semibold hover:bg-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary"
            >
              <span className="inline-flex items-center gap-3">
                {isLoading && (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                )}
                <span>{isLoading ? t.auth.loggingIn : t.auth.loginBtn}</span>
              </span>
              {!isLoading && (
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              )}
            </button>
          </form>

          <p data-login-reveal className="mt-8 text-[12px] text-white/45 text-center">
            {t.auth.noAccount}{' '}
            <Link
              to="/register"
              className="text-primary font-mono text-[10px] tracking-[0.22em] uppercase hover:text-white transition-colors ml-1"
            >
              {t.auth.registerLink}
            </Link>
          </p>
        </div>
      </main>

      <div className="border-t border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-10 flex items-center text-[10px] font-mono tracking-[0.22em] uppercase text-white/30">
          © RAVETURE — Underground for the floor.
        </div>
      </div>
    </div>
  )
}
