import { useRef, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { useAuth, useLang } from '@/context'
import { cn } from '@/utils'

// ============================================================================
// STATIC BACKGROUND — noise + subtle grid, no animated effects
// ============================================================================

export function AnimatedBackground() {
  return (
    <>
      {/* Film grain noise */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Subtle static grid */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </>
  )
}

// ============================================================================
// BUTTON — editorial, tracked, no glow
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

export function GlowButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
  onClick,
  disabled,
  type = 'button',
}: GlowButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-[10px]',
    md: 'px-5 py-3 text-[11px]',
    lg: 'px-6 py-3.5 text-[12px]',
  }

  if (variant === 'primary') {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'font-mono font-semibold uppercase tracking-[0.2em]',
          'bg-primary text-black',
          'transition-colors duration-200',
          'hover:bg-white',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          sizeClasses[size],
          className
        )}
      >
        {children}
      </button>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'font-mono font-medium uppercase tracking-[0.2em]',
        'bg-transparent border border-white/25 text-white',
        'transition-colors duration-200',
        'hover:border-white hover:text-white',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        sizeClasses[size],
        className
      )}
    >
      {children}
    </button>
  )
}

// ============================================================================
// CARD
// ============================================================================

interface GlowCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function GlowCard({ children, className, hover = true }: GlowCardProps) {
  return (
    <div
      className={cn(
        'bg-bg-dark border border-white/10',
        'transition-colors duration-200',
        hover && 'hover:border-white/25',
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================================================
// INPUT
// ============================================================================

interface GlowInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function GlowInput({ label, error, className, ...props }: GlowInputProps) {
  return (
    <div>
      {label && (
        <label className="block text-[10px] font-mono uppercase tracking-[0.22em] text-white/50 mb-2">
          {label}
        </label>
      )}
      <input
        {...props}
        className={cn(
          'w-full px-4 py-3 bg-transparent border',
          error ? 'border-destructive focus:border-destructive' : 'border-white/15 focus:border-white/60',
          'text-white placeholder-white/30 text-sm',
          'transition-colors duration-200',
          'focus:outline-none',
          className
        )}
      />
      {error && (
        <p className="mt-1 text-[11px] text-destructive font-mono tracking-wider">{error}</p>
      )}
    </div>
  )
}

// ============================================================================
// MAGNETIC ELEMENT
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
      gsap.to(el, { x: x * 0.1, y: y * 0.1, duration: 0.3, ease: 'power2.out' })
    }

    const handleMouseLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'power3.out' })
    }

    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return <div ref={ref} className={className}>{children}</div>
}

// ============================================================================
// NAVBAR
// ============================================================================

interface NewNavbarProps {
  transparent?: boolean
}

// Isolated live clock so the rest of the header doesn't re-render every second
function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className={className}>
      {now.toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      })}
    </span>
  )
}

