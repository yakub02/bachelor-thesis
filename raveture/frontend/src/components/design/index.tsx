import { useRef, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import gsap from 'gsap'
import { useAuth } from '@/context'
import { cn } from '@/utils'

// ============================================================================
// ANIMATED BACKGROUND WITH GRID + NOISE + FLOATING PARTICLES
// ============================================================================

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    const particles: Array<{
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number
    }> = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const createParticles = () => {
      particles.length = 0
      const count = Math.floor((canvas.width * canvas.height) / 15000)
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.5 + 0.1,
        })
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.x += p.speedX
        p.y += p.speedY

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(218, 120, 88, ${p.opacity})`
        ctx.fill()
      })

      animationId = requestAnimationFrame(animate)
    }

    resize()
    createParticles()
    animate()

    window.addEventListener('resize', () => {
      resize()
      createParticles()
    })

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <>
      {/* Noise overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Animated grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 animate-grid-pulse"
          style={{
            backgroundImage: `
              linear-gradient(rgba(218, 120, 88, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(218, 120, 88, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Floating particles canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />

      {/* Gradient orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-[150px] animate-float-slow" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-[150px] animate-float-slow-reverse" />
      </div>
    </>
  )
}

// ============================================================================
// GLOWING BUTTON COMPONENT
// ============================================================================

interface GlowButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}

export function GlowButton({ children, variant = 'primary', size = 'md', className, onClick, disabled, type = 'button' }: GlowButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  }

  if (variant === 'primary') {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'relative group font-mono font-bold uppercase tracking-wider',
          'bg-primary text-black',
          'transition-all duration-300',
          'hover:shadow-[0_0_30px_rgba(218,120,88,0.5)]',
          'active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
          sizeClasses[size],
          className
        )}
      >
        {/* Glow effect */}
        <span className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-300" />
        <span className="relative z-10">{children}</span>
      </button>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative group font-mono font-bold uppercase tracking-wider',
        'bg-transparent border border-border-grey text-white',
        'transition-all duration-300',
        'hover:border-primary hover:text-primary',
        'hover:shadow-[0_0_20px_rgba(218,120,88,0.2)]',
        'active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border-grey disabled:hover:text-white disabled:hover:shadow-none',
        sizeClasses[size],
        className
      )}
    >
      <span className="relative z-10">{children}</span>
    </button>
  )
}

// ============================================================================
// GLOWING CARD
// ============================================================================

interface GlowCardProps {
  children: React.ReactNode
  className?: string
  glowColor?: string
  hover?: boolean
}

