import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login, mustChangePassword, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const from = location.state?.from?.pathname || '/dashboard'

  if (isAuthenticated && !mustChangePassword) {
    navigate(from, { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = await login(email, password)
      setPassword('')
      if (payload?.must_change_pwd) {
        navigate('/change-password', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      if (err.status === 429) {
        setError('Too many login attempts. Try again in 1 minute.')
      } else if (err.status === 401) {
        setError('Invalid email or password.')
      } else {
        setError(err.message || 'Login failed. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>EMS Login</h1>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required autoFocus
            autoComplete="email" disabled={saving}
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required
            autoComplete="current-password" disabled={saving}
          />
          <button type="submit" disabled={saving}>
            {saving ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
