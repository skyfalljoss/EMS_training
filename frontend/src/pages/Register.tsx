import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isApiError } from '../types/api'
import { registerSchema, firstError } from '../validation'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const result = registerSchema.safeParse({ name, email, password, confirmPassword })
    if (!result.success) {
      setError(firstError(result.error))
      return
    }
    setSaving(true)
    try {
      await register(name, email, password)
      setName(''); setEmail(''); setPassword(''); setConfirmPassword('')
      setSuccess(true)
      setTimeout(() => navigate('/login'), 9000)
    } catch (err) {
      if (isApiError(err) && err.status === 400) {
        setError(err.message || 'Email already registered.')
      } else if (isApiError(err) && err.status === 422) {
        setError('Please check your inputs. Password must be 8+ chars with upper, digit, and special character.')
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="glass-card login-card">
          <p style={{ textAlign: 'center', fontSize: '1.3rem' }}>Registration submitted. An admin will activate your account.</p>
          <p className="subtitle" style={{ textAlign: 'center' }}>Redirecting to login…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="glass-card login-card">
        <h1>Create Account</h1>
        <p className="subtitle">Register for an EMS account</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Full name" value={name}
            onChange={e => setName(e.target.value)} required autoFocus
            autoComplete="name" disabled={saving} />
          <input type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
            autoComplete="email" disabled={saving} />

          <input type="password" placeholder="Password (8+ chars, upper, digit, special)" value={password}
            onChange={e => setPassword(e.target.value)} required
            autoComplete="new-password" disabled={saving} />

          <input type="password" placeholder="Confirm password" value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)} required
            autoComplete="new-password" disabled={saving} />


          <button type="submit" disabled={saving}>
            {saving ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
