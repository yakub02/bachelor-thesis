import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatedBackground, NewNavbar, NewFooter } from '@/components/design'
import { ravetureApi } from '@/services/ravetureApi'
import { ArrowLeft } from 'lucide-react'

export function ArticleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [thread, setThread] = useState<any>(null)
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    ravetureApi.getForumThread(id)
      .then(data => {
        setThread(data.thread)
        setContent(data.posts?.[0]?.content ?? '')
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="relative min-h-screen bg-bg-dark text-white">
      <AnimatedBackground />
      <NewNavbar />

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 pt-32 pb-20">
        {/* Back */}
        <button
          onClick={() => navigate('/magazine')}
          className="flex items-center gap-2 text-text-muted hover:text-white text-xs uppercase tracking-widest mb-10 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Magazine
        </button>

        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-8 bg-surface w-2/3" />
            <div className="h-4 bg-surface w-1/2" />
            <div className="h-96 bg-surface w-full" />
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-surface" />)}
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-24">
            <span className="text-primary text-5xl block mb-4">◆</span>
            <p className="text-text-muted uppercase tracking-widest text-sm">Article not found</p>
          </div>
        )}

        {!loading && !error && thread && (
          <article>
            {/* Category label */}
            <span className="bg-primary text-black text-xs font-black px-2 py-1 uppercase tracking-widest">
              Editorial
            </span>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mt-6 leading-tight">
              {thread.title}
            </h1>

            {/* Subtitle */}
            {thread.subtitle && (
              <p className="text-text-muted text-lg mt-4 leading-relaxed max-w-2xl">
                {thread.subtitle}
              </p>
            )}

            {/* Meta */}
            <div className="flex items-center gap-3 mt-6 pb-6 border-b border-border text-text-muted text-xs">
              {thread.author && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary/20 border border-primary/30 flex items-center justify-center">
                    {thread.author.avatar_url ? (
                      <img src={thread.author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary font-black text-[10px]">
                        {thread.author.username[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-white/60 font-bold uppercase tracking-wider">
                    {thread.author.username}
                  </span>
                </div>
              )}
              <span>·</span>
              <span>
                {new Date(thread.created_at).toLocaleDateString('en-US', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </span>
            </div>

            {/* Cover image */}
            {thread.cover_image_url && (
              <div className="mt-8 mb-10">
                <img
                  src={thread.cover_image_url}
                  alt={thread.title}
                  className="w-full max-h-[520px] object-cover"
                />
              </div>
            )}

            {/* Body */}
            <div className="mt-8 prose-custom">
              {content.split('\n').filter(Boolean).map((para, i) => (
                <p key={i} className="text-white/80 text-base leading-relaxed mb-4">
                  {para}
                </p>
              ))}
            </div>
          </article>
        )}
      </div>

      <NewFooter />
    </div>
  )
}
