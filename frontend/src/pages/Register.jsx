import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await register(name, email, password)
      setName(''); setEmail(''); setPassword('')
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      if (err.status === 400) {
        setError(err.message || 'Email already registered.')
      } else if (err.status === 422) {
        setError('Please check your inputs. Password must be 8+ chars with upper, digit, and special character.')
      } else {
        setError(err.message || 'Registration failed.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="glass-card login-card">
          <h1>Check Your Email</h1>
          <p>Registration submitted. An admin will activate your account.</p>
          <p className="subtitle">Redirecting to login…</p>
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
