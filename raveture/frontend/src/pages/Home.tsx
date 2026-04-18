import { useEffect, useRef, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { NewNavbar, NewFooter } from '@/components/design'
import { ravetureApi, type Event } from '@/services/ravetureApi'
import { RavePicks } from '@/components/home/RavePicks'

gsap.registerPlugin(ScrollTrigger)

// ════════════════════════════ CONSTANTS ════════════════════════════

const ISSUE_NUMBER = '007'

const HEADLINE_WORDS = ['THE', 'FLOOR', 'KEEPS', 'ITS', 'OWN', 'RECORDS.']

const TICKER_ITEMS = [
  'TECHNO', 'AMBIENT', 'DRUM & BASS', 'ELECTRO', 'DUB TECHNO',
  'TRANCE', 'BREAKCORE', 'EXPERIMENTAL', 'HOUSE', 'HARDGROOVE',
  'IDM', 'GQOM', 'DECONSTRUCTED CLUB', 'MINIMAL', 'GABBER',
]

const CITY_SIGNALS = [
  { city: 'PRAGUE', code: 'PRG', count: 42 },
  { city: 'BERLIN', code: 'BER', count: 128 },
  { city: 'LONDON', code: 'LDN', count: 87 },
  { city: 'WARSAW', code: 'WAW', count: 23 },
  { city: 'VIENNA', code: 'VIE', count: 31 },
]

// ════════════════════════════ HELPERS ════════════════════════════

function formatIssueDate(d = new Date()): string {
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const day = String(d.getDate()).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}

function formatEventDate(iso: string) {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const year = String(d.getFullYear()).slice(-2)
  const weekday = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return { day, month, year, weekday, time, full: `${day}.${month}.${year}` }
}

// ════════════════════════════ COUNT-UP ════════════════════════════

function CountUp({ to, duration = 1.4 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obj = { n: 0 }
    const tween = gsap.to(obj, {
      n: to,
      duration,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => { el.textContent = Math.round(obj.n).toLocaleString() },
    })
    return () => { tween.kill() }
  }, [to, duration])
  return <span ref={ref} className="tabular-nums">0</span>
}

// ════════════════════════════ HOME ════════════════════════════