export function NewNavbar({ transparent = false }: NewNavbarProps) {
  const { isAuthenticated, user, logout } = useAuth()
  const { lang, setLang, t } = useLang()
  const location = useLocation()

  const primaryLinks = [
    { label: t.nav.magazine, to: '/magazine', num: '01' },
    { label: t.nav.events, to: '/events', num: '02' },
  ]

  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const headerRef = useRef<HTMLElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const mobilePanelRef = useRef<HTMLDivElement>(null)
  const mobileItemsRef = useRef<HTMLDivElement>(null)
  const lastScroll = useRef(0)
  const hoverRaf = useRef<number | null>(null)

  // Scroll state: compressed + hide-on-scroll-down
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      const delta = y - lastScroll.current
      if (y > 140 && delta > 4) setHidden(true)
      else if (delta < -4) setHidden(false)
      lastScroll.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (menuOpen) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = original }
    }
  }, [menuOpen])

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/')

  // Build the full desktop nav item list (with role-gated extras) so hover pill can target any item
  const desktopItems: { key: string; to: string; label: string; num: string }[] = [
    ...primaryLinks.map((l) => ({ key: l.to, to: l.to, label: l.label, num: l.num })),
  ]
  if (isAuthenticated) {
    desktopItems.push({ key: '/my-tickets', to: '/my-tickets', label: t.nav.myTickets, num: '03' })
  }
  if (isAuthenticated && (user?.role === 'organizer' || user?.role === 'admin')) {
    desktopItems.push({ key: '/scan', to: '/scan', label: t.nav.scan, num: '04' })
  }

  // Hover-pill: slide a single indicator between nav items
  const moveToItem = (el: HTMLElement | null) => {
    if (!el || !pillRef.current || !navRef.current) return
    const parentRect = navRef.current.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    if (hoverRaf.current) cancelAnimationFrame(hoverRaf.current)
    hoverRaf.current = requestAnimationFrame(() => {
      gsap.to(pillRef.current, {
        x: r.left - parentRect.left,
        width: r.width,
        opacity: 1,
        duration: 0.4,
        ease: 'power3.out',
      })
    })
  }

  const snapToActive = () => {
    if (!navRef.current) return
    const activeEl = navRef.current.querySelector<HTMLElement>('[data-nav-active="true"]')
    if (activeEl) {
      moveToItem(activeEl)
    } else if (pillRef.current) {
      gsap.to(pillRef.current, { opacity: 0, duration: 0.25, ease: 'power2.out' })
    }
  }

  // Snap pill to active item on route change / initial mount
  useEffect(() => {
    const t = setTimeout(snapToActive, 50)
    return () => clearTimeout(t)
  }, [location.pathname, isAuthenticated, user?.role])

  useEffect(() => {
    window.addEventListener('resize', snapToActive)
    return () => window.removeEventListener('resize', snapToActive)
  }, [])

  // Mobile menu — full-screen with staggered reveals
  useEffect(() => {
    if (!mobilePanelRef.current) return
    if (menuOpen) {
      gsap.fromTo(
        mobilePanelRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }
      )
      if (mobileItemsRef.current) {
        gsap.fromTo(
          mobileItemsRef.current.querySelectorAll('[data-mobile-item]'),
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.05, ease: 'power3.out', delay: 0.05 }
        )
      }
    }
  }, [menuOpen])

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]',
          hidden && !menuOpen ? '-translate-y-full' : 'translate-y-0'
        )}
        aria-label="Site header"
      >
        {/* Top meta strip — suppressed when navbar is transparent (host page owns that space) */}
        {!transparent && (
          <div
            className={cn(
              'border-b border-white/10 bg-bg-dark overflow-hidden transition-[max-height,opacity] duration-[450ms] ease-[cubic-bezier(.2,.8,.2,1)]',
              scrolled ? 'max-h-0 opacity-0' : 'max-h-[36px] opacity-100'
            )}
          >
            <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-9 flex items-center gap-5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 tabular-nums">
              <span className="flex items-center gap-2">
                <span className="w-1 h-1 bg-primary" />
                <span className="hidden sm:inline">Prague · </span>
                <LiveClock />
              </span>
              <span className="opacity-40 hidden md:inline">/</span>
              <span className="hidden md:inline">48kHz — 24-bit</span>
              <div className="ml-auto">
                <LangPill lang={lang} setLang={setLang} />
              </div>
            </div>
          </div>
        )}

        {/* Main bar */}
        <div
          className={cn(
            'relative transition-all duration-500',
            transparent && !scrolled
              ? 'bg-transparent border-b border-transparent'
              : 'bg-bg-dark border-b border-white/10'
          )}
        >
          <div
            className={cn(
              'max-w-[1440px] mx-auto px-6 sm:px-10 flex items-center transition-[height] duration-500',
              scrolled ? 'h-14' : 'h-16'
            )}
          >
            {/* Logo */}
            <Link
              to="/"
              className="group flex items-center gap-3 shrink-0 z-10"
              aria-label="RAVETURE — home"
            >
              <div className="relative w-7 h-7">
                <div className="absolute inset-0 bg-primary transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:rotate-45" />
                <div className="absolute inset-0 bg-primary mix-blend-screen transition-opacity duration-300 opacity-0 group-hover:opacity-60 group-hover:scale-125" />
              </div>
              <span className="font-headline text-[15px] tracking-[-0.02em] uppercase select-none leading-none" style={{ fontWeight: 700 }}>
                RAVETURE
              </span>
            </Link>

            {/* Desktop nav — centered */}
            <nav
              ref={navRef}
              aria-label="Main"
              onMouseLeave={snapToActive}
              className="hidden md:flex items-center relative absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ position: 'absolute' }}
            >
              {/* Hover/active pill */}
              <div
                ref={pillRef}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 h-full bg-white/[0.06] border-x border-white/10"
                style={{ width: 0, opacity: 0 }}
              />

              <div className="flex items-stretch">
                {desktopItems.map((item) => {
                  const active = isActive(item.to)
                  return (
                    <Link
                      key={item.key}
                      to={item.to}
                      data-nav-active={active ? 'true' : undefined}
                      onMouseEnter={(e) => moveToItem(e.currentTarget)}
                      className={cn(
                        'group relative px-5 py-3 flex items-center gap-2.5 text-[11px] font-mono tracking-[0.22em] uppercase transition-colors duration-200',
                        active ? 'text-white' : 'text-white/55 hover:text-white'
                      )}
                    >
                      <span
                        className={cn(
                          'text-[9px] tabular-nums transition-colors',
                          active ? 'text-primary' : 'text-white/30 group-hover:text-primary'
                        )}
                      >
                        {item.num}
                      </span>
                      <span className="relative overflow-hidden">
                        <span className="block transition-transform duration-[450ms] ease-[cubic-bezier(.2,.8,.2,1)] group-hover:-translate-y-full">
                          {item.label}
                        </span>
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 block translate-y-full transition-transform duration-[450ms] ease-[cubic-bezier(.2,.8,.2,1)] group-hover:translate-y-0 text-primary"
                        >
                          {item.label}
                        </span>
                      </span>
                      {active && (
                        <span className="absolute left-5 right-5 bottom-1.5 h-px bg-primary" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </nav>

            {/* Right cluster */}
            <div className="hidden md:flex items-center gap-3 ml-auto z-10">
              {/* Lang toggle — only visible in main bar when top strip is hidden */}
              {transparent && <LangPill lang={lang} setLang={setLang} />}

              {isAuthenticated ? (
                <>
                  {user?.role === 'organizer' && (
                    <Link
                      to="/organizer"
                      className="text-[10px] font-mono tracking-[0.22em] uppercase px-3 py-2 border border-white/15 text-white/80 hover:border-white hover:text-white transition-colors"
                    >
                      Dashboard
                    </Link>
                  )}
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="text-[10px] font-mono tracking-[0.22em] uppercase px-3 py-2 border border-white/15 text-white/80 hover:border-white hover:text-white transition-colors"
                    >
                      Admin
                    </Link>
                  )}
                  <UserBadge
                    name={user?.display_name || user?.username || 'User'}
                    onLogout={logout}
                    logoutLabel={t.nav.logout}
                  />
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/70 hover:text-white transition-colors"
                  >
                    {t.nav.login}
                  </Link>
                  <Link
                    to="/register"
                    className="group inline-flex items-center gap-3 px-4 py-2 bg-primary text-black text-[10px] font-mono tracking-[0.22em] uppercase font-semibold hover:bg-white transition-colors duration-200"
                  >
                    <span>{t.nav.signUp}</span>
                    <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile burger */}
            <button
              className="md:hidden ml-auto z-10 w-10 h-10 flex flex-col items-center justify-center gap-[5px] group"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <span
                className={cn(
                  'block w-5 h-px bg-white transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]',
                  menuOpen ? 'translate-y-[3px] rotate-45' : ''
                )}
              />
              <span
                className={cn(
                  'block w-5 h-px bg-white transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]',
                  menuOpen ? '-translate-y-[3px] -rotate-45' : ''
                )}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile fullscreen overlay */}
      {menuOpen && (
        <div
          ref={mobilePanelRef}
          className="fixed inset-0 z-40 md:hidden bg-bg-dark overflow-y-auto"
          style={{ opacity: 0 }}
        >
          {/* Spacer for header */}
          <div className="h-16" />

          <div
            ref={mobileItemsRef}
            className="px-6 pt-6 pb-12"
          >
            {/* Kicker */}
            <div data-mobile-item className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-8 flex items-center gap-2">
              <span>§ Menu</span>
              <span className="opacity-40">/</span>
              <LiveClock className="text-white/60 tabular-nums" />
            </div>

            {/* Big nav links */}
            <nav className="flex flex-col divide-y divide-white/10 border-t border-b border-white/10">
              {desktopItems.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  data-mobile-item
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'group relative flex items-baseline gap-5 py-5 transition-colors',
                    isActive(item.to) ? 'text-white' : 'text-white/80 hover:text-white'
                  )}
                >
                  <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary tabular-nums w-8 shrink-0">
                    {item.num}
                  </span>
                  <span
                    className="font-headline uppercase leading-none tracking-[-0.02em] flex-1"
                    style={{ fontSize: 'clamp(2.25rem,9vw,3.5rem)', fontWeight: 700 }}
                  >
                    {item.label}
                  </span>
                  <span className="text-white/30 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 text-2xl">
                    →
                  </span>
                </Link>
              ))}
            </nav>

            {/* Meta row */}
            <div data-mobile-item className="mt-12 pt-8 border-t border-white/10">
              {isAuthenticated ? (
                <div className="flex flex-col gap-5">
                  <div>
                    <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mb-1.5">
                      {t.nav.signedInAs}
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="font-headline text-2xl text-white hover:text-primary transition-colors"
                      style={{ fontWeight: 600 }}
                    >
                      {user?.display_name || user?.username}
                    </Link>
                  </div>
                  <button
                    onClick={() => { logout(); setMenuOpen(false) }}
                    className="self-start text-[10px] font-mono tracking-[0.22em] uppercase px-4 py-2.5 border border-white/20 text-white/80 hover:border-white hover:text-white transition-colors"
                  >
                    {t.nav.logout}
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 text-center px-4 py-4 border border-white/20 text-white text-[11px] font-mono tracking-[0.22em] uppercase hover:border-white transition-colors"
                  >
                    {t.nav.login}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 text-center px-4 py-4 bg-primary text-black text-[11px] font-mono tracking-[0.22em] uppercase font-semibold hover:bg-white transition-colors"
                  >
                    {t.nav.signUp}
                  </Link>
                </div>
              )}
            </div>

            {/* Language + colophon */}
            <div data-mobile-item className="mt-10 flex items-center justify-between gap-4">
              <LangPill lang={lang} setLang={setLang} />
              <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/30">
                © RAVETURE
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Language toggle with sliding indicator
function LangPill({
  lang,
  setLang,
}: {
  lang: 'en' | 'cs'
  setLang: (l: 'en' | 'cs') => void
}) {
  return (
    <div className="relative inline-flex items-center border border-white/15 select-none">
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 w-1/2 bg-primary transition-transform duration-[400ms] ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{ transform: lang === 'en' ? 'translateX(0%)' : 'translateX(100%)' }}
      />
      <button
        type="button"
        onClick={() => setLang('en')}
        className={cn(
          'relative z-10 px-2.5 py-1 text-[10px] font-mono tracking-[0.22em] uppercase transition-colors duration-200',
          lang === 'en' ? 'text-black font-semibold' : 'text-white/70 hover:text-white'
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('cs')}
        className={cn(
          'relative z-10 px-2.5 py-1 text-[10px] font-mono tracking-[0.22em] uppercase transition-colors duration-200',
          lang === 'cs' ? 'text-black font-semibold' : 'text-white/70 hover:text-white'
        )}
      >
        CS
      </button>
    </div>
  )
}

// Avatar-like initials + hover logout
function UserBadge({
  name,
  logoutLabel,
  onLogout,
}: {
  name: string
  logoutLabel: string
  onLogout: () => void
}) {
  const initials = name
    .split(/\s+|_/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="group relative">
      <Link
        to="/profile"
        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 border border-white/15 hover:border-white/50 transition-colors"
      >
        <span className="w-6 h-6 bg-primary text-black text-[10px] font-mono font-semibold tracking-wider flex items-center justify-center">
          {initials || '∙'}
        </span>
        <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/80 max-w-[120px] truncate">
          {name}
        </span>
      </Link>

      {/* Hover dropdown */}
      <div className="absolute right-0 top-full mt-1 w-48 bg-bg-dark border border-white/15 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200">
        <Link
          to="/profile"
          className="block px-4 py-3 text-[10px] font-mono tracking-[0.22em] uppercase text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors border-b border-white/10"
        >
          § Profile
        </Link>
        <Link
          to="/my-tickets"
          className="block px-4 py-3 text-[10px] font-mono tracking-[0.22em] uppercase text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors border-b border-white/10"
        >
          § Tickets
        </Link>
        <button
          onClick={onLogout}
          className="w-full text-left px-4 py-3 text-[10px] font-mono tracking-[0.22em] uppercase text-white/70 hover:text-primary hover:bg-white/[0.04] transition-colors"
        >
          {logoutLabel}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// FOOTER
// ============================================================================

export function NewFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="relative border-t border-white/10 bg-bg-dark">
      {/* Colophon strip */}
      <div className="border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-9 flex items-center gap-5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50">
          <span className="text-primary text-xs leading-none">◆</span>
          <span className="text-white/80 font-medium">Colophon</span>
          <span className="opacity-40">/</span>
          <span>Bulletin Nº 007</span>
          <span className="opacity-40 hidden sm:inline">·</span>
          <span className="hidden sm:inline">48kHz / 24-bit</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-1 h-1 bg-primary" />
            <span className="hidden sm:inline">Broadcast live</span>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-14 sm:py-16 grid grid-cols-12 gap-6 sm:gap-10">
        {/* Lockup + statement */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-5">
          <Link to="/" className="flex items-center gap-2.5 mb-5">
            <div className="w-6 h-6 bg-primary" />
            <span className="text-base font-bold tracking-tight uppercase">RAVETURE</span>
          </Link>
          <p className="text-white/55 text-[14px] leading-[1.65] max-w-sm">
            Ticketing, archive and broadcast infrastructure for underground electronic music.
            Built so the scene can keep its own receipts.
          </p>
        </div>

        {/* Sections */}
        <nav className="col-span-6 sm:col-span-3 lg:col-span-2">
          <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-4">
            § Programme
          </div>
          <ul className="space-y-2.5 text-[13px]">
            <li><Link to="/events" className="text-white/70 hover:text-white transition-colors">Events</Link></li>
            <li><Link to="/magazine" className="text-white/70 hover:text-white transition-colors">Magazine</Link></li>
            <li><Link to="/my-tickets" className="text-white/70 hover:text-white transition-colors">My tickets</Link></li>
          </ul>
        </nav>

        <nav className="col-span-6 sm:col-span-3 lg:col-span-2">
          <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-4">
            § House
          </div>
          <ul className="space-y-2.5 text-[13px]">
            <li><a href="#" className="text-white/70 hover:text-white transition-colors">Privacy</a></li>
            <li><a href="#" className="text-white/70 hover:text-white transition-colors">Terms</a></li>
            <li><a href="#" className="text-white/70 hover:text-white transition-colors">Contact</a></li>
          </ul>
        </nav>

        {/* Signal off */}
        <div className="col-span-12 lg:col-span-3 flex flex-col items-start lg:items-end justify-between gap-4">
          <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40">
            <span className="text-primary">—</span> Est. 2025
          </div>
          <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 tabular-nums">
            © {year} RAVETURE
          </div>
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

export function PageWrapper({
  children,
  showNavbar = true,
  showFooter = true,
  transparentNavbar = false,
  className,
}: PageWrapperProps) {
  return (
    <div className={cn('relative min-h-screen bg-bg-dark text-white overflow-x-hidden', className)}>
      <AnimatedBackground />
      {showNavbar && <NewNavbar transparent={transparentNavbar} />}
      {children}
      {showFooter && <NewFooter />}
    </div>
  )
}
