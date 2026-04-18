import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ravetureApi, type Pick } from '@/services/ravetureApi'
import { useLang } from '@/context'

export function RavePicks() {
  const [picks, setPicks] = useState<Pick[]>([])
  const { t, lang } = useLang()

  useEffect(() => {
    ravetureApi.getPicks()
      .then(d => setPicks(d.featured_events.slice(0, 5)))
      .catch(() => {})
  }, [])

  if (picks.length === 0) return null

  return (
    <section className="py-16 px-4 md:px-8 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <span className="bg-primary text-black text-xs font-black px-2 py-1 uppercase tracking-widest">
              {t.ravePicks.badge}
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">
              {t.ravePicks.heading}
            </h2>
          </div>
          <Link
            to="/picks"
            className="text-primary text-xs font-bold uppercase tracking-widest hover:underline hidden md:block"
          >
            {t.ravePicks.viewAll}
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
          {picks.map((pick) => (
            <Link
              key={pick.id}
              to={`/events/${pick.event.slug}`}
              className="flex-none w-72 group"
            >
              <div className="bg-surface border border-border group-hover:border-primary transition-colors duration-200">
                {pick.event.cover_image_url ? (
                  <img
                    src={pick.event.cover_image_url}
                    alt={pick.event.name}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-bg-dark flex items-center justify-center">
                    <span className="text-primary text-4xl font-black">◆</span>
                  </div>
                )}
                <div className="p-4">
                  <span className="text-primary text-xs font-black uppercase tracking-widest">
                    ◆ RT PICK
                  </span>
                  <h3 className="text-white font-black uppercase text-sm mt-1 truncate">
                    {pick.event.name}
                  </h3>
                  <p className="text-text-muted text-xs mt-1">
                    {new Date(pick.event.starts_at).toLocaleDateString(lang === 'cs' ? 'cs-CZ' : 'en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {pick.event.venue && ` · ${pick.event.venue.name}`}
                  </p>
                  <p className="text-text-muted text-xs mt-2 line-clamp-2 leading-relaxed">
                    {pick.reason}
                  </p>
                  {pick.curator && (
                    <p className="text-text-muted text-xs mt-3 border-t border-border pt-2">
                      {t.ravePicks.pickedBy}{' '}
                      <span className="text-primary font-bold">
                        {pick.curator.display_name || pick.curator.username}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-4 text-right md:hidden">
          <Link to="/picks" className="text-primary text-xs font-bold uppercase tracking-widest hover:underline">
            {t.ravePicks.viewAllMobile}
          </Link>
        </div>
      </div>
    </section>
  )
}