export function Home() {
  const [events, setEvents] = useState<Event[]>([])
  const [latestArticle, setLatestArticle] = useState<any>(null)

  const heroRef = useRef<HTMLElement>(null)
  const heroSpotlightRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const featuredImgRef = useRef<HTMLDivElement>(null)
  const featuredRef = useRef<HTMLElement>(null)
  const programmeRef = useRef<HTMLElement>(null)
  const principlesRef = useRef<HTMLElement>(null)
  const dispatchRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)

  // Data
  useEffect(() => {
    ravetureApi.getEvents({ per_page: 8 }).then((r) => setEvents(r.events)).catch(() => {})
  }, [])

  useEffect(() => {
    ravetureApi
      .getForumThreads('editorial', 1)
      .then((d) => { if (d.threads.length > 0) setLatestArticle(d.threads[0]) })
      .catch(() => {})
  }, [])

  const issueDate = useMemo(() => formatIssueDate(), [])
  const featured = events[0]
  const programme = events.slice(1, 7)
  const totalEvents = events.length

  // Hero cursor spotlight — smooth-tween CSS vars so the gradient trails the cursor
  useEffect(() => {
    const hero = heroRef.current
    const light = heroSpotlightRef.current
    if (!hero || !light) return
    light.style.setProperty('--mx', '50%')
    light.style.setProperty('--my', '40%')

    const onMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * 100
      const my = ((e.clientY - rect.top) / rect.height) * 100
      gsap.to(light, {
        '--mx': `${mx}%`,
        '--my': `${my}%`,
        duration: 0.5,
        ease: 'power3.out',
        overwrite: 'auto',
      })
    }
    hero.addEventListener('mousemove', onMove)
    return () => hero.removeEventListener('mousemove', onMove)
  }, [])

  // Headline word reveal + subsequent hero items
  useGSAP(() => {
    if (!heroRef.current) return
    const words = headlineRef.current?.querySelectorAll('[data-word]')
    const tail = heroRef.current.querySelectorAll('[data-hero-tail]')

    const tl = gsap.timeline({ delay: 0.2 })
    if (words) {
      tl.fromTo(
        words,
        { yPercent: 110, rotate: -6, opacity: 0 },
        {
          yPercent: 0,
          rotate: 0,
          opacity: 1,
          duration: 1.0,
          stagger: 0.07,
          ease: 'power4.out',
        }
      )
    }
    tl.fromTo(
      tail,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' },
      '-=0.5'
    )
  }, [])

  // Parallax on featured cover
  useGSAP(() => {
    const img = featuredImgRef.current
    const container = featuredRef.current
    if (!img || !container) return
    const tween = gsap.fromTo(
      img,
      { yPercent: -8 },
      {
        yPercent: 8,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.8,
        },
      }
    )
    return () => { tween.scrollTrigger?.kill(); tween.kill() }
  }, [featured?.id])

  // Section scroll reveals
  useGSAP(() => {
    const scope = [programmeRef, principlesRef, dispatchRef, ctaRef, featuredRef]
    scope.forEach((r) => {
      const section = r.current
      if (!section) return
      const items = section.querySelectorAll<HTMLElement>('[data-scroll]')
      gsap.fromTo(
        items,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          stagger: 0.06,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 82%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    })
  }, [events.length, !!latestArticle])

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden font-body">
      <NewNavbar transparent />

      {/* ═══════════════ ISSUE STRIP (metadata header) ═══════════════ */}
      <div className="pt-16 border-b border-white/10 relative z-10">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-9 flex items-center gap-5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 tabular-nums">
          <span className="text-primary text-xs leading-none">◆</span>
          <span className="text-white font-medium">RAVETURE</span>
          <span className="opacity-40">/</span>
          <span>Bulletin Nº&nbsp;{ISSUE_NUMBER}</span>
          <span className="opacity-40">·</span>
          <span>{issueDate}</span>
          <span className="opacity-40 hidden lg:inline">·</span>
          <span className="hidden lg:inline">48kHz / 24-bit</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-1 h-1 bg-primary animate-pulse-dim" />
            <span>Broadcast live</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section
        ref={heroRef}
        className="relative isolate overflow-hidden min-h-[72vh] flex flex-col"
      >
        {/* Ambient rotating glow — singular depth element */}
        <div
          className="absolute top-[-25%] left-[40%] w-[90vw] h-[90vw] max-w-[1400px] max-h-[1400px] opacity-70 pointer-events-none"
          aria-hidden
        >
          <div
            className="absolute inset-0 rotate-slow"
            style={{
              background:
                'conic-gradient(from 120deg at 50% 50%, rgba(218,120,88,0.14), rgba(218,120,88,0) 28%, rgba(255,255,255,0.04) 60%, rgba(218,120,88,0.08) 88%, rgba(218,120,88,0) 100%)',
              filter: 'blur(80px)',
            }}
          />
        </div>

        {/* Cursor spotlight */}
        <div
          ref={heroSpotlightRef}
          className="absolute inset-0 pointer-events-none transition-opacity duration-500 opacity-0 hover:opacity-100 md:opacity-100"
          aria-hidden
          style={{
            background:
              'radial-gradient(520px circle at var(--mx,50%) var(--my,40%), rgba(218, 120, 88, 0.14), transparent 60%)',
          }}
        />

        {/* Fine scanlines on top */}
        <div className="absolute inset-0 scanlines pointer-events-none" aria-hidden />

        {/* Film grain */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />

        <div className="relative flex-1 max-w-[1440px] mx-auto w-full px-6 sm:px-10 pt-10 sm:pt-14 pb-10 flex flex-col">
          {/* Kicker */}
          <div
            data-hero-tail
            className="flex items-center gap-4 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 mb-10"
          >
            <span className="w-10 h-px bg-primary" />
            <span className="text-white/70">§ 01 / Statement</span>
            <span className="opacity-40">·</span>
            <span>Est. 2025</span>
          </div>

          {/* Headline — word rise */}
          <h1
            ref={headlineRef}
            className="font-headline text-[clamp(2.25rem,9vw,8rem)] leading-[0.9] tracking-[-0.035em] uppercase"
            style={{ fontWeight: 700 }}
          >
            {HEADLINE_WORDS.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden align-top pr-[0.18em]">
                <span
                  data-word
                  className="inline-block will-change-transform"
                  style={{
                    color: i === 5 ? 'var(--color-primary)' : undefined,
                  }}
                >
                  {w}
                </span>
              </span>
            ))}
          </h1>

          {/* Sub + stats + CTAs row */}
          <div className="mt-auto pt-10 grid grid-cols-12 gap-6 sm:gap-10 items-end">
            <p
              data-hero-tail
              className="col-span-12 md:col-span-5 text-sm md:text-[15px] leading-[1.6] text-white/70 max-w-md"
            >
              Ticketing, archive and broadcast infrastructure for underground electronic
              music. Built so the scene can keep its own receipts — its own
              history.
            </p>

            <div
              data-hero-tail
              className="col-span-12 md:col-span-4 md:col-start-7 grid grid-cols-3 gap-5 text-[10px] font-mono tracking-[0.2em] uppercase text-white/50"
            >
              <div>
                <div className="text-white text-xl font-headline mb-1" style={{ fontWeight: 500 }}>
                  <CountUp to={156} />
                </div>
                <div>Nights logged</div>
              </div>
              <div>
                <div className="text-white text-xl font-headline mb-1" style={{ fontWeight: 500 }}>
                  <CountUp to={12847} />
                </div>
                <div>On the list</div>
              </div>
              <div>
                <div className="text-white text-xl font-headline mb-1" style={{ fontWeight: 500 }}>
                  0<span className="text-primary">%</span>
                </div>
                <div>Scalper fee</div>
              </div>
            </div>

            <div
              data-hero-tail
              className="col-span-12 md:col-span-3 md:col-start-11 md:justify-self-end flex flex-col gap-2 w-full md:w-auto"
            >
              <Link
                to="/events"
                className="group relative inline-flex items-center justify-between gap-6 px-5 py-3.5 bg-white text-black text-[11px] font-mono tracking-[0.18em] uppercase font-semibold hover:bg-primary hover:text-black transition-colors duration-200"
              >
                <span>The Programme</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
              <Link
                to="/register"
                className="group inline-flex items-center justify-between gap-6 px-5 py-3.5 border border-white/25 text-white text-[11px] font-mono tracking-[0.18em] uppercase hover:border-white transition-colors duration-200"
              >
                <span>Get on the list</span>
                <span className="text-white/50 group-hover:text-white transition-colors">+</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom ticker */}
        <div className="relative border-t border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
          <div className="marquee-track flex w-max py-3.5 text-[10px] font-mono tracking-[0.28em] uppercase text-white/55">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="flex items-center gap-6 px-6 whitespace-nowrap">
                <span className={i % 4 === 0 ? 'text-primary' : ''}>◆</span>
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FEATURED COVER STORY ═══════════════════════ */}
      {featured && (
        <section ref={featuredRef} className="relative border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 pt-14 pb-16 sm:pt-20 sm:pb-24">
            {/* Section header */}
            <div
              data-scroll
              className="flex items-end justify-between pb-5 mb-10 border-b border-white/10"
            >
              <div>
                <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-2.5">
                  § 02 / Cover
                </div>
                <div className="font-headline text-xl md:text-2xl tracking-tight" style={{ fontWeight: 500 }}>
                  Tonight we're looking at —
                </div>
              </div>
              <div className="hidden sm:block text-right text-[11px] font-mono tracking-[0.2em] uppercase text-white/40 tabular-nums">
                Cat. Nº {ISSUE_NUMBER}.{String(featured.id || '').slice(0, 4).toUpperCase() || '0001'}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6 sm:gap-10 items-start">
              {/* Image with parallax */}
              <Link
                to={`/events/${featured.slug || featured.id}`}
                data-scroll
                className="col-span-12 sm:col-span-7 lg:col-span-5 group relative block aspect-[3/4] overflow-hidden bg-graphite"
              >
                <div ref={featuredImgRef} className="absolute inset-0 -top-[8%] -bottom-[8%]">
                  {featured.cover_image_url ? (
                    <img
                      src={featured.cover_image_url}
                      alt={featured.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/30">
                      <span className="font-headline text-[12rem]" style={{ fontWeight: 300 }}>◆</span>
                    </div>
                  )}
                </div>

                {/* Duotone overlay */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/20 via-transparent to-black/70 mix-blend-multiply" />

                {/* Corner tickers */}
                <div className="absolute top-5 left-5 right-5 flex items-start justify-between text-[10px] font-mono tracking-[0.22em] uppercase">
                  <span className="px-2 py-1 bg-white text-black font-semibold">FEATURED</span>
                  <span className="text-white/80 bg-black/50 px-2 py-1 backdrop-blur-sm tabular-nums">
                    {formatEventDate(featured.starts_at).weekday} ·{' '}
                    {formatEventDate(featured.starts_at).full}
                  </span>
                </div>

                {/* Countdown — big floating */}
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                  <div className="text-white">
                    <div
                      className="font-headline text-[clamp(2.25rem,6vw,5.25rem)] leading-[0.85] tracking-[-0.03em]"
                      style={{ fontWeight: 700 }}
                    >
                      T<span className="text-primary">—</span>
                      <span className="tabular-nums">{daysUntil(featured.starts_at)}</span>
                    </div>
                    <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/60 mt-1">
                      days to floor
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.22em] uppercase text-white/80 bg-black/40 px-3 py-2 backdrop-blur-sm">
                    Open cover →
                  </span>
                </div>
              </Link>

              {/* Metadata column */}
              <div data-scroll className="col-span-12 sm:col-span-5 lg:col-span-7 flex flex-col lg:pl-4">
                <h2
                  className="font-headline text-[clamp(2rem,4vw,3.75rem)] leading-[0.95] tracking-[-0.03em] uppercase"
                  style={{ fontWeight: 700 }}
                >
                  {featured.name}
                </h2>

                {featured.short_description && (
                  <p className="mt-5 text-white/60 text-[14px] leading-[1.65] max-w-md">
                    {featured.short_description}
                  </p>
                )}

                {/* Technical spec table */}
                <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-[13px] border-t border-white/10 pt-6">
                  {[
                    ['Venue', featured.venue?.name || 'TBA'],
                    ['Location', featured.venue?.city || '—'],
                    ['Doors', featured.doors_open_at
                      ? new Date(featured.doors_open_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                      : formatEventDate(featured.starts_at).time],
                    ['Minimum age', featured.min_age ? `${featured.min_age}+` : 'All ages'],
                    ['Tagged', featured.genres?.slice(0, 3).join(' / ') || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 pt-1">
                        {k}
                      </dt>
                      <dd className="text-white/90 border-b border-white/10 pb-3 -mt-1">
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-8 flex items-center gap-5">
                  <Link
                    to={`/events/${featured.slug || featured.id}`}
                    className="group inline-flex items-center gap-3 px-5 py-3.5 bg-primary text-black text-[11px] font-mono tracking-[0.2em] uppercase font-semibold hover:bg-white transition-colors duration-200"
                  >
                    <span>Buy ticket</span>
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </Link>
                  <Link
                    to={`/events/${featured.slug || featured.id}#lineup`}
                    className="text-[11px] font-mono tracking-[0.22em] uppercase text-white/60 hover:text-white link-underline"
                  >
                    See line-up
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════ PROGRAMME INDEX ═══════════════════════ */}
      <section ref={programmeRef} className="relative border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <header
            data-scroll
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-5 mb-10 border-b border-white/40"
          >
            <div>
              <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-2.5">
                § 03 / Programme
              </div>
              <h2
                className="font-headline text-[clamp(2rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.035em] uppercase"
                style={{ fontWeight: 700 }}
              >
                Nights on<br />the board.
              </h2>
            </div>

            <div className="flex items-center gap-6 sm:flex-col sm:items-end">
              <div className="text-right">
                <div
                  className="font-headline text-3xl sm:text-4xl leading-none"
                  style={{ fontWeight: 500 }}
                >
                  <CountUp to={totalEvents} />
                </div>
                <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mt-1">
                  on rotation
                </div>
              </div>
              <Link
                to="/events"
                className="group text-[11px] font-mono tracking-[0.22em] uppercase text-white/60 hover:text-primary inline-flex items-center gap-2 transition-colors"
              >
                <span className="link-underline">Full index</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </header>

          {programme.length > 0 ? (
            <ul className="divide-y divide-white/10 border-b border-white/10">
              {programme.map((event, i) => {
                const d = formatEventDate(event.starts_at)
                const num = String(i + 1).padStart(2, '0')
                return (
                  <li key={event.id} data-scroll>
                    <Link
                      to={`/events/${event.slug || event.id}`}
                      className="group grid grid-cols-[64px_1fr_auto] sm:grid-cols-[36px_88px_auto_1fr_auto_24px] gap-4 sm:gap-6 py-5 sm:py-5 items-center"
                    >
                      {/* Index — desktop only */}
                      <span className="hidden sm:block text-[10px] font-mono tracking-[0.22em] uppercase text-white/30 tabular-nums self-start pt-2 group-hover:text-primary transition-colors">
                        — {num}
                      </span>

                      {/* Thumbnail — always shown */}
                      <div className="relative aspect-[3/4] overflow-hidden bg-graphite">
                        {event.cover_image_url ? (
                          <>
                            <img
                              src={event.cover_image_url}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary/30">
                            <span className="font-headline text-2xl" style={{ fontWeight: 400 }}>◆</span>
                          </div>
                        )}
                      </div>

                      {/* Date — desktop only */}
                      <div className="hidden sm:flex items-baseline gap-3 whitespace-nowrap">
                        <span
                          className="font-headline text-4xl md:text-5xl leading-none tabular-nums text-white group-hover:text-primary transition-colors duration-300"
                          style={{ fontWeight: 600 }}
                        >
                          {d.day}
                        </span>
                        <div className="flex flex-col text-[10px] font-mono tracking-[0.22em] uppercase text-white/50">
                          <span>{d.month}</span>
                          <span className="opacity-60">'{d.year}</span>
                          <span className="opacity-60 mt-0.5">{d.weekday}</span>
                        </div>
                      </div>

                      {/* Title + venue */}
                      <div className="min-w-0">
                        {/* Mobile-only date + index tag */}
                        <div className="sm:hidden flex items-center gap-2 text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 tabular-nums mb-1.5">
                          <span className="text-primary">— {num}</span>
                          <span className="opacity-40">/</span>
                          <span>{d.day}.{d.month} '{d.year}</span>
                        </div>
                        <h3
                          className="font-headline text-base sm:text-xl md:text-2xl uppercase tracking-tight text-white truncate group-hover:text-primary transition-colors duration-300"
                          style={{ fontWeight: 600 }}
                        >
                          {event.name}
                        </h3>
                        <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-[12px] text-white/50 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono tracking-wider truncate">
                          <span className="uppercase truncate">
                            {event.venue?.name || 'Venue TBA'}
                            {event.venue?.city && (
                              <span className="text-white/35"> · {event.venue.city}</span>
                            )}
                          </span>
                          {event.genres?.[0] && (
                            <>
                              <span className="opacity-40 hidden sm:inline">/</span>
                              <span className="uppercase text-white/60 hidden sm:inline">
                                {event.genres.slice(0, 2).join(' × ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Interest — desktop only */}
                      <div className="hidden sm:block text-[11px] font-mono tracking-[0.2em] uppercase text-white/40 tabular-nums whitespace-nowrap">
                        {event.interested_count > 0 ? (
                          <>
                            <span className="text-white">{event.interested_count}</span>{' '}
                            <span>going</span>
                          </>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="text-primary text-lg sm:opacity-0 sm:-translate-x-1 group-hover:sm:opacity-100 group-hover:sm:translate-x-0 transition-all duration-300">
                        →
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div data-scroll className="py-16 text-center">
              <div
                className="font-headline text-4xl sm:text-5xl uppercase text-white/20"
                style={{ fontWeight: 700 }}
              >
                Quiet week.
              </div>
              <p className="text-sm text-white/50 mt-4 font-mono tracking-wider uppercase text-[11px]">
                Check back shortly. The programme will return.
              </p>
            </div>
          )}

          {/* City signal strip */}
          <div
            data-scroll
            className="mt-10 grid grid-cols-2 sm:grid-cols-5 gap-px bg-white/10 border border-white/10"
          >
            {CITY_SIGNALS.map((c) => (
              <div key={c.code} className="bg-bg-dark px-3.5 py-4">
                <div className="flex items-baseline justify-between">
                  <span
                    className="font-headline text-sm md:text-base uppercase"
                    style={{ fontWeight: 600 }}
                  >
                    {c.city}
                  </span>
                  <span className="text-[10px] font-mono text-white/30 tabular-nums tracking-[0.15em]">
                    {c.code}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-2.5 border-t border-white/10 pt-2.5">
                  <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40">
                    Active
                  </span>
                  <span className="font-mono tabular-nums text-sm text-primary">
                    {String(c.count).padStart(3, '0')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ RAVE PICKS ═══════════════════════ */}
      <div className="border-b border-white/10 bg-black/30">
        <RavePicks />
      </div>

      {/* ═══════════════════════ PRINCIPLES ═══════════════════════ */}
      <section ref={principlesRef} className="relative border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-16 sm:py-24 grid grid-cols-12 gap-6 sm:gap-10">
          <div
            data-scroll
            className="col-span-12 lg:col-span-3 lg:sticky lg:top-20 self-start text-[10px] font-mono tracking-[0.22em] uppercase"
          >
            <div className="text-primary mb-3">§ 04 / Principles</div>
            <div className="text-white/90 font-headline normal-case text-xl tracking-tight leading-tight" style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
              How we <span className="italic">operate</span>.
            </div>
            <div className="mt-5 text-white/40 font-body text-[13px] normal-case tracking-normal leading-relaxed">
              Three lines we don't cross. Read them before you ask us to break them.
            </div>
          </div>

          <div className="col-span-12 lg:col-span-9 space-y-0">
            {[
              {
                n: '01',
                title: 'Fair access',
                sub: 'Tickets are bound. Resale is capped at face value.',
                body:
                  'No priority for bots. No speculation. Nobody stands outside at 100× face value because somebody got lucky in a queue. The floor stays the floor — not a secondary market.',
              },
              {
                n: '02',
                title: 'Memory work',
                sub: 'Flyers, recordings, line-ups — archived by the people who were there.',
                body:
                  "The underground should keep its own history, not rent it from a platform that vanishes in five years. We back up what happened so you can point to it ten years from now.",
              },
              {
                n: '03',
                title: 'Owned by the floor',
                sub: 'No ads. No data resale. No outrage optimisation.',
                body:
                  'Organisers keep their audience. Artists keep their catalogue. Dancers keep their receipts. You talk to the people you came to see — nothing in between.',
              },
            ].map((p) => (
              <article
                key={p.n}
                data-scroll
                className="group relative grid grid-cols-[auto_1fr] gap-x-5 sm:gap-x-10 py-8 border-t border-white/10 last:border-b last:border-white/10"
              >
                <div
                  className="font-headline text-4xl sm:text-6xl leading-none text-white/15 tabular-nums group-hover:text-primary transition-colors duration-700"
                  style={{ fontWeight: 300 }}
                >
                  {p.n}
                </div>
                <div>
                  <h3
                    className="font-headline text-[clamp(1.5rem,3vw,2.25rem)] leading-[1] tracking-[-0.02em] uppercase"
                    style={{ fontWeight: 700 }}
                  >
                    {p.title}
                    <span className="text-primary">.</span>
                  </h3>
                  <p
                    className="mt-2.5 font-headline text-sm md:text-base text-white/70 normal-case tracking-tight"
                    style={{ fontWeight: 400, letterSpacing: '-0.005em' }}
                  >
                    {p.sub}
                  </p>
                  <p className="mt-5 text-white/55 text-[14px] leading-[1.65] max-w-2xl">
                    {p.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ LATEST DISPATCH ═══════════════════════ */}
      {latestArticle && (
        <section ref={dispatchRef} className="relative border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-16 sm:py-24">
            <header
              data-scroll
              className="flex items-end justify-between pb-5 mb-8 border-b border-white/10"
            >
              <div>
                <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-2.5">
                  § 05 / Dispatch
                </div>
                <h2
                  className="font-headline text-[clamp(1.75rem,4vw,3rem)] leading-[0.95] tracking-[-0.03em] uppercase"
                  style={{ fontWeight: 700 }}
                >
                  From the<br />magazine.
                </h2>
              </div>
              <Link
                to="/magazine"
                className="hidden sm:inline-block text-[11px] font-mono tracking-[0.22em] uppercase text-white/60 hover:text-primary link-underline transition-colors"
              >
                All dispatches →
              </Link>
            </header>

            <Link
              to={`/magazine/articles/${latestArticle.id}`}
              data-scroll
              className="group grid grid-cols-12 gap-6 sm:gap-10 items-start"
            >
              <div className="col-span-12 md:col-span-5 aspect-[4/5] md:aspect-[3/4] overflow-hidden bg-graphite relative">
                {latestArticle.cover_image_url ? (
                  <>
                    <img
                      src={latestArticle.cover_image_url}
                      alt={latestArticle.title}
                      className="absolute inset-0 w-full h-full object-cover grayscale contrast-[1.1] group-hover:grayscale-0 group-hover:scale-[1.02] transition-[filter,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-4 left-4 text-[10px] font-mono tracking-[0.22em] uppercase px-2 py-1 bg-white text-black font-semibold">
                      Editorial
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-primary/30">
                    <span className="font-headline text-[10rem]" style={{ fontWeight: 400 }}>§</span>
                  </div>
                )}
              </div>

              <div className="col-span-12 md:col-span-7 md:pt-2">
                <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 tabular-nums">
                  {new Date(latestArticle.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                  <span className="mx-3 opacity-40">·</span>
                  <span className="text-primary">Read ~ 6 min</span>
                </div>
                <h3
                  className="mt-3 font-headline text-[clamp(1.75rem,4vw,3.5rem)] leading-[0.95] tracking-[-0.03em] uppercase text-white group-hover:text-primary transition-colors duration-500"
                  style={{ fontWeight: 700 }}
                >
                  {latestArticle.title}
                </h3>
                {(latestArticle.subtitle || latestArticle.preview_content) && (
                  <p className="mt-5 text-white/60 text-[15px] leading-[1.65] max-w-xl">
                    {latestArticle.subtitle || latestArticle.preview_content}
                  </p>
                )}
                <div className="mt-8 inline-flex items-center gap-3 text-[11px] font-mono tracking-[0.22em] uppercase text-white link-underline">
                  <span>Read the piece</span>
                  <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ═══════════════════════ FINAL CTA ═══════════════════════ */}
      <section ref={ctaRef} className="relative overflow-hidden">
        {/* Subtle ambient glow duplicated for symmetry */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          aria-hidden
          style={{
            background:
              'radial-gradient(700px circle at 85% 110%, rgba(218,120,88,0.15), transparent 60%)',
          }}
        />
        <div className="relative max-w-[1440px] mx-auto px-6 sm:px-10 py-20 sm:py-28 grid grid-cols-12 gap-6 sm:gap-10 items-end">
          <div className="col-span-12 md:col-span-8">
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-4">
              § 06 / Subscribe
            </div>
            <h2
              className="font-headline text-[clamp(2.25rem,7vw,6.25rem)] leading-[0.9] tracking-[-0.04em] uppercase"
              style={{ fontWeight: 700 }}
            >
              <span data-scroll className="block">Make an account.</span>
              <span
                data-scroll
                className="block text-primary"
              >
                Keep your archive.
              </span>
            </h2>
            <p
              data-scroll
              className="mt-8 text-white/65 text-[15px] leading-[1.6] max-w-lg"
            >
              Your tickets, your saved nights, the sets you were on the floor for —
              kept in one place, exported on demand, never held hostage. No feed
              optimisation. No ad tracking.
            </p>
          </div>

          <div data-scroll className="col-span-12 md:col-span-4 md:justify-self-end w-full">
            <div className="flex flex-col gap-2.5">
              <Link
                to="/register"
                className="group inline-flex items-center justify-between gap-6 px-5 py-4 bg-white text-black text-[11px] font-mono tracking-[0.18em] uppercase font-semibold hover:bg-primary transition-colors duration-200"
              >
                <span>Enter</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">↗</span>
              </Link>
              <Link
                to="/login"
                className="group inline-flex items-center justify-between gap-6 px-5 py-4 border border-white/25 text-white text-[11px] font-mono tracking-[0.18em] uppercase hover:border-white transition-colors duration-200"
              >
                <span>I'm on the list</span>
                <span className="text-white/50 group-hover:text-white transition-colors">→</span>
              </Link>
              <div className="mt-3 text-[10px] font-mono tracking-[0.22em] uppercase text-white/35">
                No card required. No marketing mail. Ever.
              </div>
            </div>
          </div>
        </div>
      </section>

      <NewFooter />
    </div>
  )
}
