import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useAuth } from '@/context'
import { AnimatedBackground, GlowButton, GlowCard, GlowInput } from '@/components/design'

export function Login() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useGSAP(() => {
    const tl = gsap.timeline()

    tl.fromTo(
      '.login-logo',
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    )
      .fromTo(
        '.login-card',
        { opacity: 0, y: 30, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' },
        '-=0.3'
      )
      .fromTo(
        '.login-back',
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power3.out' },
        '-=0.2'
      )
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields')
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
        setError('Login failed. Please check your credentials.')
      }
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-bg-dark">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-md mx-4 py-12">
        {/* Logo */}
        <Link to="/" className="login-logo flex items-center gap-3 justify-center mb-12 group">
          <div className="w-10 h-10 bg-primary transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(218,120,88,0.5)]" />
          <h1 className="text-3xl font-bold tracking-tighter uppercase">RAVETURE</h1>
        </Link>

        {/* Login Card */}
        <GlowCard className="login-card p-8">
          <div className="mb-8">
            <span className="text-primary text-xs font-mono uppercase tracking-widest mb-2 block">
              [ Authentication ]
            </span>
            <h2 className="text-2xl font-bold uppercase tracking-tight">Welcome Back</h2>
            <p className="text-text-muted text-sm mt-2">
              Sign in to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <GlowInput
              label="Email"
              type="email"
              name="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />

            <div className="relative">
              <GlowInput
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
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
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </GlowButton>
          </form>

          <div className="mt-8 pt-6 border-t border-border-grey text-center">
            <p className="text-text-muted text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:text-white transition-colors font-mono uppercase">
                Create Account
              </Link>
            </p>
          </div>
        </GlowCard>

        {/* Back to Home */}
        <div className="login-back mt-8 text-center">
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
