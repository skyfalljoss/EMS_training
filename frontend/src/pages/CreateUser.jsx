import { useState, useEffect } from 'react'
import { createAuthUser } from '../api/auth'
import { listEmployees } from '../api/employees'
import { useAuth } from '../hooks/useAuth'

export default function CreateUser() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('employee')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listEmployees().then(data => setEmployees(data)).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await createAuthUser(Number(employeeId), email, password, role)
      setEmployeeId(''); setEmail(''); setPassword('')
      setSuccess(`User created successfully (${role})`)
    } catch (err) {
      setError(err.message || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  if (user?.role !== 'admin') {
    return <div className="screens-content"><p>Access denied. Admin only.</p></div>
  }

  return (
    <div className="screens-content">
      <h2>Create Auth User</h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
        <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} required>
          <option value="">Select employee…</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name} (ID: {emp.id})</option>
          ))}
        </select>
        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)} required />
        <select value={role} onChange={e => setRole(e.target.value)} required>
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create User'}
        </button>
      </form>
    </div>
  )
}
