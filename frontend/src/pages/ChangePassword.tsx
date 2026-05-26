import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { changePasswordSchema, firstError } from '../validation'

export default function ChangePassword() {
  const { changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const result = changePasswordSchema.safeParse({ oldPwd, newPwd, confirmPwd })
    if (!result.success) {
      setError(firstError(result.error))
      return
    }
    setSaving(true)
    try {
      await changePassword(oldPwd, newPwd)
      setOldPwd(''); setNewPwd(''); setConfirmPwd('')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="login-page">
      <div className="glass-card login-card">
        <h1>Change Password</h1>
        <p className="subtitle">Update your account password.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="password" placeholder="Current password" value={oldPwd}
            onChange={e => setOldPwd(e.target.value)} required autoFocus disabled={saving} />
          <input type="password" placeholder="New password (8+ chars, upper, digit, special)" value={newPwd}
            onChange={e => setNewPwd(e.target.value)} required disabled={saving} />
          <input type="password" placeholder="Confirm new password" value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)} required disabled={saving} />
          <button type="submit" disabled={saving}>
            {saving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
        <div className="auth-footer">
          <button className="logout-link" onClick={() => { logout(); navigate('/login', { replace: true }) }}>
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
