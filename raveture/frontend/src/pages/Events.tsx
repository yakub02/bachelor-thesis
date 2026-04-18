import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { NewNavbar, NewFooter } from '@/components/design'
import { DatePicker } from '@/components/ui/date-picker'
import { ravetureApi, type Event } from '@/services/ravetureApi'
import { cn } from '@/utils'
import { useLang } from '@/context'

gsap.registerPlugin(ScrollTrigger)

// ════════════════════════════ DATA ════════════════════════════

const LOCATIONS = {
  'Czech Republic': ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Liberec'],
  'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'],
  'Austria': ['Vienna', 'Salzburg', 'Graz', 'Innsbruck'],
  'Poland': ['Warsaw', 'Krakow', 'Wroclaw', 'Gdansk'],
  'Slovakia': ['Bratislava', 'Košice'],
  'Netherlands': ['Amsterdam', 'Rotterdam', 'Utrecht', 'The Hague'],
  'Belgium': ['Brussels', 'Antwerp', 'Ghent'],
  'UK': ['London', 'Manchester', 'Bristol', 'Glasgow', 'Edinburgh'],
}

const GENRES = [
  'Techno', 'House', 'Trance', 'Drum & Bass', 'Dubstep', 'Hardcore',
  'Ambient', 'Industrial', 'Electro', 'Minimal', 'Progressive', 'Psytrance',
]

const EVENTS_PER_PAGE = 12

// ════════════════════════════ HELPERS ════════════════════════════

function formatEventDate(iso: string) {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const year = String(d.getFullYear()).slice(-2)
  const weekday = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return { day, month, year, weekday, time }
}

function getDateForTimeFilter(filterId: string): string | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (filterId) {
    case 'today':
      return today.toISOString().split('T')[0]
    case 'tomorrow': {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow.toISOString().split('T')[0]
    }
    case 'this-week':
      return today.toISOString().split('T')[0]
    case 'this-weekend': {
      const dayOfWeek = today.getDay()
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7
      const friday = new Date(today)
      friday.setDate(friday.getDate() + daysUntilFriday)
      return friday.toISOString().split('T')[0]
    }
    case 'next-week': {
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      return nextWeek.toISOString().split('T')[0]
    }
    case 'this-month':
      return today.toISOString().split('T')[0]
    default:
      return null
  }
}

// ════════════════════════════ CARD ════════════════════════════

interface EventCardProps {
  event: Event
  index: number
  locale: string
  viewLabel: string
}

