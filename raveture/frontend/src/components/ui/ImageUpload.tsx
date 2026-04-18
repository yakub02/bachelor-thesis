/**
 * ImageUpload Component
 *
 * Drag & drop image upload with preview, progress, and validation.
 * Features:
 * - Drag and drop support
 * - File browser fallback
 * - Image preview
 * - Upload progress indicator
 * - Client-side validation (size, type)
 * - Integration with backend upload API
 */

import { useState, useRef, useCallback } from 'react'
import { ravetureApi } from '@/services/ravetureApi'
import { cn } from '@/utils'

// Maximum file size (10 MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed MIME types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// Allowed extensions for display
const ALLOWED_EXTENSIONS = ['JPG', 'PNG', 'GIF', 'WEBP']

interface ImageUploadProps {
  value: string | null
  onChange: (url: string | null) => void
  category?: 'events' | 'venues' | 'profiles' | 'artists'
  label?: string
  className?: string
  aspectRatio?: 'square' | 'video' | 'banner' | 'flyer'
}

interface UploadState {
  status: 'idle' | 'dragging' | 'uploading' | 'success' | 'error'
  progress: number
  error: string | null
}

export function ImageUpload({
  value,
  onChange,
  category = 'images',
  label = 'Cover Image',
  className,
  aspectRatio = 'video',
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    error: null,
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(value)

  // Aspect ratio classes
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    banner: 'aspect-[3/1]',
    flyer: 'aspect-[3/4]',
  }

  // Validate file
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)} MB`
    }
    return null
  }

  // Upload file
  const uploadFile = async (file: File) => {
    const error = validateFile(file)
    if (error) {
      setUploadState({ status: 'error', progress: 0, error })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    setUploadState({ status: 'uploading', progress: 0, error: null })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)

      // Get auth token
      const token = ravetureApi.getAccessToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      // Upload with progress tracking
      const xhr = new XMLHttpRequest()

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadState((prev) => ({ ...prev, progress }))
        }
      }

      const response = await new Promise<{ url: string }>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText))
            } catch {
              reject(new Error('Invalid response'))
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText)
              reject(new Error(error.message || error.error || 'Upload failed'))
            } catch {
              reject(new Error('Upload failed'))
            }
          }
        }
        xhr.onerror = () => reject(new Error('Network error'))

        const apiUrl = import.meta.env.VITE_RAVETURE_API_URL || 'http://localhost:5000'
        xhr.open('POST', `${apiUrl}/api/v1/upload/image`)
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.send(formData)
      })

      // Build full URL
      const apiUrl = import.meta.env.VITE_RAVETURE_API_URL || 'http://localhost:5000'
      const fullUrl = response.url.startsWith('http')
        ? response.url
        : `${apiUrl}${response.url}`

      setUploadState({ status: 'success', progress: 100, error: null })
      setPreviewUrl(fullUrl)
      onChange(fullUrl)
    } catch (err: unknown) {
      const error = err as Error
      setUploadState({
        status: 'error',
        progress: 0,
        error: error.message || 'Upload failed',
      })
      setPreviewUrl(null)
    }
  }

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setUploadState((prev) => ({ ...prev, status: 'dragging' }))
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setUploadState((prev) => ({
      ...prev,
      status: prev.status === 'dragging' ? 'idle' : prev.status,
    }))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setUploadState((prev) => ({ ...prev, status: 'idle' }))

    const files = e.dataTransfer.files
    handleFileSelect(files)
  }, [])

  // Clear image
  const handleClear = () => {
    setPreviewUrl(null)
    setUploadState({ status: 'idle', progress: 0, error: null })
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isDragging = uploadState.status === 'dragging'
  const isUploading = uploadState.status === 'uploading'
  const hasPreview = previewUrl || value

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-xs font-mono uppercase text-text-muted tracking-wider">
          {label}
        </label>
      )}

      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed cursor-pointer transition-all duration-300',
          aspectClasses[aspectRatio],
          isDragging
            ? 'border-primary bg-primary/10'
            : hasPreview
            ? 'border-border-grey'
            : 'border-border-grey hover:border-primary/50',
          isUploading && 'pointer-events-none'
        )}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        {/* Preview */}
        {hasPreview && !isUploading && (
          <div className="absolute inset-0">
            <img
              src={previewUrl || value || ''}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => setPreviewUrl(null)}
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white font-mono text-sm">
                Click or drop to replace
              </span>
            </div>
            {/* Remove button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="absolute top-2 right-2 w-8 h-8 bg-black/70 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
            >
              &times;
            </button>
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-dark/80">
            <div className="w-32 h-1 bg-border-grey overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
            <span className="mt-2 text-xs font-mono text-text-muted">
              Uploading... {uploadState.progress}%
            </span>
          </div>
        )}

        {/* Empty state */}
        {!hasPreview && !isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <div
              className={cn(
                'w-12 h-12 mb-4 flex items-center justify-center',
                isDragging ? 'text-primary' : 'text-text-muted'
              )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p
              className={cn(
                'text-sm font-mono',
                isDragging ? 'text-primary' : 'text-text-muted'
              )}
            >
              {isDragging ? 'Drop image here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {ALLOWED_EXTENSIONS.join(', ')} &bull; Max {MAX_FILE_SIZE / (1024 * 1024)}MB
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {uploadState.status === 'error' && uploadState.error && (
        <div className="p-3 border border-red-500/50 bg-red-500/10 text-red-400 text-sm font-mono">
          {uploadState.error}
        </div>
      )}
    </div>
  )
}

export default ImageUpload
