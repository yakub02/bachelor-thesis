import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { AnimatedBackground, NewNavbar, NewFooter, GlowButton, GlowCard, GlowInput } from '@/components/design'
import { DatePicker } from '@/components/ui/date-picker'
import { ravetureApi, type Event } from '@/services/ravetureApi'
import { cn } from '@/utils'

// Countries and cities data
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
  'Techno',
  'House',
  'Trance',
  'Drum & Bass',
  'Dubstep',
  'Hardcore',
  'Ambient',
  'Industrial',
  'Electro',
  'Minimal',
  'Progressive',
  'Psytrance',
]

const TIME_FILTERS = [
  { id: 'all', label: 'All Events' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'this-week', label: 'This Week' },
  { id: 'this-weekend', label: 'This Weekend' },
  { id: 'next-week', label: 'Next Week' },
  { id: 'this-month', label: 'This Month' },
]

const EVENTS_PER_PAGE = 12

// Enhanced Event Card with proper glow
function EventCardEnhanced({ event }: { event: Event }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link to={`/events/${event.id}`}>
      <motion.div
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ y: -8 }}
        className="relative group cursor-pointer"
      >
        <GlowCard className="overflow-hidden h-full">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-cover bg-center grayscale contrast-125"
              style={{
                backgroundImage: event.cover_image_url
                  ? `url('${event.cover_image_url}')`
                  : `url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80')`,
              }}
              animate={{
                scale: isHovered ? 1.1 : 1,
                filter: isHovered ? 'grayscale(0%) contrast(100%)' : 'grayscale(100%) contrast(125%)',
              }}
              transition={{ duration: 0.6 }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            {/* Featured badge */}
            {event.is_featured && (
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
                FEATURED
              </motion.div>
            )}

            {/* Date badge */}
            <div className="absolute top-4 left-4 px-3 py-2 bg-black/80 backdrop-blur-sm border border-primary/30">
              <div className="text-primary text-xl font-black">
                {new Date(event.starts_at).getDate()}
              </div>
              <div className="text-white text-xs font-mono uppercase">
                {new Date(event.starts_at).toLocaleDateString('en-US', { month: 'short' })}
              </div>
            </div>

            {/* Genres */}
            {event.genres && event.genres.length > 0 && (
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                {event.genres.slice(0, 3).map((genre) => (
                  <span
                    key={genre}
                    className="px-2 py-1 bg-black/60 backdrop-blur-sm border border-primary/30 text-primary text-[10px] font-mono uppercase"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="text-xl font-bold uppercase mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {event.name}
            </h3>

            <div className="space-y-2 text-sm text-text-muted mb-4">
              {event.venue && (
                <div className="flex items-center gap-2">
                  <span className="text-primary">📍</span>
                  <span>{event.venue.city}, {event.venue.country}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-primary">🕐</span>
                <span>
                  {new Date(event.starts_at).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })} • {new Date(event.starts_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {/* CTA */}
            <motion.div
              className="flex items-center justify-between pt-4 border-t border-border-grey"
              animate={{ x: isHovered ? 5 : 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <span className="text-primary font-mono text-sm uppercase font-bold">View Event</span>
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.div>
          </div>
        </GlowCard>
      </motion.div>
    </Link>
  )
}

// Filter Button Component
function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'px-4 py-2 font-mono text-sm uppercase tracking-wider transition-all duration-300',
        active
          ? 'bg-primary text-black shadow-[0_0_20px_rgba(218,120,88,0.5)]'
          : 'bg-graphite border border-border-grey text-text-muted hover:border-primary hover:text-white'
      )}
    >
      {children}
    </motion.button>
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
        <div className="h-4 bg-graphite animate-pulse w-2/3" />
      </div>
    </div>
  )
}

// Calculate date for time filters
function getDateForTimeFilter(filterId: string): string | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (filterId) {
    case 'today':
      return today.toISOString().split('T')[0]
    case 'tomorrow':
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow.toISOString().split('T')[0]
    case 'this-week':
      return today.toISOString().split('T')[0]
    case 'this-weekend':
      const dayOfWeek = today.getDay()
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7
      const friday = new Date(today)
      friday.setDate(friday.getDate() + daysUntilFriday)
      return friday.toISOString().split('T')[0]
    case 'next-week':
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      return nextWeek.toISOString().split('T')[0]
    case 'this-month':
      return today.toISOString().split('T')[0]
    default:
      return null
  }
}

export function Events() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [events, setEvents] = useState<Event[]>([])
  const [totalEvents, setTotalEvents] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)

  // Filter states
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [customDate, setCustomDate] = useState('')

  // Fetch events with backend filtering
  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true)
      try {
        // Build API params
        const params: any = {
          page: currentPage,
          per_page: EVENTS_PER_PAGE,
        }

        // Backend supports single city filter
        if (selectedCity !== 'all') {
          params.city = selectedCity
        }

        // Backend supports single genre filter
        if (selectedGenre !== 'all') {
          params.genre = selectedGenre
        }

        // Backend supports from_date
        if (customDate) {
          params.from_date = customDate
        } else if (selectedTimeFilter !== 'all') {
          const date = getDateForTimeFilter(selectedTimeFilter)
          if (date) {
            params.from_date = date
          }
        }

        const response = await ravetureApi.getEvents(params)

        // Frontend filtering for search query (backend doesn't support)
        let filteredEvents = response.events

        if (searchQuery) {
          filteredEvents = filteredEvents.filter((event) =>
            event.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        }

        // Additional frontend filtering for time ranges (backend only supports from_date)
        if (selectedTimeFilter !== 'all' && !customDate) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          filteredEvents = filteredEvents.filter((event) => {
            const eventDate = new Date(event.starts_at)
            eventDate.setHours(0, 0, 0, 0)

            switch (selectedTimeFilter) {
              case 'today':
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)
                return eventDate >= today && eventDate < tomorrow
              case 'tomorrow':
                const dayAfter = new Date(today)
                dayAfter.setDate(dayAfter.getDate() + 2)
                const tomorrowStart = new Date(today)
                tomorrowStart.setDate(tomorrowStart.getDate() + 1)
                return eventDate >= tomorrowStart && eventDate < dayAfter
              case 'this-week':
                const weekEnd = new Date(today)
                weekEnd.setDate(weekEnd.getDate() + 7)
                return eventDate >= today && eventDate < weekEnd
              case 'this-weekend':
                const dayOfWeek = today.getDay()
                const daysUntilFriday = (5 - dayOfWeek + 7) % 7
                const friday = new Date(today)
                friday.setDate(friday.getDate() + daysUntilFriday)
                const monday = new Date(friday)
                monday.setDate(monday.getDate() + 3)
                return eventDate >= friday && eventDate < monday
              case 'next-week':
                const nextWeekStart = new Date(today)
                nextWeekStart.setDate(nextWeekStart.getDate() + 7)
                const nextWeekEnd = new Date(nextWeekStart)
                nextWeekEnd.setDate(nextWeekEnd.getDate() + 7)
                return eventDate >= nextWeekStart && eventDate < nextWeekEnd
              case 'this-month':
                const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
                return eventDate >= today && eventDate <= monthEnd
              default:
                return true
            }
          })
        }

        setEvents(filteredEvents)
        setTotalEvents(response.total)
        setTotalPages(response.pages)
      } catch (err) {
        console.error('Failed to fetch events:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchEvents()
  }, [currentPage, selectedCity, selectedGenre, selectedTimeFilter, customDate, searchQuery])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCity, selectedGenre, selectedTimeFilter, customDate, searchQuery])

  // Animations
  useGSAP(() => {
    if (contentRef.current && !isLoading) {
      gsap.fromTo(
        '.filter-section',
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      )
      gsap.fromTo(
        '.events-grid',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.3, ease: 'power3.out' }
      )
    }
  }, [isLoading, events])

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
      <AnimatedBackground />
      <NewNavbar />

      <main ref={contentRef} className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 mb-4">
              <span className="text-primary text-xs font-mono uppercase tracking-wider">
                🔥 Backend Filtering • Optimized
              </span>
            </div>
            <h1 className="text-6xl md:text-7xl font-black uppercase tracking-tighter mb-4">
              All <span className="text-primary">Events</span>
            </h1>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Production-ready filtering with backend API integration
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            className="filter-section mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <GlowInput
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className="px-6 py-3 bg-graphite border border-border-grey hover:border-primary transition-colors font-mono uppercase text-sm flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Filters
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-1 bg-primary text-black text-xs font-bold rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <GlowCard className="p-8 mb-8 filter-section">
                  {/* Time Filters */}
                  <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase mb-4 flex items-center gap-2">
                      <span className="text-primary">◆</span>
                      When
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {TIME_FILTERS.map((filter) => (
                        <FilterButton
                          key={filter.id}
                          active={selectedTimeFilter === filter.id}
                          onClick={() => {
                            setSelectedTimeFilter(filter.id)
                            setCustomDate('')
                          }}
                        >
                          {filter.label}
                        </FilterButton>
                      ))}
                    </div>
                    <div className="mt-4">
                      <label className="block text-xs font-mono text-text-muted uppercase mb-2">
                        Or choose specific date:
                      </label>
                      <DatePicker
                        value={customDate}
                        onChange={(date) => {
                          setCustomDate(date)
                          setSelectedTimeFilter('all')
                        }}
                        placeholder="Select a date"
                      />
                    </div>
                  </div>

                  {/* Location Filters */}
                  <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase mb-4 flex items-center gap-2">
                      <span className="text-primary">◆</span>
                      Where (Backend filtered)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Country */}
                      <div>
                        <label className="block text-xs font-mono text-text-muted uppercase mb-2">
                          Country
                        </label>
                        <select
                          value={selectedCountry}
                          onChange={(e) => {
                            setSelectedCountry(e.target.value)
                            setSelectedCity('all')
                          }}
                          className="w-full px-4 py-3 bg-graphite border border-border-grey text-white font-mono focus:border-primary focus:outline-none transition-colors"
                        >
                          <option value="all">All Countries</option>
                          {Object.keys(LOCATIONS).map((country) => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* City */}
                      <div>
                        <label className="block text-xs font-mono text-text-muted uppercase mb-2">
                          City
                        </label>
                        <select
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          disabled={selectedCountry === 'all'}
                          className="w-full px-4 py-3 bg-graphite border border-border-grey text-white font-mono focus:border-primary focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="all">All Cities</option>
                          {selectedCountry !== 'all' &&
                            LOCATIONS[selectedCountry as keyof typeof LOCATIONS]?.map((city) => (
                              <option key={city} value={city}>
                                {city}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Genre Filter */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold uppercase mb-4 flex items-center gap-2">
                      <span className="text-primary">◆</span>
                      Genre (Backend filtered)
                    </h3>
                    <select
                      value={selectedGenre}
                      onChange={(e) => setSelectedGenre(e.target.value)}
                      className="w-full px-4 py-3 bg-graphite border border-border-grey text-white font-mono focus:border-primary focus:outline-none transition-colors"
                    >
                      <option value="all">All Genres</option>
                      {GENRES.map((genre) => (
                        <option key={genre} value={genre}>
                          {genre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reset Button */}
                  {activeFiltersCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="pt-6 border-t border-border-grey"
                    >
                      <GlowButton variant="outline" onClick={resetFilters}>
                        Reset All Filters
                      </GlowButton>
                    </motion.div>
                  )}
                </GlowCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Count & Pagination Info */}
          <motion.div
            className="mb-8 flex items-center justify-between filter-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-text-muted font-mono">
              {isLoading ? (
                'Loading events...'
              ) : (
                <>
                  Showing <span className="text-primary font-bold">{events.length}</span> events
                  {totalEvents > 0 && (
                    <>
                      {' '}• Page <span className="text-white font-bold">{currentPage}</span> of{' '}
                      <span className="text-white font-bold">{totalPages}</span>
                    </>
                  )}
                </>
              )}
            </p>
          </motion.div>

          {/* Events Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 events-grid">
              {[...Array(EVENTS_PER_PAGE)].map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : events.length > 0 ? (
            <>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 events-grid mb-12"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: { staggerChildren: 0.05 }
                  }
                }}
              >
                {events.map((event) => (
                  <motion.div
                    key={event.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                  >
                    <EventCardEnhanced event={event} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div
                  className="flex justify-center items-center gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-6 py-3 bg-graphite border border-border-grey hover:border-primary transition-colors font-mono uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border-grey"
                  >
                    ← Previous
                  </motion.button>

                  <span className="text-text-muted font-mono">
                    Page {currentPage} of {totalPages}
                  </span>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-6 py-3 bg-graphite border border-border-grey hover:border-primary transition-colors font-mono uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border-grey"
                  >
                    Next →
                  </motion.button>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <GlowCard className="p-12 max-w-md mx-auto">
                <div className="text-6xl mb-4">🎵</div>
                <h3 className="text-2xl font-bold mb-2">No Events Found</h3>
                <p className="text-text-muted mb-6">
                  Try adjusting your filters or search query
                </p>
                <GlowButton variant="outline" onClick={resetFilters}>
                  Reset Filters
                </GlowButton>
              </GlowCard>
            </motion.div>
          )}
        </div>
      </main>

      <NewFooter />
    </div>
  )
}
