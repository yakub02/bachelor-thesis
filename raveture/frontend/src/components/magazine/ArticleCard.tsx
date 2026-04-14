import { Link } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'

interface Thread {
  id: string
  title: string
  slug: string
  subtitle?: string
  cover_image_url?: string
  preview_content: string
  reply_count: number
  view_count: number
  last_post_at: string
  created_at: string
  author?: { id: string; username: string; avatar_url: string | null }
}

interface ArticleCardProps {
  thread: Thread
  canEdit?: boolean
  onEdit?: (thread: Thread) => void
  onDelete?: (thread: Thread) => void
  loading?: boolean
  featured?: boolean
}

export function ArticleCard({ thread, canEdit, onEdit, onDelete, loading, featured }: ArticleCardProps) {
  const date = new Date(thread.created_at || thread.last_post_at)
  const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })

  if (featured) {
    return (
      <div className="relative group border border-border hover:border-primary transition-colors duration-200">
        {/* Large cover image */}
        <Link to={`/magazine/articles/${thread.id}`}>
          {thread.cover_image_url ? (
            <div className="relative overflow-hidden">
              <img
                src={thread.cover_image_url}
                alt={thread.title}
                className="w-full h-80 md:h-[480px] object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            </div>
          ) : (
            <div className="w-full h-80 md:h-[480px] bg-surface flex items-center justify-center">
              <span className="text-primary text-7xl font-black opacity-20">◆</span>
            </div>
          )}

          {/* Overlay text */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <span className="bg-primary text-black text-[10px] font-black px-2 py-0.5 uppercase tracking-widest">
              Editorial
            </span>
            <h2 className="text-white font-black uppercase text-2xl md:text-4xl tracking-tighter mt-2 leading-tight group-hover:text-primary transition-colors">
              {thread.title}
            </h2>
            {thread.subtitle && (
              <p className="text-white/70 text-sm mt-2 line-clamp-2 max-w-2xl">
                {thread.subtitle}
              </p>
            )}
            <p className="text-white/40 text-xs mt-3 uppercase tracking-widest">{dateStr}</p>
          </div>
        </Link>

        {canEdit && (
          <div className="absolute top-4 right-4 flex gap-1">
            <button
              onClick={() => onEdit?.(thread)}
              disabled={loading || !onEdit}
              className="bg-black/60 border border-border text-text-muted hover:text-primary hover:border-primary transition-colors p-2 disabled:opacity-40"
              title="Edit article"
            >
              {loading ? <span className="text-[10px]">...</span> : <Pencil className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onDelete?.(thread)}
              disabled={loading}
              className="bg-black/60 border border-border text-text-muted hover:text-red-400 hover:border-red-400 transition-colors p-2 disabled:opacity-40"
              title="Delete article"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // Regular card
  return (
    <div className="group border border-border hover:border-primary transition-colors duration-200 flex">
      {/* Cover image (left side) */}
      <Link to={`/magazine/articles/${thread.id}`} className="flex-none w-40 md:w-52 overflow-hidden">
        {thread.cover_image_url ? (
          <img
            src={thread.cover_image_url}
            alt={thread.title}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
          />
        ) : (
          <div className="w-full h-full min-h-[120px] bg-surface flex items-center justify-center">
            <span className="text-primary text-3xl font-black opacity-20">◆</span>
          </div>
        )}
      </Link>

      {/* Text */}
      <div className="flex-1 p-4 md:p-5 flex flex-col justify-between min-w-0">
        <div>
          <Link to={`/magazine/articles/${thread.id}`}>
            <h3 className="text-white font-black uppercase text-sm md:text-base tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {thread.title}
            </h3>
          </Link>
          {thread.subtitle && (
            <p className="text-text-muted text-xs mt-1.5 line-clamp-2 leading-relaxed">
              {thread.subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-text-muted text-xs uppercase tracking-widest">{dateStr}</span>

          {canEdit && (
            <div className="flex gap-1">
              <button
                onClick={() => onEdit?.(thread)}
                disabled={loading || !onEdit}
                className="text-text-muted hover:text-primary transition-colors p-0.5 disabled:opacity-40"
                title="Edit article"
              >
                {loading ? <span className="text-[10px]">...</span> : <Pencil className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => onDelete?.(thread)}
                disabled={loading}
                className="text-text-muted hover:text-red-400 transition-colors p-0.5 disabled:opacity-40"
                title="Delete article"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
