import { createContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '../api/auth'
import type { AuthUser, JwtPayload, Role } from '../types/auth'

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  mustChangePassword: boolean
  login: (email: string, password: string) => Promise<AuthUser | null>
  logout: () => void
  register: (name: string, email: string, password: string) => Promise<unknown>
  changePassword: (old_pwd: string, new_pwd: string) => Promise<AuthUser | null>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    const payload = parts[1]
    if (!payload) return null
    return JSON.parse(atob(payload)) as JwtPayload
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('access_token'),
  )
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (token) {
      const payload = decodeToken(token)
      if (payload && payload.exp * 1000 > Date.now()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(payload as AuthUser)
        // Hydrate role from server (JWT intentionally omits role).
        authApi
          .getMe()
          .then(me =>
            setUser(prev => ({
              ...(prev ?? {}),
              ...me,
              role: (me.auth_role as Role | undefined),
            })),
          )
          .catch(() => {})
      } else {
        localStorage.removeItem('access_token')
        setToken(null)
      }
    }
    setLoading(false)
  }, [token])

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser | null> => {
      const data = await authApi.login(email, password)
      localStorage.setItem('access_token', data.access_token)
      setToken(data.access_token)
      const payload = decodeToken(data.access_token)
      let merged: AuthUser | null = payload as AuthUser | null
      try {
        const me = await authApi.getMe()
        merged = { ...(payload ?? {}), ...me, role: me.auth_role }
      } catch {
        // ignore — fall back to token-only payload
      }
      setUser(merged)
      return merged
    },
    [],
  )

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    setToken(null)
    setUser(null)
  }, [])

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      return await authApi.register(name, email, password)
    },
    [],
  )

  const changePassword = useCallback(
    async (old_pwd: string, new_pwd: string): Promise<AuthUser | null> => {
      const data = await authApi.changePassword(old_pwd, new_pwd)
      localStorage.setItem('access_token', data.access_token)
      setToken(data.access_token)
      const payload = decodeToken(data.access_token)
      let merged: AuthUser | null = payload as AuthUser | null
      try {
        const me = await authApi.getMe()
        merged = { ...(payload ?? {}), ...me, role: me.auth_role }
      } catch {
        // ignore
      }
      setUser(merged)
      return merged
    },
    [],
  )

  const isAuthenticated = !!token
  const mustChangePassword = user?.must_change_pwd === true

  const value: AuthContextValue = {
    user,
    token,
    login,
    logout,
    register,
    changePassword,
    isAuthenticated,
    mustChangePassword,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