export function GlowCard({ children, className, glowColor = 'rgba(218, 120, 88, 0.15)', hover = true }: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current || !hover) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => hover && setIsHovered(true)}
      onMouseLeave={() => hover && setIsHovered(false)}
      className={cn(
        'relative overflow-hidden',
        'bg-graphite/50 backdrop-blur-sm',
        'border border-border-grey',
        'transition-all duration-500',
        hover && 'hover:border-primary/50',
        className
      )}
    >
      {/* Cursor glow effect */}
      {isHovered && hover && (
        <div
          className="absolute pointer-events-none transition-opacity duration-300"
          style={{
            left: mousePos.x,
            top: mousePos.y,
            width: 300,
            height: 300,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ============================================================================
// GLOW INPUT
// ============================================================================

interface GlowInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function GlowInput({ label, error, className, ...props }: GlowInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <div className="relative">
      {label && (
        <label className="block text-xs font-mono uppercase text-text-muted mb-2 tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          onFocus={(e) => {
            setIsFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            props.onBlur?.(e)
          }}
          className={cn(
            'w-full px-4 py-3 bg-bg-dark/50 border',
            error ? 'border-red-500' : 'border-border-grey',
            'text-white placeholder-text-muted font-mono',
            'transition-all duration-300',
            'focus:outline-none',
            error ? 'focus:border-red-500' : 'focus:border-primary',
            error ? 'focus:shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'focus:shadow-[0_0_20px_rgba(218,120,88,0.2)]',
            className
          )}
        />
        {isFocused && !error && (
          <div className="absolute inset-0 -z-10 bg-primary/10 blur-xl transition-opacity duration-300" />
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-400 font-mono">{error}</p>
      )}
    </div>
  )
}

// ============================================================================
// MAGNETIC ELEMENT (follows cursor slightly)
// ============================================================================

export function MagneticElement({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2

      gsap.to(el, {
        x: x * 0.1,
        y: y * 0.1,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.3)',
      })
    }

    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

// ============================================================================
// NAVBAR
// ============================================================================

interface NewNavbarProps {
  transparent?: boolean
}

const NAV_LINKS = [
  { label: 'Events', to: '/events' },
]

export function NewNavbar({ transparent = false }: NewNavbarProps) {
  const { isAuthenticated, user, logout } = useAuth()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Scroll-aware background
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // GSAP animation for mobile menu
  useEffect(() => {
    if (!mobileMenuRef.current) return
    gsap.to(mobileMenuRef.current, {
      maxHeight: menuOpen ? 520 : 0,
      opacity: menuOpen ? 1 : 0,
      duration: menuOpen ? 0.38 : 0.22,
      ease: menuOpen ? 'power3.out' : 'power3.in',
    })
  }, [menuOpen])

  const close = () => setMenuOpen(false)
  const showBg = !transparent || scrolled

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/')

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        showBg
          ? 'bg-bg-dark/90 backdrop-blur-xl border-b border-border-grey/40'
          : 'bg-transparent'
      )}
    >
      {/* ── Main bar ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 relative flex items-center">

        {/* Logo — always left */}
        <Link
          to="/"
          onClick={close}
          className="flex items-center gap-2.5 group shrink-0 z-10"
        >
          <div className="w-7 h-7 bg-primary transition-all duration-300 group-hover:shadow-[0_0_18px_rgba(218,120,88,0.55)]" />
          <span className="text-base font-bold tracking-tighter uppercase select-none">
            RAVETURE
          </span>
        </Link>

        {/* Desktop nav — absolutely centered in the bar */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'relative text-xs font-mono uppercase tracking-wider transition-colors',
                'after:absolute after:-bottom-1 after:left-0 after:h-px after:bg-primary after:transition-all after:duration-300',
                isActive(link.to)
                  ? 'text-white after:w-full'
                  : 'text-text-muted hover:text-white after:w-0 hover:after:w-full'
              )}
            >
              {link.label}
            </Link>
          ))}

          {isAuthenticated && (
            <Link
              to="/my-tickets"
              className={cn(
                'relative text-xs font-mono uppercase tracking-wider transition-colors',
                'after:absolute after:-bottom-1 after:left-0 after:h-px after:bg-primary after:transition-all after:duration-300',
                isActive('/my-tickets')
                  ? 'text-white after:w-full'
                  : 'text-text-muted hover:text-white after:w-0 hover:after:w-full'
              )}
            >
              My Tickets
            </Link>
          )}

          {isAuthenticated && (user?.role === 'organizer' || user?.role === 'admin') && (
            <Link
              to="/scan"
              className={cn(
                'relative text-xs font-mono uppercase tracking-wider transition-colors',
                'after:absolute after:-bottom-1 after:left-0 after:h-px after:bg-primary after:transition-all after:duration-300',
                isActive('/scan')
                  ? 'text-white after:w-full'
                  : 'text-text-muted hover:text-white after:w-0 hover:after:w-full'
              )}
            >
              Scan
            </Link>
          )}
        </nav>

        {/* Desktop CTA — always right */}
        <div className="hidden md:flex items-center gap-3 ml-auto z-10">
          {isAuthenticated ? (
            <>
              {/* Role-specific link */}
              {user?.role === 'organizer' && (
                <Link to="/organizer">
                  <GlowButton variant="outline" size="sm">Dashboard</GlowButton>
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link to="/admin">
                  <GlowButton variant="outline" size="sm">Admin</GlowButton>
                </Link>
              )}

              {/* Username chip → profile */}
              <Link
                to="/profile"
                className="max-w-[130px] truncate text-xs font-mono text-text-muted hover:text-primary transition-colors"
              >
                {user?.display_name || user?.username}
              </Link>

              <GlowButton variant="outline" size="sm" onClick={logout}>
                Logout
              </GlowButton>
            </>
          ) : (
            <>
              <Link to="/login">
                <GlowButton variant="outline" size="sm">Login</GlowButton>
              </Link>
              <Link to="/register">
                <GlowButton variant="primary" size="sm">Sign Up</GlowButton>
              </Link>
            </>
          )}
        </div>

        {/* Mobile: hamburger — always right */}
        <button
          className="md:hidden ml-auto z-10 w-9 h-9 flex items-center justify-center border border-border-grey/70 text-text-muted hover:border-primary hover:text-primary transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Mobile menu ─────────────────────────────────────────────── */}
      <div
        ref={mobileMenuRef}
        className="md:hidden overflow-hidden border-t border-border-grey/40 bg-bg-dark/95 backdrop-blur-xl"
        style={{ maxHeight: 0, opacity: 0 }}
      >
        <div className="px-5 pt-4 pb-6 flex flex-col">
          {/* Nav links */}
          <div className="flex flex-col divide-y divide-border-grey/30">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={close}
                className={cn(
                  'flex items-center gap-3 py-3.5 text-sm font-mono uppercase tracking-wider transition-colors',
                  isActive(link.to) ? 'text-primary' : 'text-text-muted hover:text-white'
                )}
              >
                <span className="text-primary text-[10px]">◆</span>
                {link.label}
              </Link>
            ))}

            {isAuthenticated && (
              <Link
                to="/my-tickets"
                onClick={close}
                className={cn(
                  'flex items-center gap-3 py-3.5 text-sm font-mono uppercase tracking-wider transition-colors',
                  isActive('/my-tickets') ? 'text-primary' : 'text-text-muted hover:text-white'
                )}
              >
                <span className="text-primary text-[10px]">◆</span>
                My Tickets
              </Link>
            )}

            {isAuthenticated && user?.role === 'organizer' && (
              <Link
                to="/organizer"
                onClick={close}
                className="flex items-center gap-3 py-3.5 text-sm font-mono uppercase tracking-wider text-text-muted hover:text-white transition-colors"
              >
                <span className="text-primary text-[10px]">◆</span>
                Dashboard
              </Link>
            )}

            {isAuthenticated && user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={close}
                className="flex items-center gap-3 py-3.5 text-sm font-mono uppercase tracking-wider text-text-muted hover:text-white transition-colors"
              >
                <span className="text-primary text-[10px]">◆</span>
                Admin
              </Link>
            )}

            {isAuthenticated && (user?.role === 'organizer' || user?.role === 'admin') && (
              <Link
                to="/scan"
                onClick={close}
                className={cn(
                  'flex items-center gap-3 py-3.5 text-sm font-mono uppercase tracking-wider transition-colors',
                  isActive('/scan') ? 'text-primary' : 'text-text-muted hover:text-white'
                )}
              >
                <span className="text-primary text-[10px]">◆</span>
                Scan Tickets
              </Link>
            )}
          </div>

          {/* Auth section */}
          <div className="mt-5 pt-5 border-t border-border-grey/40">
            {isAuthenticated ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-mono text-text-muted">
                  Signed in as{' '}
                  <Link
                    to="/profile"
                    onClick={close}
                    className="text-primary hover:underline"
                  >
                    {user?.display_name || user?.username}
                  </Link>
                </p>
                <GlowButton
                  variant="outline"
                  size="sm"
                  onClick={() => { logout(); close() }}
                  className="w-full"
                >
                  Logout
                </GlowButton>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" onClick={close} className="flex-1">
                  <GlowButton variant="outline" size="sm" className="w-full">
                    Login
                  </GlowButton>
                </Link>
                <Link to="/register" onClick={close} className="flex-1">
                  <GlowButton variant="primary" size="sm" className="w-full">
                    Sign Up
                  </GlowButton>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

// ============================================================================
// FOOTER - NEW DESIGN
// ============================================================================

export function NewFooter() {
  return (
    <footer className="border-t border-border-grey py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-primary" />
            <span className="text-lg font-bold tracking-tighter uppercase">RAVETURE</span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-8 text-xs font-mono uppercase text-text-muted">
            {['Privacy', 'Terms', 'Contact'].map((item) => (
              <a key={item} href="#" className="hover:text-primary transition-colors">
                {item}
              </a>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-xs font-mono text-text-muted">
            © 2026 RAVETURE. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

// ============================================================================
// PAGE WRAPPER
// ============================================================================

interface PageWrapperProps {
  children: React.ReactNode
  showNavbar?: boolean
  showFooter?: boolean
  transparentNavbar?: boolean
  className?: string
}

export function PageWrapper({ children, showNavbar = true, showFooter = true, transparentNavbar = false, className }: PageWrapperProps) {
  return (
    <div className={cn('relative min-h-screen bg-bg-dark text-white overflow-x-hidden', className)}>
      <AnimatedBackground />
      {showNavbar && <NewNavbar transparent={transparentNavbar} />}
      {children}
      {showFooter && <NewFooter />}
    </div>
  )
}