function EventCard({ event, index, locale, viewLabel }: EventCardProps) {
  const d = formatEventDate(event.starts_at)
  const num = String(index + 1).padStart(2, '0')

  return (
    <li data-scroll className="group/card">
      <Link
        to={`/events/${event.slug || event.id}`}
        className="group block"
      >
        {/* Flyer — 1080×1440 (3:4) */}
        <div className="relative">
          <div className="relative aspect-[3/4] overflow-hidden bg-graphite">
            {event.cover_image_url ? (
              <>
                <img
                  src={event.cover_image_url}
                  alt={event.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary/25">
                <span className="font-headline text-8xl" style={{ fontWeight: 400 }}>◆</span>
              </div>
            )}

            {/* Index badge */}
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
              <span className="bg-white text-black text-[10px] font-mono tracking-[0.22em] uppercase tabular-nums px-2 py-1 font-semibold">
                № {num}
              </span>
              {event.interested_count > 0 && (
                <span className="bg-black/60 backdrop-blur-sm text-white/90 text-[10px] font-mono tracking-[0.22em] uppercase tabular-nums px-2 py-1">
                  <span className="text-primary">{event.interested_count}</span> going
                </span>
              )}
            </div>

            {/* Date — bottom left on flyer */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
              <div className="flex items-baseline gap-2.5">
                <span
                  className="font-headline text-5xl md:text-6xl leading-[0.85] tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                  style={{ fontWeight: 700 }}
                >
                  {d.day}
                </span>
                <div className="flex flex-col text-[10px] font-mono tracking-[0.22em] uppercase text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                  <span>{d.month}</span>
                  <span className="opacity-70">'{d.year}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/70 tabular-nums drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                {d.weekday} · {d.time}
              </span>
            </div>
          </div>

          {/* Target lock — reticle snaps OUTSIDE the flyer on hover */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:-inset-2.5 transition-all duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] z-20"
          >
            <span className="absolute -top-px -left-px w-5 h-5 border-t border-l border-primary shadow-[0_0_8px_rgba(218,120,88,0.35)]" />
            <span className="absolute -top-px -right-px w-5 h-5 border-t border-r border-primary shadow-[0_0_8px_rgba(218,120,88,0.35)]" />
            <span className="absolute -bottom-px -left-px w-5 h-5 border-b border-l border-primary shadow-[0_0_8px_rgba(218,120,88,0.35)]" />
            <span className="absolute -bottom-px -right-px w-5 h-5 border-b border-r border-primary shadow-[0_0_8px_rgba(218,120,88,0.35)]" />
            {/* HUD tick — small locked indicator */}
            <span className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-1.5 h-px bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-[300ms]" />
            <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-1.5 h-px bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-[300ms]" />
          </div>
        </div>

        {/* Text block below flyer */}
        <div className="pt-4 pb-2">
          <h3
            className="font-headline text-xl sm:text-2xl md:text-[1.7rem] uppercase tracking-[-0.02em] leading-[0.98] text-white group-hover:text-primary transition-colors duration-300 line-clamp-2"
            style={{ fontWeight: 700 }}
          >
            {event.name}
          </h3>
          <div className="mt-2.5 text-[11px] text-white/55 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono tracking-wider">
            <span className="uppercase truncate text-white/75">
              {event.venue?.name || 'Venue TBA'}
              {event.venue?.city && (
                <span className="text-white/40"> · {event.venue.city}</span>
              )}
            </span>
            {event.genres?.[0] && (
              <>
                <span className="opacity-40">/</span>
                <span className="uppercase text-white/55">
                  {event.genres.slice(0, 2).join(' × ')}
                </span>
              </>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] font-mono tracking-[0.22em] uppercase text-white/35">
            <span className="tabular-nums">
              {new Date(event.starts_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 inline-flex items-center gap-1.5">
              Open <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
            </span>
          </div>
        </div>

        <span className="sr-only">{viewLabel}</span>
      </Link>
    </li>
  )
}

// ════════════════════════════ FILTER BUTTON ════════════════════════════

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.22em] transition-colors duration-200',
        active
          ? 'bg-white text-black'
          : 'border border-white/15 text-white/60 hover:border-white/40 hover:text-white'
      )}
    >
      {children}
    </button>
  )
}

// ════════════════════════════ PAGE ════════════════════════════

