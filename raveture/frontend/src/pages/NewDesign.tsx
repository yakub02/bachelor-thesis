import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AnimatedBackground, NewNavbar, NewFooter } from '@/components/design'
import { ravetureApi, type Event } from '@/services/ravetureApi'

gsap.registerPlugin(ScrollTrigger)

// Enhanced Glow Button with multi-layer shadows
function GlowButtonEnhanced({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  ...props
}: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative font-mono font-bold uppercase tracking-wider
        transition-all duration-300
        ${variant === 'primary'
          ? 'bg-primary text-black hover:shadow-[0_0_20px_rgba(218,120,88,0.5),0_0_40px_rgba(218,120,88,0.3),0_0_60px_rgba(218,120,88,0.2)]'
          : 'bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-black hover:shadow-[0_0_20px_rgba(218,120,88,0.4),0_0_40px_rgba(218,120,88,0.2)]'
        }
        ${size === 'sm' ? 'px-4 py-2 text-xs' : size === 'lg' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'}
        ${className}
      `}
      {...props}
    >
      {/* Animated glow effect */}
      <motion.span
        className="absolute inset-0 bg-primary opacity-0 blur-2xl"
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}

// Enhanced Glow Card with cursor tracking
function GlowCardEnhanced({ children, className = '' }: any) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      className={`
        relative overflow-hidden
        bg-graphite/50 backdrop-blur-sm
        border border-border-grey
        transition-all duration-500
        hover:border-primary/50
        hover:shadow-[0_0_30px_rgba(218,120,88,0.3),0_0_60px_rgba(218,120,88,0.2)]
        ${className}
      `}
    >
      {/* Cursor glow effect */}
      {isHovered && (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            left: mousePosition.x,
            top: mousePosition.y,
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(218,120,88,0.15) 0%, transparent 70%)',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

// Modern Event Card
function ModernEventCard({ event }: { event: Event }) {
  return (
    <Link to={`/events/${event.id}`}>
      <GlowCardEnhanced className="group cursor-pointer">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-cover bg-center grayscale contrast-125"
            style={{
              backgroundImage: event.cover_image_url
                ? `url('${event.cover_image_url}')`
                : `url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80')`,
            }}
            whileHover={{ scale: 1.1, filter: 'grayscale(0%) contrast(100%)' }}
            transition={{ duration: 0.6 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

          {/* Live badge */}
          <motion.div
            className="absolute top-4 right-4 px-3 py-1 bg-primary text-black text-xs font-mono uppercase font-bold"
            animate={{
              boxShadow: [
                '0 0 10px rgba(218,120,88,0.5)',
                '0 0 20px rgba(218,120,88,0.8)',
                '0 0 10px rgba(218,120,88,0.5)',
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            LIVE
          </motion.div>

          {/* Overlay content */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <motion.h3
              className="text-2xl font-black uppercase mb-2 text-white"
              initial={{ y: 10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {event.name}
            </motion.h3>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span className="flex items-center gap-1">
                <span className="text-primary">◆</span>
                {event.venue?.city || 'TBA'}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-primary">◆</span>
                {new Date(event.starts_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="p-6 border-t border-border-grey">
          <motion.div
            className="flex items-center justify-between"
            whileHover={{ x: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <span className="text-primary font-mono text-sm uppercase font-bold">Get Tickets</span>
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.div>
        </div>
      </GlowCardEnhanced>
    </Link>
  )
}

// Modern Stats Card
function ModernStatsCard({ title, value, change, icon }: any) {
  return (
    <GlowCardEnhanced className="p-6 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="text-4xl">{icon}</div>
          {change && (
            <motion.span
              className={`text-sm font-mono ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.3 }}
            >
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
            </motion.span>
          )}
        </div>

        <motion.div
          className="text-4xl font-black mb-2 text-primary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {value}
        </motion.div>

        <div className="text-text-muted text-sm font-mono uppercase tracking-wider">
          {title}
        </div>
      </div>
    </GlowCardEnhanced>
  )
}

// Skeleton Loader
function EventCardSkeleton() {
  return (
    <div className="bg-graphite/50 border border-border-grey overflow-hidden">
      <div className="aspect-[4/3] bg-graphite animate-pulse" />
      <div className="p-6 space-y-3">
        <div className="h-6 bg-graphite animate-pulse w-3/4" />
        <div className="h-4 bg-graphite animate-pulse w-1/2" />
      </div>
    </div>
  )
}

export function NewDesign() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const heroRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef<HTMLElement[]>([])

  // Fetch events
  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true)
      try {
        const response = await ravetureApi.getEvents({ per_page: 6 })
        setEvents(response.events)
      } catch {
        // events fail silently; page renders without data
      } finally {
        setTimeout(() => setIsLoading(false), 1000) // Simulate loading
      }
    }
    fetchEvents()
  }, [])

  // Hero animations
  useGSAP(() => {
    if (heroRef.current) {
      const items = heroRef.current.querySelectorAll('.hero-item')
      gsap.fromTo(
        items,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
        }
      )
    }
  }, [])

  // Scroll animations
  useGSAP(() => {
    sectionsRef.current.forEach((section) => {
      if (!section) return
      gsap.fromTo(
        section.querySelectorAll('.scroll-item'),
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    })
  }, [])

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <AnimatedBackground />
      <NewNavbar transparent />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <div ref={heroRef} className="max-w-6xl mx-auto px-6 py-20 text-center">
          {/* Protocol Badge */}
          <motion.div
            className="hero-item mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-primary/10 border border-primary/30 shadow-[0_0_20px_rgba(218,120,88,0.3)]">
              <motion.div
                className="w-2 h-2 bg-primary rounded-full"
                animate={{
                  boxShadow: [
                    '0 0 5px rgba(218,120,88,0.5)',
                    '0 0 15px rgba(218,120,88,1)',
                    '0 0 5px rgba(218,120,88,0.5)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-primary text-xs font-mono uppercase tracking-widest">
                ⚡ NEW DESIGN SYSTEM V3.0 • LIVE
              </span>
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            className="hero-item text-7xl md:text-9xl font-black leading-[0.85] tracking-tighter uppercase mb-8"
            style={{
              textShadow: '0 0 40px rgba(218, 120, 88, 0.3)',
            }}
          >
            THE UNDERGROUND
            <br />
            <span className="text-primary">HAS A NEW HOME</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="hero-item text-xl text-text-secondary max-w-3xl mx-auto mb-12 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Decentralized ticketing and community infrastructure for the electronic avant-garde.
            <br />
            <span className="text-primary font-semibold">Owned by the dancers.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="hero-item flex flex-wrap gap-4 justify-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <GlowButtonEnhanced variant="primary" size="lg">
              ACCESS PLATFORM
            </GlowButtonEnhanced>
            <GlowButtonEnhanced variant="outline" size="lg">
              VIEW MANIFESTO
            </GlowButtonEnhanced>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            className="hero-item grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-border-grey/30 max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <ModernStatsCard
              icon="🎵"
              value="12,847+"
              title="Ravers Connected"
              change={15}
            />
            <ModernStatsCard
              icon="🎫"
              value="156"
              title="Events Hosted"
              change={8}
            />
            <ModernStatsCard
              icon="⭐"
              value="98%"
              title="Satisfaction"
              change={3}
            />
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-mono text-text-muted uppercase">Scroll</span>
            <motion.svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{
                filter: [
                  'drop-shadow(0 0 5px rgba(218,120,88,0.5))',
                  'drop-shadow(0 0 15px rgba(218,120,88,0.8))',
                  'drop-shadow(0 0 5px rgba(218,120,88,0.5))',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </motion.svg>
          </div>
        </motion.div>
      </section>

      {/* UPCOMING EVENTS */}
      <section
        ref={(el) => el && (sectionsRef.current[0] = el)}
        className="relative py-32 border-y border-border-grey"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 scroll-item">
            <motion.div
              className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 mb-4"
              whileHover={{
                boxShadow: '0 0 20px rgba(218,120,88,0.4)',
                scale: 1.05
              }}
            >
              <span className="text-primary text-xs font-mono uppercase tracking-wider">Happening Now</span>
            </motion.div>
            <h2 className="text-6xl font-black uppercase tracking-tighter mb-4">
              Upcoming <span className="text-primary">Events</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto mb-6">
              Experience the underground. Premium events curated by the community.
            </p>
            <Link to="/events">
              <GlowButtonEnhanced variant="outline" size="md">
                View All Events →
              </GlowButtonEnhanced>
            </Link>
          </div>

          {/* Events Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : events.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                visible: {
                  transition: { staggerChildren: 0.1 }
                }
              }}
            >
              {events.map((event) => (
                <motion.div
                  key={event.id}
                  className="scroll-item"
                  variants={{
                    hidden: { opacity: 0, y: 40 },
                    visible: { opacity: 1, y: 0 }
                  }}
                >
                  <ModernEventCard event={event} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-20 scroll-item">
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-text-muted text-lg">No events available. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section
        ref={(el) => el && (sectionsRef.current[1] = el)}
        className="relative py-32 bg-graphite/30"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 scroll-item">
            <motion.div
              className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 mb-4"
              whileHover={{
                boxShadow: '0 0 20px rgba(218,120,88,0.4)',
                scale: 1.05
              }}
            >
              <span className="text-primary text-xs font-mono uppercase tracking-wider">Dashboard</span>
            </motion.div>
            <h2 className="text-6xl font-black uppercase tracking-tighter mb-4">
              Organizer <span className="text-primary">Analytics</span>
            </h2>
          </div>

          {/* Stats Grid - Bento Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              className="scroll-item"
              whileHover={{ y: -5 }}
            >
              <ModernStatsCard
                icon="💰"
                value="$12.5K"
                title="Total Revenue"
                change={12}
              />
            </motion.div>
            <motion.div
              className="scroll-item"
              whileHover={{ y: -5 }}
            >
              <ModernStatsCard
                icon="🎫"
                value="847"
                title="Tickets Sold"
                change={23}
              />
            </motion.div>
            <motion.div
              className="scroll-item"
              whileHover={{ y: -5 }}
            >
              <ModernStatsCard
                icon="👥"
                value="1.2K"
                title="Active Users"
                change={8}
              />
            </motion.div>
            <motion.div
              className="scroll-item"
              whileHover={{ y: -5 }}
            >
              <ModernStatsCard
                icon="📈"
                value="94%"
                title="Conversion"
                change={5}
              />
            </motion.div>
          </div>

          {/* Large Chart Card */}
          <motion.div
            className="scroll-item mt-6"
            whileHover={{ y: -5 }}
          >
            <GlowCardEnhanced className="p-8">
              <h3 className="text-2xl font-bold uppercase mb-6 flex items-center gap-3">
                <span className="text-primary">◆</span>
                Revenue Over Time
              </h3>
              <div className="h-64 flex items-center justify-center border border-border-grey bg-graphite/30">
                <p className="text-text-muted font-mono">Chart visualization would go here</p>
              </div>
            </GlowCardEnhanced>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            className="inline-block px-6 py-2 bg-primary/10 border border-primary/30 mb-8"
            whileHover={{
              boxShadow: '0 0 20px rgba(218,120,88,0.4)',
              scale: 1.05
            }}
          >
            <span className="text-primary text-sm font-mono uppercase tracking-wider">Join Now</span>
          </motion.div>

          <h2 className="text-7xl font-black uppercase tracking-tighter mb-6 leading-[0.9]">
            Ready to
            <br />
            <span className="text-primary">Experience It?</span>
          </h2>

          <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto">
            This is the new design system. Modern, functional, beautiful.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/register">
              <GlowButtonEnhanced variant="primary" size="lg">
                Create Account
              </GlowButtonEnhanced>
            </Link>
            <Link to="/">
              <GlowButtonEnhanced variant="outline" size="lg">
                Back to Home
              </GlowButtonEnhanced>
            </Link>
          </div>
        </div>
      </section>

      <NewFooter />
    </div>
  )
}
