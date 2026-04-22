import { useState, useEffect } from 'react'
import { NewNavbar, NewFooter } from '@/components/design'
import { ravetureApi } from '@/services/ravetureApi'
import { useLang } from '@/context'
import { DJSetCard } from '@/components/magazine/DJSetCard'
import { ArchiveTimeline } from '@/components/magazine/ArchiveTimeline'

type Tab = 'dj-sets' | 'archive'

export function Magazine() {
  const { t } = useLang()

  const [activeTab, setActiveTab] = useState<Tab>('dj-sets')

  // DJ Sets state
  const [djSets, setDjSets] = useState<any[]>([])
  const [djSetsLoading, setDjSetsLoading] = useState(false)
  const [djSetsTotal, setDjSetsTotal] = useState(0)
  const [djSetsPage, setDjSetsPage] = useState(1)
  const [djSortBy, setDjSortBy] = useState<'recent' | 'popular' | 'likes'>('recent')

  // DJ Sets fetch
  useEffect(() => {
    if (activeTab !== 'dj-sets') return
    setDjSetsLoading(true)
    ravetureApi.getMedia({ type: 'audio_set', sort: djSortBy, page: djSetsPage, per_page: 12 })
      .then(d => {
        setDjSets(prev => djSetsPage === 1 ? d.media : [...prev, ...d.media])
        setDjSetsTotal(d.total)
      })
      .catch(() => {})
      .finally(() => setDjSetsLoading(false))
  }, [activeTab, djSortBy, djSetsPage])

  useEffect(() => { setDjSetsPage(1); setDjSets([]) }, [djSortBy])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dj-sets', label: t.magazine.tabDjSets },
    { id: 'archive', label: t.magazine.tabArchive },
  ]

  return (
    <div className="relative min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <NewNavbar />

      <main className="pt-24 pb-20">
        {/* Issue strip */}
        <div className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-9 flex items-center gap-5 text-[10px] font-mono tracking-[0.22em] uppercase text-white/50">
            <span className="text-primary text-xs leading-none">◆</span>
            <span className="text-white font-medium">{t.magazine.badge}</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="w-1 h-1 bg-primary" />
              <span className="hidden sm:inline">Dispatches from the floor</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <section className="border-b border-white/10">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10 pt-14 pb-10 sm:pt-20 sm:pb-14">
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary mb-5">
              § 01 / Editorial
            </div>
            <div className="grid grid-cols-12 gap-6 sm:gap-10 items-end">
              <h1
                className="col-span-12 font-headline text-[clamp(1.75rem,7vw,5.5rem)] leading-[0.95] tracking-[-0.035em] uppercase whitespace-nowrap"
                style={{ fontWeight: 700 }}
              >
                {t.magazine.title1} <span className="text-primary">{t.magazine.title2}</span>
              </h1>
              <p className="col-span-12 md:col-span-7 text-sm md:text-[15px] leading-[1.65] text-white/60 max-w-xl">
                {t.magazine.subtitle}
              </p>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="border-b border-white/10 sticky top-16 z-30 bg-bg-dark/95 backdrop-blur-sm">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
            <div className="flex">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-0 mr-8 sm:mr-10 py-4 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.22em] transition-colors ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`absolute left-0 right-0 -bottom-px h-px transition-all duration-300 ${
                      activeTab === tab.id ? 'bg-primary' : 'bg-transparent'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 pt-12 pb-4">

        {/* ── DJ SETS ─────────────────────────────────────────────────────── */}
        {activeTab === 'dj-sets' && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-white/10 pb-5">
              <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 mr-2">
                Sort
              </span>
              {(['recent', 'popular', 'likes'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setDjSortBy(s)}
                  className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.22em] transition-colors ${
                    djSortBy === s
                      ? 'bg-white text-black'
                      : 'border border-white/15 text-white/60 hover:border-white/40 hover:text-white'
                  }`}
                >
                  {s === 'recent' ? t.magazine.sortLatest : s === 'popular' ? t.magazine.sortPlayed : t.magazine.sortLiked}
                </button>
              ))}
              <span className="ml-auto text-[10px] font-mono tracking-[0.22em] uppercase text-white/40 tabular-nums">
                <span className="text-white">{String(djSetsTotal).padStart(3, '0')}</span> {t.magazine.sets}
              </span>
            </div>
            {djSetsLoading && djSetsPage === 1 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="bg-white/5 border border-white/10 animate-pulse h-64" />)}
              </div>
            ) : djSets.length === 0 ? (
              <div className="py-16 text-center">
                <div
                  className="font-headline text-4xl sm:text-5xl uppercase text-white/20"
                  style={{ fontWeight: 700 }}
                >
                  Nothing filed yet.
                </div>
                <p className="text-[11px] text-white/50 mt-4 font-mono tracking-[0.22em] uppercase">
                  {t.magazine.noSets}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {djSets.map(set => <DJSetCard key={set.id} set={set} />)}
                </div>
                {djSetsTotal > djSets.length && (
                  <div className="text-center mt-10 pt-6 border-t border-white/10">
                    <button
                      onClick={() => setDjSetsPage(p => p + 1)}
                      disabled={djSetsLoading}
                      className="inline-flex items-center gap-3 px-5 py-3 border border-white/25 text-[11px] font-mono tracking-[0.2em] uppercase text-white/80 hover:border-white hover:text-white transition-colors disabled:opacity-40"
                    >
                      <span>{djSetsLoading ? t.magazine.loading : t.magazine.loadMore}</span>
                      <span>+</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── ARCHIVE ─────────────────────────────────────────────────────── */}
        {activeTab === 'archive' && <ArchiveTimeline />}
        </div>
      </main>

      <NewFooter />
    </div>
  )
}