export function Events() {
  const { t, lang } = useLang()
  const locale = lang === 'cs' ? 'cs-CZ' : 'en-GB'

  const TIME_FILTERS = [
    { id: 'all', label: t.events.timeAll },
    { id: 'today', label: t.events.timeToday },
    { id: 'tomorrow', label: t.events.timeTomorrow },
    { id: 'this-week', label: t.events.timeWeek },
    { id: 'this-weekend', label: t.events.timeWeekend },
    { id: 'next-week', label: t.events.timeNextWeek },
    { id: 'this-month', label: t.events.timeMonth },
  ]

  const [events, setEvents] = useState<Event[]>([])
  const [totalEvents, setTotalEvents] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const listRef = useRef<HTMLElement>(null)

  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [customDate, setCustomDate] = useState('')

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true)
      try {
        const params: any = {
          page: currentPage,
          per_page: EVENTS_PER_PAGE,
        }
        if (selectedCity !== 'all') params.city = selectedCity
        if (selectedGenre !== 'all') params.genre = selectedGenre
        if (customDate) {
          params.from_date = customDate
        } else if (selectedTimeFilter !== 'all') {
          const date = getDateForTimeFilter(selectedTimeFilter)
          if (date) params.from_date = date
        }

        const response = await ravetureApi.getEvents(params)

        let filteredEvents = response.events

        if (searchQuery) {
          filteredEvents = filteredEvents.filter((event) =>
            event.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        }

        if (selectedTimeFilter !== 'all' && !customDate) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          filteredEvents = filteredEvents.filter((event) => {
            const eventDate = new Date(event.starts_at)
            eventDate.setHours(0, 0, 0, 0)

            switch (selectedTimeFilter) {
              case 'today': {
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)
                return eventDate >= today && eventDate < tomorrow
              }
              case 'tomorrow': {
                const dayAfter = new Date(today)
                dayAfter.setDate(dayAfter.getDate() + 2)
                const tomorrowStart = new Date(today)
                tomorrowStart.setDate(tomorrowStart.getDate() + 1)
                return eventDate >= tomorrowStart && eventDate < dayAfter
              }
              case 'this-week': {
                const weekEnd = new Date(today)
                weekEnd.setDate(weekEnd.getDate() + 7)
                return eventDate >= today && eventDate < weekEnd
              }
              case 'this-weekend': {
                const dayOfWeek = today.getDay()
                const daysUntilFriday = (5 - dayOfWeek + 7) % 7
                const friday = new Date(today)
                friday.setDate(friday.getDate() + daysUntilFriday)
                const monday = new Date(friday)
                monday.setDate(monday.getDate() + 3)
                return eventDate >= friday && eventDate < monday
              }
              case 'next-week': {
                const nextWeekStart = new Date(today)
                nextWeekStart.setDate(nextWeekStart.getDate() + 7)
                const nextWeekEnd = new Date(nextWeekStart)
                nextWeekEnd.setDate(nextWeekEnd.getDate() + 7)
                return eventDate >= nextWeekStart && eventDate < nextWeekEnd
              }
              case 'this-month': {
                const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
                return eventDate >= today && eventDate <= monthEnd
              }
              default:
                return true
            }
          })
        }

        setEvents(filteredEvents)
        setTotalEvents(response.total)
        setTotalPages(response.pages)
      } catch {
        // events fail silently; list renders empty state
      } finally {
        setIsLoading(false)
      }
    }
    fetchEvents()
  }, [currentPage, selectedCity, selectedGenre, selectedTimeFilter, customDate, searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCity, selectedGenre, selectedTimeFilter, customDate, searchQuery])

  // Scroll reveals — same pattern as Home
  useGSAP(() => {
    const section = listRef.current
    if (!section) return
    const items = section.querySelectorAll<HTMLElement>('[data-scroll]')
    gsap.fromTo(
      items,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.04,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      }
    )
  }, [events.length])

  const resetFilters = () => {
    setSelectedCountry('all')
    setSelectedCity('all')
    setSelectedTimeFilter('all')
    setSelectedGenre('all')
    setSearchQuery('')
    setCustomDate('')
    setCurrentPage(1)
  }

  const activeFiltersCount =
    (selectedCountry !== 'all' ? 1 : 0) +
    (selectedCity !== 'all' ? 1 : 0) +
    (selectedTimeFilter !== 'all' ? 1 : 0) +
    (selectedGenre !== 'all' ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    (customDate ? 1 : 0)

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <NewNavbar />

      <main className="pt-24 pb-20">
        {/* Issue strip */}
        <div className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-9 flex items-center gap-5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 tabular-nums">
            <span className="text-primary text-xs leading-none">◆</span>
            <span className="text-white font-medium">Programme</span>
            <span className="opacity-40">/</span>
            <span>Nights on rotation</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="w-1 h-1 bg-primary" />
              <span className="hidden sm:inline tabular-nums">
                <span className="text-white">{String(totalEvents).padStart(3, '0')}</span> listed
              </span>
            </div>
          </div>
        </div>

        {/* Header */}
        <section className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 pt-14 pb-10 sm:pt-20 sm:pb-12">
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-5">
              § 01 / The Index
            </div>
            <div className="grid grid-cols-12 gap-6 sm:gap-10 items-end">
              <h1
                className="col-span-12 md:col-span-8 font-headline text-[clamp(1.75rem,7vw,5.5rem)] leading-[0.95] tracking-[-0.035em] uppercase"
                style={{ fontWeight: 700 }}
              >
                Every night on the <span className="text-primary">board.</span>
              </h1>
              <p className="col-span-12 md:col-span-4 text-sm md:text-[15px] leading-[1.65] text-white/60 max-w-md">
                Filter by city, tempo, date. The programme keeps itself — what happened, what's next.
              </p>
            </div>
          </div>
        </section>

        {/* Search + filter toggle */}
        <section className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-6">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="search"
                  placeholder={t.events.searchPlaceholder || 'Search the index…'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border border-white/15 focus:border-white/60 pl-10 pr-4 py-3 text-sm placeholder-white/30 text-white transition-colors focus:outline-none"
                />
              </div>

              <button
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-2.5 px-4 py-3 text-[10px] font-mono tracking-[0.22em] uppercase border transition-colors duration-200',
                  showFilters
                    ? 'border-white text-white'
                    : 'border-white/15 text-white/70 hover:border-white/40 hover:text-white'
                )}
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.events.filters}</span>
                {activeFiltersCount > 0 && (
                  <span className="text-primary tabular-nums">· {activeFiltersCount}</span>
                )}
              </button>
            </div>

            {/* Quick time pills */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              {TIME_FILTERS.map((filter) => (
                <FilterPill
                  key={filter.id}
                  active={selectedTimeFilter === filter.id}
                  onClick={() => {
                    setSelectedTimeFilter(filter.id)
                    setCustomDate('')
                  }}
                >
                  {filter.label}
                </FilterPill>
              ))}
            </div>
          </div>
        </section>

        {/* Advanced filters — collapsed */}
        {showFilters && (
          <section className="border-b border-white/10">
            <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-8 grid grid-cols-12 gap-6 sm:gap-10">
              {/* Date */}
              <div className="col-span-12 md:col-span-4">
                <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-3">
                  § Date
                </div>
                <DatePicker
                  value={customDate}
                  onChange={(date) => {
                    setCustomDate(date)
                    setSelectedTimeFilter('all')
                  }}
                  placeholder={t.events.selectDate}
                />
              </div>

              {/* Location */}
              <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-3">
                    § Country
                  </div>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value)
                      setSelectedCity('all')
                    }}
                    className="w-full px-3.5 py-3 bg-transparent border border-white/15 focus:border-white/60 text-white text-sm focus:outline-none transition-colors"
                  >
                    <option value="all">{t.events.allCountries}</option>
                    {Object.keys(LOCATIONS).map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-3">
                    § City
                  </div>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={selectedCountry === 'all'}
                    className="w-full px-3.5 py-3 bg-transparent border border-white/15 focus:border-white/60 text-white text-sm focus:outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="all">{t.events.allCities}</option>
                    {selectedCountry !== 'all' &&
                      LOCATIONS[selectedCountry as keyof typeof LOCATIONS]?.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Genre */}
              <div className="col-span-12 md:col-span-3">
                <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-3">
                  § Tempo
                </div>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full px-3.5 py-3 bg-transparent border border-white/15 focus:border-white/60 text-white text-sm focus:outline-none transition-colors"
                >
                  <option value="all">{t.events.allGenres}</option>
                  {GENRES.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>

              {activeFiltersCount > 0 && (
                <div className="col-span-12 pt-5 border-t border-white/10">
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t.events.clearAll}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Result count */}
        <section className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-5 flex items-center justify-between text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 tabular-nums">
            <span>
              {isLoading ? (
                <>Loading…</>
              ) : (
                <>
                  <span className="text-white">{String(events.length).padStart(2, '0')}</span> shown
                  {totalEvents > 0 && (
                    <>
                      <span className="opacity-40 mx-2">/</span>
                      <span className="text-white">{String(totalEvents).padStart(3, '0')}</span> total
                    </>
                  )}
                </>
              )}
            </span>
            {totalPages > 1 && (
              <span>
                Page <span className="text-white">{currentPage}</span>
                <span className="opacity-40 mx-2">/</span>
                <span className="text-white">{totalPages}</span>
              </span>
            )}
          </div>
        </section>

        {/* List */}
        <section ref={listRef} className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-12 sm:py-16">
            {isLoading ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
                {[...Array(6)].map((_, i) => (
                  <li key={i}>
                    <div className="aspect-[3/4] bg-white/5 animate-pulse" />
                    <div className="pt-4 space-y-3">
                      <div className="h-6 bg-white/5 animate-pulse w-3/4" />
                      <div className="h-3 bg-white/5 animate-pulse w-1/2" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : events.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
                {events.map((event, i) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={i + (currentPage - 1) * EVENTS_PER_PAGE}
                    locale={locale}
                    viewLabel={t.events.viewEvent}
                  />
                ))}
              </ul>
            ) : (
              <div className="py-16 text-center">
                <div
                  className="font-headline text-4xl sm:text-5xl uppercase text-white/20"
                  style={{ fontWeight: 700 }}
                >
                  Quiet week.
                </div>
                <p className="text-sm text-white/50 mt-4 font-mono tracking-wider uppercase text-[11px]">
                  Nothing matches those filters. Try casting a wider net.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-6 inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors border-b border-white/20 hover:border-white pb-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                  {t.events.clearAll}
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && events.length > 0 && (
              <div className="mt-10 flex items-center justify-between gap-4 border-t border-white/10 pt-6">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-3 text-[11px] font-mono tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span>←</span>
                  <span>{t.events.prevPage}</span>
                </button>

                <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 tabular-nums">
                  <span className="text-white">{String(currentPage).padStart(2, '0')}</span>
                  <span className="opacity-50 mx-2">/</span>
                  <span>{String(totalPages).padStart(2, '0')}</span>
                </span>

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-3 text-[11px] font-mono tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span>{t.events.nextPage}</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <NewFooter />
    </div>
  )
}
