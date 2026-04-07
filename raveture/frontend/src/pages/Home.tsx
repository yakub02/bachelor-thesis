import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AnimatedBackground, NewNavbar, NewFooter, GlowButton, GlowCard } from '@/components/design'
import { features, platformModules } from '@/data'
import { ravetureApi, type Event } from '@/services/ravetureApi'

gsap.registerPlugin(ScrollTrigger)

export function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const heroRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef<HTMLElement[]>([])

  // Loading animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  // Fetch events
  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await ravetureApi.getEvents({ per_page: 6 })
        setEvents(response.events)
      } catch (err) {
        console.error('Failed to fetch events:', err)
      }
    }
    fetchEvents()
  }, [])

  // Hero entrance animation
  useGSAP(() => {
    if (!isLoading && heroRef.current) {
      const elements = heroRef.current.querySelectorAll('.hero-item')
      gsap.fromTo(
        elements,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
          delay: 0.3,
        }
      )
    }
  }, [isLoading])

  // Sections scroll animations
  useGSAP(() => {
    sectionsRef.current.forEach((section) => {
      if (!section) return
      const items = section.querySelectorAll('.scroll-item')
      gsap.fromTo(
        items,
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

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-bg-dark flex items-center justify-center z-50">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-2">
            <div className="text-primary font-mono text-sm uppercase tracking-wider animate-pulse">
              Loading Protocol
            </div>
            <div className="flex gap-2 justify-center">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <AnimatedBackground />
      <NewNavbar transparent />

      {/* HERO - Centered like in screenshot */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <div ref={heroRef} className="max-w-6xl mx-auto px-6 py-20 text-center">
          {/* Protocol Badge */}
          <div className="hero-item mb-8">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-primary/10 border border-primary/30">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-primary text-xs font-mono uppercase tracking-widest">
                ⚡ PROTOCOL V2.0 • NOW LIVE
              </span>
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="hero-item text-6xl md:text-8xl lg:text-9xl font-black leading-[0.9] tracking-tighter uppercase mb-8">
            THE UNDERGROUND
            <br />
            <span className="text-primary bg-clip-text">HAS A NEW HOME</span>
          </h1>

          {/* Subheadline */}
          <p className="hero-item text-lg md:text-xl text-text-secondary max-w-3xl mx-auto mb-12 leading-relaxed">
            Decentralized ticketing and community infrastructure for the electronic avant-garde.
            <br />
            <span className="text-primary font-semibold">Owned by the dancers.</span>
          </p>

          {/* CTA Buttons */}
          <div className="hero-item flex flex-wrap gap-4 justify-center mb-20">
            <Link to="/register">
              <GlowButton variant="primary" size="lg" className="px-12">
                ACCESS PLATFORM
              </GlowButton>
            </Link>
            <GlowButton variant="outline" size="lg" className="px-12">
              VIEW MANIFESTO
            </GlowButton>
          </div>

          {/* Stats Row - Centered like in screenshot */}
          <div className="hero-item flex flex-wrap gap-12 justify-center pt-12 border-t border-border-grey/30">
            <div className="text-center group cursor-pointer">
              <div className="text-4xl md:text-5xl font-black text-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                12,847+
              </div>
              <div className="text-xs font-mono text-text-muted uppercase tracking-wider">
                Ravers Connected
              </div>
            </div>
            <div className="text-center group cursor-pointer">
              <div className="text-4xl md:text-5xl font-black text-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                156
              </div>
              <div className="text-xs font-mono text-text-muted uppercase tracking-wider">
                Events Hosted
              </div>
            </div>
            <div className="text-center group cursor-pointer">
              <div className="text-4xl md:text-5xl font-black text-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                98%
              </div>
              <div className="text-xs font-mono text-text-muted uppercase tracking-wider">
                Satisfaction
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-mono text-text-muted uppercase">Scroll</span>
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* FEATURES - Modern Grid with Better UX */}
      <section
        ref={(el) => el && (sectionsRef.current[0] = el)}
        className="relative py-32 border-y border-border-grey"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 scroll-item">
            <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 mb-4">
              <span className="text-primary text-xs font-mono uppercase tracking-wider">Core Features</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter mb-4">
              Built for the <span className="text-primary">Underground</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              A complete ecosystem designed for artists, dancers, and organizers
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <GlowCard
                key={feature.title}
                className="scroll-item p-8 hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex flex-col h-full">
                  <span className="material-symbols-outlined text-primary text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </span>
                  <h3 className="text-2xl font-bold uppercase mb-3 tracking-tight group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-text-muted leading-relaxed flex-1">
                    {feature.description}
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-primary text-sm font-mono uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn More
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE EVENTS */}
      <section
        ref={(el) => el && (sectionsRef.current[1] = el)}
        className="relative py-32"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-12 scroll-item">
            <div>
              <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 mb-4">
                <span className="text-primary text-xs font-mono uppercase tracking-wider">Happening Now</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter">
                Upcoming <span className="text-primary">Events</span>
              </h2>
            </div>
            <Link to="/events" className="hidden md:block">
              <GlowButton variant="outline" size="sm">
                View All Events →
              </GlowButton>
            </Link>
          </div>

          {events.length > 0 ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {events.slice(0, 6).map((event, i) => (
                <Link key={event.id} to={`/events/${event.id}`}>
                  <GlowCard
                    className="scroll-item overflow-hidden hover:scale-[1.02] transition-all duration-300 group cursor-pointer"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="aspect-[4/3] relative overflow-hidden">
                      <div
                        className="absolute inset-0 bg-cover bg-center grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                        style={{
                          backgroundImage: event.cover_image_url
                            ? `url('${event.cover_image_url}')`
                            : `url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80')`,
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute top-4 right-4 px-3 py-1 bg-primary text-black text-xs font-mono uppercase">
                        Live
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold uppercase mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                        {event.name}
                      </h3>
                      <p className="text-text-muted text-sm mb-4">
                        {event.venue?.city || 'TBA'} • {new Date(event.starts_at).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2 text-primary text-sm font-mono uppercase">
                        Get Tickets
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </GlowCard>
                </Link>
              ))}
            </div>

            {/* View All Button for Mobile */}
            <div className="text-center">
              <Link to="/events">
                <GlowButton variant="primary" size="lg">
                  View All Events & Filters →
                </GlowButton>
              </Link>
            </div>
            </>
          ) : (
            <div className="text-center py-20 scroll-item">
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-text-muted text-lg">No events available right now. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* PLATFORM MODULES */}
      <section
        ref={(el) => el && (sectionsRef.current[2] = el)}
        className="relative py-32 border-y border-border-grey bg-graphite/30"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 scroll-item">
            <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 mb-4">
              <span className="text-primary text-xs font-mono uppercase tracking-wider">Ecosystem</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter mb-4">
              Platform <span className="text-primary">Modules</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {platformModules.map((module, i) => (
              <GlowCard
                key={module.number}
                className="scroll-item p-8 hover:scale-[1.02] transition-all duration-300 group cursor-pointer"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="text-5xl font-black text-primary/20 mb-4 group-hover:text-primary/40 transition-colors">
                  {module.number}
                </div>
                <h3 className="text-xl font-bold uppercase mb-3 tracking-tight group-hover:text-primary transition-colors">
                  {module.title}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  {module.description}
                </p>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-block px-6 py-2 bg-primary/10 border border-primary/30 mb-8">
            <span className="text-primary text-sm font-mono uppercase tracking-wider">Join the Movement</span>
          </div>

          <h2 className="text-6xl md:text-7xl font-black uppercase tracking-tighter mb-6 leading-[0.9]">
            Ready to
            <br />
            <span className="text-primary">Take Control?</span>
          </h2>

          <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed">
            Join thousands of dancers, artists, and organizers building the decentralized future of underground culture.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-16">
            <Link to="/register">
              <GlowButton variant="primary" size="lg" className="px-12">
                Create Account
              </GlowButton>
            </Link>
            <Link to="/login">
              <GlowButton variant="outline" size="lg" className="px-12">
                Sign In
              </GlowButton>
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap gap-8 justify-center pt-12 border-t border-border-grey/30">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-mono text-text-muted">99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-mono text-text-muted">Secure Blockchain</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-mono text-text-muted">24/7 Support</span>
            </div>
          </div>
        </div>
      </section>

      <NewFooter />
    </div>
  )
}
