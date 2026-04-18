import { Music2, Play, Heart, Download } from 'lucide-react'

interface DJSet {
  id: string
  title: string
  description: string | null
  file_url: string
  thumbnail_url: string | null
  duration: number | null
  genres: string[]
  play_count: number
  like_count: number
  is_downloadable: boolean
  uploader: { id: string; username: string; avatar_url: string | null } | null
  event: { id: string; name: string; slug: string } | null
  created_at: string
  recorded_at: string | null
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function DJSetCard({ set }: { set: DJSet }) {
  return (
    <div className="bg-surface border border-border hover:border-primary transition-colors duration-200 group">
      <div className="relative w-full h-40 bg-bg-dark flex items-center justify-center overflow-hidden">
        {set.thumbnail_url ? (
          <img src={set.thumbnail_url} alt={set.title} className="w-full h-full object-cover" />
        ) : (
          <Music2 className="text-primary/30 w-16 h-16" />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="text-white w-12 h-12" />
        </div>
        {set.duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 font-mono">
            {formatDuration(set.duration)}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-white font-black uppercase text-sm truncate">{set.title}</h3>
        <p className="text-text-muted text-xs mt-1">
          {set.uploader?.username || 'Unknown'}
          {set.event && ` · ${set.event.name}`}
        </p>
        {set.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {set.genres.slice(0, 3).map(g => (
              <span key={g} className="text-primary text-xs border border-primary/30 px-1.5 py-0.5 uppercase tracking-wider">
                {g}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 text-text-muted text-xs">
          <span className="flex items-center gap-1">
            <Play className="w-3 h-3" /> {set.play_count.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" /> {set.like_count.toLocaleString()}
          </span>
          {set.is_downloadable && (
            <a
              href={set.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
              onClick={e => e.stopPropagation()}
            >
              <Download className="w-3 h-3" /> DL
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
