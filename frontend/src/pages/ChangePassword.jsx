import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ChangePassword() {
  const { changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPwd !== confirmPwd) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    try {
      await changePassword(oldPwd, newPwd)
      setOldPwd(''); setNewPwd(''); setConfirmPwd('')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Password change failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="login-page">
      <div className="glass-card login-card">
        <h1>Change Password</h1>
        <p className="subtitle">You must change your password before continuing.</p>
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
