import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiClient } from '../lib/api-client'
import {
  applyAuthHeader,
  clearSession,
  getAccessToken,
  setSession,
  subscribeSession,
} from '../lib/auth-session'

interface AuthContextType {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Thin consumer of the session module: all storage/header/refresh logic
// lives in lib/auth-session. This component only mirrors isAuthenticated
// state (subscribed, so interceptor-driven refresh/clear stays in sync)
// and performs the login/logout calls.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAccessToken())

  useEffect(() => {
    applyAuthHeader(apiClient)
    return subscribeSession(() => {
      setToken(getAccessToken())
      applyAuthHeader(apiClient)
    })
  }, [])

  const login = async (username: string, password: string) => {
    const response = await apiClient.post('/auth/login/', { username, password })
    const { access, refresh } = response.data
    setSession(access, refresh)
    applyAuthHeader(apiClient)
    setToken(access)
  }

  const logout = () => {
    clearSession()
    applyAuthHeader(apiClient)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
