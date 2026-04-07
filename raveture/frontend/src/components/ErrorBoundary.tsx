/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs errors, and displays a fallback UI.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { GlowButton, GlowCard } from '@/components/design'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so next render shows fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console (in production, send to error tracking service)
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-bg-dark flex items-center justify-center p-6">
          <GlowCard className="max-w-lg w-full p-8 text-center">
            {/* Error icon */}
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-red-500/20 border border-red-500/50">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-white mb-2">
              Something went wrong
            </h1>

            {/* Description */}
            <p className="text-text-muted mb-6 font-mono text-sm">
              An unexpected error occurred. This has been logged and we'll look into it.
            </p>

            {/* Error details (collapsible in dev mode) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mb-6 p-4 bg-graphite/50 border border-border-grey">
                <summary className="text-sm text-primary font-mono cursor-pointer">
                  Error Details (Dev Mode)
                </summary>
                <pre className="mt-2 text-xs text-red-400 overflow-auto max-h-40">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <GlowButton variant="outline" onClick={this.handleReset}>
                Try Again
              </GlowButton>
              <GlowButton onClick={this.handleReload}>
                Reload Page
              </GlowButton>
            </div>
          </GlowCard>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
