import { useState, useEffect } from 'react'
import { createAuthUser } from '../api/auth'

function emptyForm() {
  return { employee_id: '', email: '', password: '', auth_role: 'employee' }
}

export default function UserFormModal({ open, employees, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(emptyForm())
      setError('')
      setSaving(false)
    }
  }, [open])

  function setField(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function handleEmployeeChange(e) {
    const id = e.target.value
    const emp = employees.find(emp => String(emp.id) === id)
    setForm(prev => ({
      ...prev,
      employee_id: id,
      email: emp ? emp.email : '',
    }))
  }

  function handleClose() {
    setError('')
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.employee_id || !form.email || !form.password) {
      setError('Employee, email, and password are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createAuthUser(Number(form.employee_id), form.email, form.password, form.auth_role)
      onSaved()
      handleClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-dialog glass-card glass-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Auth User</h2>
          <button className="modal-close" onClick={handleClose} title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {error && (
          <div className="modal-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="form-field">
              <label>Employee <span className="required">*</span></label>
              <select value={form.employee_id} onChange={handleEmployeeChange} required>
                <option value="">Select employee…</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} (#{emp.id})</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Email <span className="required">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={setField('email')}
                placeholder="email@company.com"
                required
              />
            </div>
            <div className="form-field">
              <label>Password <span className="required">*</span></label>
              <input
                type="password"
                value={form.password}
                onChange={setField('password')}
                placeholder="Min 8 chars, 1 upper, 1 digit, 1 special"
                required
              />
            </div>
            <div className="form-field">
              <label>Role <span className="required">*</span></label>
              <select value={form.auth_role} onChange={setField('auth_role')} required>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
