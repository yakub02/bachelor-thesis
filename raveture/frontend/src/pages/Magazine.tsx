import { useState, useEffect, useRef } from 'react'
import { AnimatedBackground, NewNavbar, NewFooter } from '@/components/design'
import { ravetureApi } from '@/services/ravetureApi'
import { DJSetCard } from '@/components/magazine/DJSetCard'
import { ArticleCard } from '@/components/magazine/ArticleCard'
import { ArchiveTimeline } from '@/components/magazine/ArchiveTimeline'
import { useAuth } from '@/context/AuthContext'
import { ImagePlus, X } from 'lucide-react'

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
    { id: 'articles', label: 'ARTICLES' },
    { id: 'dj-sets', label: 'DJ SETS' },
    { id: 'archive', label: 'ARCHIVE' },
  ]

  return (
    <div className="relative min-h-screen bg-bg-dark text-white">
      <AnimatedBackground />
      <NewNavbar />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-32 pb-16">
        {/* Header */}
        <div className="mb-12">
          <span className="bg-primary text-black text-xs font-black px-2 py-1 uppercase tracking-widest">
            RAVETURE
          </span>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white mt-4">
            RAVE
            <br />
            <span className="text-primary">MAGAZINE</span>
          </h1>
          <p className="text-text-muted text-sm mt-4 max-w-lg">
            DJ sets, editorial articles, and the full event archive.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── DJ SETS ─────────────────────────────────────────────────────── */}
        {activeTab === 'dj-sets' && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-text-muted text-xs uppercase tracking-widest">Sort by:</span>
              {(['recent', 'popular', 'likes'] as const).map(s => (
                <button key={s} onClick={() => setDjSortBy(s)}
                  className={`text-xs font-bold uppercase px-3 py-1 border transition-colors ${djSortBy === s ? 'border-primary text-primary bg-primary/10' : 'border-border text-text-muted hover:text-white'}`}>
                  {s === 'recent' ? 'Latest' : s === 'popular' ? 'Most Played' : 'Most Liked'}
                </button>
              ))}
              <span className="ml-auto text-text-muted text-xs">{djSetsTotal} sets</span>
            </div>
            {djSetsLoading && djSetsPage === 1 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="bg-surface border border-border animate-pulse h-64" />)}
              </div>
            ) : djSets.length === 0 ? (
              <div className="text-center py-24"><span className="text-primary text-5xl block mb-4">◆</span><p className="text-text-muted uppercase tracking-widest text-sm">No DJ sets yet</p></div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {djSets.map(set => <DJSetCard key={set.id} set={set} />)}
                </div>
                {djSetsTotal > djSets.length && (
                  <div className="text-center mt-8">
                    <button onClick={() => setDjSetsPage(p => p + 1)} disabled={djSetsLoading}
                      className="border border-border text-text-muted font-black uppercase text-xs px-8 py-3 hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
                      {djSetsLoading ? 'LOADING...' : 'LOAD MORE'}
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
              <div className="mb-8">
                <button onClick={() => setShowCreateForm(true)}
                  className="border border-primary text-primary font-black uppercase text-xs px-6 py-2 hover:bg-primary hover:text-black transition-colors">
                  + WRITE ARTICLE
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
                <div className="bg-surface border border-border animate-pulse h-96 w-full" />
                {[1,2,3].map(i => <div key={i} className="bg-surface border border-border animate-pulse h-32" />)}
              </div>
            ) : articlesError ? (
              <div className="text-center py-24">
                <span className="text-primary text-5xl block mb-4">◆</span>
                <p className="text-text-muted uppercase tracking-widest text-sm">Editorial category not found</p>
                <p className="text-text-muted text-xs mt-2">
                  Publish the first article to create the <code className="text-primary">editorial</code> category automatically.
                </p>
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-24">
                <span className="text-primary text-5xl block mb-4">◆</span>
                <p className="text-text-muted uppercase tracking-widest text-sm">No articles yet</p>
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
    <form onSubmit={onSubmit} className="border border-border bg-surface p-6 space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest text-primary">{heading}</span>
        <button type="button" onClick={onCancel} className="text-text-muted hover:text-white text-xs uppercase tracking-widest transition-colors">Cancel</button>
      </div>

      {/* Cover image */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-text-muted mb-2">Cover Image</label>
        {imageUrl ? (
          <div className="relative group">
            <img src={imageUrl} alt="cover" className="w-full h-48 object-cover" />
            <button
              type="button"
              onClick={() => { onImageUrlChange(''); if (fileRef.current) fileRef.current.value = '' }}
              className="absolute top-2 right-2 bg-black/70 border border-border text-text-muted hover:text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full h-40 border border-dashed border-border hover:border-primary text-text-muted hover:text-primary transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-50"
          >
            <ImagePlus className="w-8 h-8" />
            <span className="text-xs uppercase tracking-widest">{uploading ? 'Uploading...' : 'Click to upload image'}</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        {uploadError && <p className="text-red-400 text-xs mt-1">{uploadError}</p>}
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-text-muted mb-1">
          Headline <span className="normal-case tracking-normal opacity-60">(min. 5 chars)</span>
        </label>
        <input type="text" value={title} onChange={e => onTitleChange(e.target.value)}
          placeholder="Article headline..." minLength={5} maxLength={200} required
          className="w-full bg-bg-dark border border-border text-white text-sm px-4 py-2 focus:outline-none focus:border-primary placeholder:text-text-muted" />
      </div>

      {/* Subtitle */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-text-muted mb-1">Subtitle <span className="normal-case tracking-normal opacity-60">(optional)</span></label>
        <input type="text" value={subtitle} onChange={e => onSubtitleChange(e.target.value)}
          placeholder="Short description shown under the headline..." maxLength={300}
          className="w-full bg-bg-dark border border-border text-white text-sm px-4 py-2 focus:outline-none focus:border-primary placeholder:text-text-muted" />
      </div>

      {/* Content */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-text-muted mb-1">
          Body <span className="normal-case tracking-normal opacity-60">(min. 10 chars)</span>
        </label>
        <textarea value={content} onChange={e => onContentChange(e.target.value)}
          placeholder="Write your article..." rows={10} minLength={10} required
          className="w-full bg-bg-dark border border-border text-white text-sm px-4 py-3 focus:outline-none focus:border-primary placeholder:text-text-muted resize-y" />
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={submitting || title.trim().length < 5 || content.trim().length < 10}
          className="border border-primary text-primary font-black uppercase text-xs px-8 py-2 hover:bg-primary hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {submitting ? submittingLabel : submitLabel}
        </button>
        <button type="button" onClick={onCancel}
          className="border border-border text-text-muted font-black uppercase text-xs px-6 py-2 hover:text-white hover:border-white transition-colors">
          CANCEL
        </button>
      </div>
    </form>
  )
}
