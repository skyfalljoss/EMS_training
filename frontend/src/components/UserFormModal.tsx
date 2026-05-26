import { useState, useEffect } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useCreateAuthUser } from '../hooks/useAuthQuery'
import type { Role } from '../types/auth'
import type { EmployeeView } from '../types/employee'
import { authUserSchema, firstError } from '../validation'

interface FormState {
  employee_id: string
  email: string
  password: string
  auth_role: Role
}

function emptyForm(): FormState {
  return { employee_id: '', email: '', password: '', auth_role: 'employee' }
}

interface Props {
  open: boolean
  employees: EmployeeView[]
  onClose: () => void
  onSaved: () => void
}

export default function UserFormModal({ open, employees, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm())
  const [validationError, setValidationError] = useState('')
  const { mutate: createAuthUser, isPending: saving, error: apiError, reset } = useCreateAuthUser()

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(emptyForm())
      setValidationError('')
      reset()
    }
  }, [open, reset])

  function setField<K extends keyof FormState>(field: K) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value as FormState[K] }))
  }

  function handleEmployeeChange(e: ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    const emp = employees.find(emp => String(emp.id) === id)
    setForm(prev => ({
      ...prev,
      employee_id: id,
      email: emp ? emp.email : '',
    }))
  }

  function handleClose() {
    setValidationError('')
    reset()
    onClose()
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setValidationError('')
    const result = authUserSchema.safeParse(form)
    if (!result.success) {
      setValidationError(firstError(result.error))
      return
    }
    createAuthUser(
      {
        employeeId: Number(form.employee_id),
        email: form.email,
        password: form.password,
        role: form.auth_role
      },
      {
        onSuccess: () => {
          onSaved()
          handleClose()
        }
      }
    )
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

        {(validationError || apiError) && (
          <div className="modal-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            {validationError || (apiError instanceof Error ? apiError.message : String(apiError))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body" autoComplete="off">
          <div className="form-grid">
            <div className="form-field">
              <label>Employee <span className="required">*</span></label>
              <select value={form.employee_id} onChange={handleEmployeeChange} required>
                <option value="">Select employee…</option>
                {employees.map(emp => (
                  <option key={emp.id} value={String(emp.id)}>{emp.name} (#{emp.id})</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Email <span className="required">*</span></label>
              <input
                type="email"
                autoComplete="off"
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
                autoComplete="new-password"
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
