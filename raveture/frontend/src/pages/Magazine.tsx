import { useState, useEffect, useRef } from 'react'
import { NewNavbar, NewFooter } from '@/components/design'
import { ravetureApi } from '@/services/ravetureApi'
import { useLang } from '@/context'
import { DJSetCard } from '@/components/magazine/DJSetCard'
import { ArticleCard } from '@/components/magazine/ArticleCard'
import { ArchiveTimeline } from '@/components/magazine/ArchiveTimeline'
import { useAuth } from '@/context/AuthContext'
import { ImagePlus, X, Pencil } from 'lucide-react'

type Tab = 'dj-sets' | 'articles' | 'archive'

interface EditingThread {
  id: string
  title: string
  subtitle: string
  content: string
  cover_image_url: string
}

export function Magazine() {
  const { user } = useAuth()
  const canWrite = user?.role === 'admin' || user?.role === 'moderator'
  const { t } = useLang()

  const [activeTab, setActiveTab] = useState<Tab>('articles')

  // DJ Sets state
  const [djSets, setDjSets] = useState<any[]>([])
  const [djSetsLoading, setDjSetsLoading] = useState(false)
  const [djSetsTotal, setDjSetsTotal] = useState(0)
  const [djSetsPage, setDjSetsPage] = useState(1)
  const [djSortBy, setDjSortBy] = useState<'recent' | 'popular' | 'likes'>('recent')

  // Articles state
  const [articles, setArticles] = useState<any[]>([])
  const [articlesLoading, setArticlesLoading] = useState(false)
  const [articlesError, setArticlesError] = useState(false)

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createSubtitle, setCreateSubtitle] = useState('')
  const [createContent, setCreateContent] = useState('')
  const [createImageUrl, setCreateImageUrl] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Edit form
  const [editingThread, setEditingThread] = useState<EditingThread | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSubtitle, setEditSubtitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null)

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

  // Articles fetch
  useEffect(() => {
    if (activeTab !== 'articles') return
    setArticlesLoading(true)
    setArticlesError(false)
    ravetureApi.getForumThreads('editorial')
      .then(d => setArticles(d.threads))
      .catch(() => setArticlesError(true))
      .finally(() => setArticlesLoading(false))
  }, [activeTab])

  // ── Create ────────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (createTitle.trim().length < 5 || createContent.trim().length < 10) return
    setCreateSubmitting(true)
    setCreateError(null)
    try {
      let category: { id: string; name: string; slug: string }
      try { category = await ravetureApi.getForumCategory('editorial') }
      catch {
        const res = await ravetureApi.createForumCategory({ name: 'Editorial', slug: 'editorial', description: 'RAVETURE Magazine editorial articles' })
        category = res.category
      }
      const { thread } = await ravetureApi.createForumThread({
        category_id: category.id,
        title: createTitle.trim(),
        subtitle: createSubtitle.trim() || undefined,
        cover_image_url: createImageUrl.trim() || undefined,
        content: createContent.trim(),
      })
      setArticles(prev => [thread, ...prev])
      setCreateTitle(''); setCreateSubtitle(''); setCreateContent(''); setCreateImageUrl('')
      setShowCreateForm(false)
    } catch (err: unknown) {
      setCreateError(err && typeof err === 'object' && 'error' in err ? String((err as any).error) : 'Failed to publish article.')
    } finally {
      setCreateSubmitting(false)
    }
  }

  // ── Open edit ─────────────────────────────────────────────────────────────
  async function handleOpenEdit(thread: any) {
    setEditLoadingId(thread.id)
    try {
      const data = await ravetureApi.getForumThread(thread.id)
      const firstPost = data.posts?.[0]
      const t = data.thread
      setEditingThread({ id: thread.id, title: t.title, subtitle: t.subtitle ?? '', content: firstPost?.content ?? '', cover_image_url: t.cover_image_url ?? '' })
      setEditTitle(t.title); setEditSubtitle(t.subtitle ?? ''); setEditContent(firstPost?.content ?? ''); setEditImageUrl(t.cover_image_url ?? '')
      setEditError(null)
    } catch {
      setEditingThread({ id: thread.id, title: thread.title, subtitle: '', content: '', cover_image_url: '' })
      setEditTitle(thread.title); setEditSubtitle(''); setEditContent(''); setEditImageUrl('')
    } finally {
      setEditLoadingId(null)
    }
  }

  // ── Save edit ─────────────────────────────────────────────────────────────
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingThread || editTitle.trim().length < 5 || editContent.trim().length < 10) return
    setEditSubmitting(true)
    setEditError(null)
    try {
      const { thread } = await ravetureApi.updateForumThread(editingThread.id, {
        title: editTitle.trim(),
        subtitle: editSubtitle.trim() || undefined,
        cover_image_url: editImageUrl.trim() || undefined,
        content: editContent.trim(),
      })
      setArticles(prev => prev.map(a => a.id === editingThread.id ? { ...a, ...thread } : a))
      setEditingThread(null)
    } catch (err: unknown) {
      setEditError(err && typeof err === 'object' && 'error' in err ? String((err as any).error) : 'Failed to save changes.')
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(thread: any) {
    if (!confirm(`Delete "${thread.title}"?`)) return
    try {
      await ravetureApi.deleteForumThread(thread.id)
      setArticles(prev => prev.filter(a => a.id !== thread.id))
      if (editingThread?.id === thread.id) setEditingThread(null)
    } catch {
      // silently fail — thread stays in list
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'articles', label: t.magazine.tabArticles },
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
            <span className="opacity-40">/</span>
            <span>Bulletin Nº 007</span>
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

        {/* ── ARTICLES ────────────────────────────────────────────────────── */}
        {activeTab === 'articles' && (
          <div>
            {/* Write button */}
            {canWrite && !editingThread && !showCreateForm && (
              <div className="mb-8 flex justify-end">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 border border-white/25 text-[10px] font-mono tracking-[0.22em] uppercase text-white/80 hover:border-white hover:text-white transition-colors"
                >
                  <Pencil className="w-3 h-3" strokeWidth={1.75} />
                  <span>{t.magazine.writeArticle}</span>
                </button>
              </div>
            )}

            {/* Create form */}
            {showCreateForm && !editingThread && (
              <div className="mb-10">
                <ArticleForm
                  title={createTitle} subtitle={createSubtitle} content={createContent} imageUrl={createImageUrl}
                  submitting={createSubmitting} error={createError}
                  onTitleChange={setCreateTitle} onSubtitleChange={setCreateSubtitle}
                  onContentChange={setCreateContent} onImageUrlChange={setCreateImageUrl}
                  onSubmit={handleCreate}
                  onCancel={() => { setShowCreateForm(false); setCreateError(null) }}
                  heading="New Article" submitLabel="PUBLISH" submittingLabel="PUBLISHING..."
                />
              </div>
            )}

            {/* Edit form */}
            {editingThread && (
              <div className="mb-10">
                <ArticleForm
                  title={editTitle} subtitle={editSubtitle} content={editContent} imageUrl={editImageUrl}
                  submitting={editSubmitting} error={editError}
                  onTitleChange={setEditTitle} onSubtitleChange={setEditSubtitle}
                  onContentChange={setEditContent} onImageUrlChange={setEditImageUrl}
                  onSubmit={handleSaveEdit}
                  onCancel={() => { setEditingThread(null); setEditError(null) }}
                  heading="Edit Article" submitLabel="SAVE" submittingLabel="SAVING..."
                />
              </div>
            )}

            {/* List */}
            {articlesLoading ? (
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 animate-pulse h-96 w-full" />
                {[1,2,3].map(i => <div key={i} className="bg-white/5 border border-white/10 animate-pulse h-32" />)}
              </div>
            ) : articlesError ? (
              <div className="py-16 text-center">
                <div
                  className="font-headline text-4xl sm:text-5xl uppercase text-white/20"
                  style={{ fontWeight: 700 }}
                >
                  Signal lost.
                </div>
                <p className="text-[11px] text-white/50 mt-4 font-mono tracking-[0.22em] uppercase">
                  {t.magazine.editorialMissing}
                </p>
                <p className="text-white/40 text-[13px] mt-3 max-w-md mx-auto leading-[1.6]">
                  {t.magazine.editorialHint}
                </p>
              </div>
            ) : articles.length === 0 ? (
              <div className="py-16 text-center">
                <div
                  className="font-headline text-4xl sm:text-5xl uppercase text-white/20"
                  style={{ fontWeight: 700 }}
                >
                  Blank page.
                </div>
                <p className="text-[11px] text-white/50 mt-4 font-mono tracking-[0.22em] uppercase">
                  {t.magazine.noArticles}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((thread, idx) => (
                  <ArticleCard
                    key={thread.id}
                    thread={thread}
                    featured={idx === 0}
                    canEdit={canWrite}
                    onEdit={editLoadingId === thread.id ? undefined : () => handleOpenEdit(thread)}
                    onDelete={() => handleDelete(thread)}
                    loading={editLoadingId === thread.id}
                  />
                ))}
              </div>
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

// ── Article Form ───────────────────────────────────────────────────────────
interface ArticleFormProps {
  title: string; subtitle: string; content: string; imageUrl: string
  submitting: boolean; error: string | null
  onTitleChange: (v: string) => void; onSubtitleChange: (v: string) => void
  onContentChange: (v: string) => void; onImageUrlChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void
  heading: string; submitLabel: string; submittingLabel: string
}

function ArticleForm({ title, subtitle, content, imageUrl, submitting, error, onTitleChange, onSubtitleChange, onContentChange, onImageUrlChange, onSubmit, onCancel, heading, submitLabel, submittingLabel }: ArticleFormProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const res = await ravetureApi.uploadImage(file, 'images')
      const base = import.meta.env.VITE_RAVETURE_API_URL || 'http://localhost:5000'
      onImageUrlChange(res.url.startsWith('http') ? res.url : `${base}${res.url}`)
    } catch {
      setUploadError('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="border-t border-b border-white/10 py-10 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-primary">§ {heading}</span>
        <button type="button" onClick={onCancel} className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 hover:text-white transition-colors">Cancel</button>
      </div>

      {/* Cover image */}
      <div>
        <label className="block text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 mb-2.5">Cover image</label>
        {imageUrl ? (
          <div className="relative group">
            <img src={imageUrl} alt="cover" className="w-full h-56 object-cover grayscale group-hover:grayscale-0 transition-[filter] duration-500" />
            <button
              type="button"
              onClick={() => { onImageUrlChange(''); if (fileRef.current) fileRef.current.value = '' }}
              className="absolute top-3 right-3 bg-black/70 border border-white/20 text-white/70 hover:text-white hover:border-white p-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full h-40 border border-dashed border-white/20 hover:border-white/60 text-white/40 hover:text-white transition-colors flex flex-col items-center justify-center gap-3 disabled:opacity-50"
          >
            <ImagePlus className="w-6 h-6" strokeWidth={1.25} />
            <span className="text-[10px] font-mono tracking-[0.22em] uppercase">{uploading ? 'Uploading…' : 'Upload cover image'}</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        {uploadError && <p className="text-[11px] text-destructive mt-2 font-mono tracking-wider">{uploadError}</p>}
      </div>

      {/* Title */}
      <div>
        <label className="block text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 mb-2">
          Headline <span className="normal-case tracking-normal text-white/30">(min. 5 chars)</span>
        </label>
        <input type="text" value={title} onChange={e => onTitleChange(e.target.value)}
          placeholder="Article headline…" minLength={5} maxLength={200} required
          className="w-full bg-transparent border border-white/15 text-white text-base px-4 py-3 focus:outline-none focus:border-white/60 placeholder:text-white/30 transition-colors" />
      </div>

      {/* Subtitle */}
      <div>
        <label className="block text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 mb-2">
          Subtitle <span className="normal-case tracking-normal text-white/30">(optional)</span>
        </label>
        <input type="text" value={subtitle} onChange={e => onSubtitleChange(e.target.value)}
          placeholder="Short description shown under the headline…" maxLength={300}
          className="w-full bg-transparent border border-white/15 text-white text-sm px-4 py-3 focus:outline-none focus:border-white/60 placeholder:text-white/30 transition-colors" />
      </div>

      {/* Content */}
      <div>
        <label className="block text-[10px] font-mono tracking-[0.22em] uppercase text-white/50 mb-2">
          Body <span className="normal-case tracking-normal text-white/30">(min. 10 chars)</span>
        </label>
        <textarea value={content} onChange={e => onContentChange(e.target.value)}
          placeholder="Write your article…" rows={12} minLength={10} required
          className="w-full bg-transparent border border-white/15 text-white text-sm leading-[1.7] px-4 py-3 focus:outline-none focus:border-white/60 placeholder:text-white/30 resize-y transition-colors" />
      </div>

      {error && <p className="text-[12px] text-destructive font-mono tracking-wider">{error}</p>}

      <div className="flex items-center gap-5 pt-2 border-t border-white/10">
        <button type="submit" disabled={submitting || title.trim().length < 5 || content.trim().length < 10}
          className="group inline-flex items-center gap-3 px-5 py-3 bg-primary text-black text-[11px] font-mono tracking-[0.2em] uppercase font-semibold hover:bg-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed mt-5">
          <span>{submitting ? submittingLabel : submitLabel}</span>
          {!submitting && <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>}
        </button>
        <button type="button" onClick={onCancel}
          className="text-[11px] font-mono tracking-[0.22em] uppercase text-white/60 hover:text-white transition-colors mt-5">
          Cancel
        </button>
      </div>
    </form>
  )
}
