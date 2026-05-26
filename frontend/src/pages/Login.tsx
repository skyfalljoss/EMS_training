import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isApiError } from '../types/api'
import { loginSchema, firstError } from '../validation'

interface LocationState {
  from?: { pathname?: string }
}

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const state = location.state as LocationState | null
  const from = state?.from?.pathname ?? '/dashboard'

  
  if (isAuthenticated) {
    navigate(from, { replace: true })
    return null
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      setError(firstError(result.error))
      return
    }
    setSaving(true)
    try {
      await login(email, password)
      setPassword('')
      navigate(from, { replace: true })
    } catch (err) {
      if (isApiError(err) && err.status === 429) {
        setError('Too many login attempts. Try again in 1 minute.')
      } else if (isApiError(err) && err.status === 401) {
        setError('Invalid email or password.')
      } else {
        setError(err instanceof Error ? err.message : 'Login failed.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="login-page">
      <div className="glass-card login-card">
        <h1>EMS Login</h1>
        <p className="subtitle">Sign in to your account</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required autoFocus
            autoComplete="email" disabled={saving} />
          <input type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required
            autoComplete="current-password" disabled={saving} />
          <button type="submit" disabled={saving}>
            {saving ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  )
}
