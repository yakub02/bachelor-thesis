import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useAuth } from '@/context'
import { AnimatedBackground, GlowButton, GlowCard, GlowInput } from '@/components/design'

export function Register() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useGSAP(() => {
    const tl = gsap.timeline()

    tl.fromTo(
      '.register-logo',
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    )
      .fromTo(
        '.register-card',
        { opacity: 0, y: 30, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' },
        '-=0.3'
      )
      .fromTo(
        '.register-back',
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

    // Validation
    if (!formData.email || !formData.username || !formData.password) {
      setError('Please fill in all required fields')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!/[A-Z]/.test(formData.password)) {
      setError('Password must contain at least one uppercase letter')
      return
    }

    if (!/[a-z]/.test(formData.password)) {
      setError('Password must contain at least one lowercase letter')
      return
    }

    if (!/[0-9]/.test(formData.password)) {
      setError('Password must contain at least one number')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError('Username can only contain letters, numbers, and underscores')
      return
    }

    try {
      await register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        display_name: formData.displayName || undefined,
      })
      navigate('/')
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message)
      } else if (err && typeof err === 'object' && 'error' in err) {
        setError((err as { error: string }).error)
      } else {
        setError('Registration failed. Please try again.')
      }
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-bg-dark py-12">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <Link to="/" className="register-logo flex items-center gap-3 justify-center mb-12 group">
          <div className="w-10 h-10 bg-primary transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(218,120,88,0.5)]" />
          <h1 className="text-3xl font-bold tracking-tighter uppercase">RAVETURE</h1>
        </Link>

        {/* Register Card */}
        <GlowCard className="register-card p-8">
          <div className="mb-8">
            <span className="text-primary text-xs font-mono uppercase tracking-widest mb-2 block">
              [ New Account ]
            </span>
            <h2 className="text-2xl font-bold uppercase tracking-tight">Join the Movement</h2>
            <p className="text-text-muted text-sm mt-2">
              Create your account and join the rave community
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <GlowInput
              label="Email *"
              type="email"
              name="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />

            <GlowInput
              label="Username *"
              type="text"
              name="username"
              placeholder="your_username"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
            />

            <GlowInput
              label="Display Name"
              type="text"
              name="displayName"
              placeholder="How should we call you?"
              value={formData.displayName}
              onChange={handleChange}
            />

            <div className="relative">
              <GlowInput
                label="Password *"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Min. 8 chars, uppercase, lowercase, number"
                value={formData.password}
                onChange={handleChange}
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
                label="Confirm Password *"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Repeat your password"
                value={formData.confirmPassword}
                onChange={handleChange}
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
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </GlowButton>
          </form>

          <div className="mt-8 pt-6 border-t border-border-grey text-center">
            <p className="text-text-muted text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:text-white transition-colors font-mono uppercase">
                Sign In
              </Link>
            </p>
          </div>
        </GlowCard>

        {/* Back to Home */}
        <div className="register-back mt-8 text-center">
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
