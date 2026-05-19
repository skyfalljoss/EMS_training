import { createContext, useState, useEffect, useCallback } from 'react'
import * as authApi from '../api/auth'

export const AuthContext = createContext(null)

function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      const payload = decodeToken(token)
      if (payload && payload.exp * 1000 > Date.now()) {
        setUser(payload)
        // Hydrate role from server (JWT intentionally omits role).
        authApi.getMe()
          .then(me => setUser(prev => ({ ...prev, ...me, role: me.auth_role })))
          .catch(() => {})
      } else {
        localStorage.removeItem('access_token')
        setToken(null)
      }
    }
    setLoading(false)
  }, [token])

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password)
    localStorage.setItem('access_token', data.access_token)
    setToken(data.access_token)
    const payload = decodeToken(data.access_token)
    let merged = payload
    try {
      const me = await authApi.getMe()
      merged = { ...payload, ...me, role: me.auth_role }
    } catch {
      // ignore — fall back to token-only payload
    }
    setUser(merged)
    return merged
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    setToken(null)
    setUser(null)
  }, [])

  const register = useCallback(async (name, email, password) => {
    return await authApi.register(name, email, password)
  }, [])

  const changePassword = useCallback(async (old_pwd, new_pwd) => {
    const data = await authApi.changePassword(old_pwd, new_pwd)
    localStorage.setItem('access_token', data.access_token)
    setToken(data.access_token)
    const payload = decodeToken(data.access_token)
    let merged = payload
    try {
      const me = await authApi.getMe()
      merged = { ...payload, ...me, role: me.auth_role }
    } catch {
      // ignore
    }
    setUser(merged)
    return merged
  }, [])

  const isAuthenticated = !!token
  const mustChangePassword = user?.must_change_pwd === true

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, changePassword, isAuthenticated, mustChangePassword, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
