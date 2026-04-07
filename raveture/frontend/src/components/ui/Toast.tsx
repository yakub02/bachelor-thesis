/**
 * Toast Notification System
 *
 * Provides toast notifications for success, error, warning, and info messages.
 * Features:
 * - Context-based toast management
 * - Auto-dismiss with configurable duration
 * - Multiple toasts stacked
 * - Animations with Tailwind
 * - Click to dismiss
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { cn } from '@/utils'

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info'

// Toast item interface
interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

// Context interface
interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

// Create context
const ToastContext = createContext<ToastContextValue | null>(null)

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

// Generate unique ID
const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Provider component
interface ToastProviderProps {
  children: React.ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId()
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Convenience methods
  const success = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'success', title, message, duration: 4000 })
    },
    [addToast]
  )

  const error = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'error', title, message, duration: 6000 })
    },
    [addToast]
  )

  const warning = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'warning', title, message, duration: 5000 })
    },
    [addToast]
  )

  const info = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'info', title, message, duration: 4000 })
    },
    [addToast]
  )

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

// Container for rendering toasts
function ToastContainer() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

// Individual toast item
function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast()
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  // Enter animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  // Auto dismiss
  useEffect(() => {
    const duration = toast.duration || 4000
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => removeToast(toast.id), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, removeToast])

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(() => removeToast(toast.id), 300)
  }

  // Styles based on type
  const typeStyles = {
    success: {
      bg: 'bg-green-500/20',
      border: 'border-green-500/50',
      icon: (
        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/50',
      icon: (
        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    warning: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/50',
      icon: (
        <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/50',
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  }

  const styles = typeStyles[toast.type]

  return (
    <div
      onClick={handleDismiss}
      className={cn(
        'pointer-events-auto cursor-pointer',
        'min-w-[300px] max-w-[400px] p-4',
        'backdrop-blur-md border',
        styles.bg,
        styles.border,
        'shadow-lg',
        'transition-all duration-300 ease-out',
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{styles.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-bold text-white text-sm">{toast.title}</p>
          {toast.message && (
            <p className="mt-1 text-text-muted text-xs font-mono">{toast.message}</p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDismiss()
          }}
          className="flex-shrink-0 text-text-muted hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export { ToastContext }
export type { Toast, ToastType }
