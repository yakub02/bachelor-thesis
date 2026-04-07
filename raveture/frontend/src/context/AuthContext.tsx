import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { ravetureApi, type UserProfile, type RegisterData } from '@/services/ravetureApi'
import { ticketingApi } from '@/services'

// API key for ticketing service - loaded from environment variable
const TICKETING_API_KEY = import.meta.env.VITE_TICKETING_API_KEY

if (!TICKETING_API_KEY) {
  console.error('VITE_TICKETING_API_KEY is not set. Ticketing features will not work.')
}

interface AuthContextValue {
  user: UserProfile | null
  userId: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  // Setup ticketing API auth when user changes
  const setupTicketingAuth = useCallback((userId: string | null) => {
    if (userId) {
      ticketingApi.setAuth({
        type: 'apiKey',
        token: TICKETING_API_KEY,
        userId: userId,
      })
    } else {
      ticketingApi.setAuth(null)
    }
  }, [])

  // Refresh user data from backend
  const refreshUser = useCallback(async () => {
    if (!ravetureApi.isAuthenticated()) {
      setUser(null)
      setupTicketingAuth(null)
      return
    }

    try {
      const { user: userData } = await ravetureApi.getCurrentUser()
      setUser(userData)
      setupTicketingAuth(userData.id)
    } catch {
      // Token invalid, clear auth
      ravetureApi.setTokens(null)
      setUser(null)
      setupTicketingAuth(null)
    }
  }, [setupTicketingAuth])

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      await refreshUser()
      setIsLoading(false)
      setIsInitialized(true)
    }
    initAuth()
  }, [refreshUser])

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { user: userData } = await ravetureApi.login({ email, password })
      setUser(userData)
      setupTicketingAuth(userData.id)
    } finally {
      setIsLoading(false)
    }
  }, [setupTicketingAuth])

  // Register function
  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true)
    try {
      const { user: userData } = await ravetureApi.register(data)
      setUser(userData)
      setupTicketingAuth(userData.id)
    } finally {
      setIsLoading(false)
    }
  }, [setupTicketingAuth])

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await ravetureApi.logout()
    } finally {
      setUser(null)
      setupTicketingAuth(null)
      setIsLoading(false)
    }
  }, [setupTicketingAuth])

  const value: AuthContextValue = {
    user,
    userId: user?.id || null,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  }

  // Don't render children until auth is initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="text-primary font-mono text-sm animate-pulse">
          LOADING...
        </div>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
