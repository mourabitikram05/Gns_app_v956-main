import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '../api/modules'
import type { AuthResponse } from '../api/types'
import { clearSession, TOKEN_KEY, USER_KEY } from '../api/http'

interface AuthContextValue {
  user: AuthResponse | null
  login: (email: string, password: string) => Promise<AuthResponse>
  logout: () => void
  isRh: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    } catch {
      return null
    }
  })

  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('gns:unauthorized', onUnauthorized)
    return () => window.removeEventListener('gns:unauthorized', onUnauthorized)
  }, [])

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    if (!data.token) {
      throw new Error(data.statut === 'EN_ATTENTE'
        ? 'Votre compte est en attente de validation par le service RH.'
        : 'Impossible de se connecter pour le moment.')
    }
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data))
    setUser(data)
    return data
  }

  const logout = () => {
    clearSession()
    setUser(null)
  }

  const isRh = user?.role === 'RESPONSABLE_RH' || user?.role === 'ADMIN'

  return (
    <AuthContext.Provider value={{ user, login, logout, isRh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
