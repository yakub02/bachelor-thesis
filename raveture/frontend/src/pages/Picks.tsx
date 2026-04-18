import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ravetureApi, type Pick } from '@/services/ravetureApi'
import { AnimatedBackground, NewNavbar, NewFooter } from '@/components/design'
import { useLang } from '@/context'

export function Picks() {
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const { t, lang } = useLang()

  useEffect(() => {
    ravetureApi.getPicks()
      .then(d => setPicks(d.featured_events))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo(
        '.pick-card',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
      )
    }
  }, [loading])

  return (
    <div className="relative min-h-screen bg-bg-dark text-white">
      <AnimatedBackground />
      <NewNavbar />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-32 pb-16">
        {/* Header */}
        <div className="mb-12">
          <span className="bg-primary text-black text-xs font-black px-2 py-1 uppercase tracking-widest">
            {t.picks.badge}
          </span>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white mt-4">
            {t.picks.title1}
            <br />
            <span className="text-primary">{t.picks.title2}</span>
          </h1>
          <p className="text-text-muted text-sm mt-4 max-w-lg">
            {t.picks.subtitle}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-surface border border-border animate-pulse h-64" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && picks.length === 0 && (
          <div className="text-center py-24">
            <span className="text-primary text-6xl block mb-4">◆</span>
            <p className="text-text-muted uppercase tracking-widest text-sm">
              {t.picks.empty}
            </p>
          </div>
        )}

        {/* Picks grid */}
        {!loading && picks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {picks.map((pick) => (
              <div key={pick.id} className="pick-card bg-surface border border-border hover:border-primary transition-colors duration-200">
                <Link to={`/events/${pick.event.slug}`}>
                  {pick.event.cover_image_url ? (
                    <img
                      src={pick.event.cover_image_url}
                      alt={pick.event.name}
                      className="w-full h-52 object-cover"
                    />
                  ) : (
                    <div className="w-full h-52 bg-bg-dark flex items-center justify-center">
                      <span className="text-primary text-6xl font-black">◆</span>
                    </div>
                  )}
                </Link>
                <div className="p-6">
                  <span className="text-primary text-xs font-black uppercase tracking-widest">{t.picks.pick}</span>
                  <Link to={`/events/${pick.event.slug}`}>
                    <h2 className="text-white font-black uppercase text-xl mt-1 hover:text-primary transition-colors">
                      {pick.event.name}
                    </h2>
                  </Link>
                  <p className="text-text-muted text-sm mt-1">
                    {new Date(pick.event.starts_at).toLocaleDateString(lang === 'cs' ? 'cs-CZ' : 'en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {pick.event.venue && ` · ${pick.event.venue.name}`}
                  </p>

                  <p className="text-white text-sm mt-4 leading-relaxed border-l-2 border-primary pl-4">
                    {pick.reason}
                  </p>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      {pick.curator?.avatar_url ? (
                        <img src={pick.curator.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-black text-xs font-black">
                            {(pick.curator?.display_name || pick.curator?.username || '?')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-text-muted text-xs">
                        {t.picks.pickedBy}{' '}
                        <span className="text-white font-bold">
                          {pick.curator?.display_name || pick.curator?.username || 'RAVETURE Team'}
                        </span>
                      </span>
                    </div>
                    <span className="text-text-muted text-xs">
                      {new Date(pick.featured_at).toLocaleDateString(lang === 'cs' ? 'cs-CZ' : 'en-GB')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewFooter />
    </div>
  )
}
