import { useState, useEffect } from 'react'
import { createEmployee, updateEmployee } from '../services/employeeService'
import { listDepartments } from '../services/departmentService'

const STATUSES = ['active', 'remote', 'on-leave', 'terminated']

function fromEmployee(e, deptList) {
  const deptId = e.department_id || (deptList.find(d => d.name === e.dept)?.id) || ''
  return {
    name: e.name,
    email: e.email,
    role: e.role,
    department_id: deptId,
    position: e.position || '',
    status: e.status,
    phone: e.phone !== '—' ? e.phone : '',
    location: e.location !== '—' ? e.location : '',
    manager: e.manager !== '—' ? e.manager : '',
    salary: e.salary !== '—' ? e.salary.replace(/[$,]/g, '') : '',
    rating: e.rating !== '—' ? e.rating.replace('/5.0', '') : '',
    start_date: e.start !== '—' ? e.start : '',
    date_of_birth: e.date_of_birth !== '—' ? e.date_of_birth : '',
    national_id: e.national_id !== '—' ? e.national_id : '',
  }
}

function emptyForm() {
  return {
    name: '', email: '', role: '', department_id: '', position: '',
    status: 'active', phone: '', location: '', manager: '',
    salary: '', rating: '', start_date: '', date_of_birth: '', national_id: '',
  }
}

export default function EmployeeFormModal({ open, employee, onClose, onSaved }) {
  const isEdit = !!employee
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let active = true
    listDepartments().then(data => {
      if (!active) return
      setDepartments(data)
      if (employee) {
        setForm(fromEmployee(employee, data))
      }
    })
    return () => { active = false }
  }, [open, employee])

  function resetForm() {
    setForm(employee && departments.length ? fromEmployee(employee, departments) : emptyForm())
    setError('')
    setSaving(false)
  }

  useEffect(resetForm, [open])

  function setField(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function handleClose() {
    setError('')
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.email || !form.role || !form.department_id) {
      setError('Name, email, role, and department are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        department_id: Number(form.department_id),
        salary: form.salary ? Number(form.salary) : null,
        rating: form.rating ? Number(form.rating) : null,
        start_date: form.start_date || null,
        date_of_birth: form.date_of_birth || null,
      }
      delete payload.department
      if (isEdit) {
        await updateEmployee(employee.id, payload)
      } else {
        await createEmployee(payload)
      }
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
      <div className="modal-dialog modal-lg glass-card glass-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Employee' : 'Add Employee'}</h2>
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
              <label>Name <span className="required">*</span></label>
              <input value={form.name} onChange={setField('name')} placeholder="Full name" />
            </div>
            <div className="form-field">
              <label>Email <span className="required">*</span></label>
              <input value={form.email} onChange={setField('email')} placeholder="email@company.com" type="email" />
            </div>
            <div className="form-field">
              <label>Role <span className="required">*</span></label>
              <input value={form.role} onChange={setField('role')} placeholder="Job role" />
            </div>
            <div className="form-field">
              <label>Department <span className="required">*</span></label>
              <select value={form.department_id} onChange={setField('department_id')}>
                <option value="">Select...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Position</label>
              <input value={form.position} onChange={setField('position')} placeholder="Job title" />
            </div>
            <div className="form-field">
              <label>Status</label>
              <select value={form.status} onChange={setField('status')}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input value={form.phone} onChange={setField('phone')} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="form-field">
              <label>Location</label>
              <input value={form.location} onChange={setField('location')} placeholder="City, State" />
            </div>
            <div className="form-field">
              <label>Manager</label>
              <input value={form.manager} onChange={setField('manager')} placeholder="Manager name" />
            </div>
            <div className="form-field">
              <label>Salary</label>
              <input value={form.salary} onChange={setField('salary')} placeholder="120000" type="number" min="0" />
            </div>
            <div className="form-field">
              <label>Rating (0-5)</label>
              <input value={form.rating} onChange={setField('rating')} placeholder="4.5" type="number" min="0" max="5" step="0.1" />
            </div>
            <div className="form-field">
              <label>Start Date</label>
              <input value={form.start_date} onChange={setField('start_date')} type="date" />
            </div>
            <div className="form-field">
              <label>Date of Birth</label>
              <input value={form.date_of_birth} onChange={setField('date_of_birth')} type="date" />
            </div>
            <div className="form-field">
              <label>National ID</label>
              <input value={form.national_id} onChange={setField('national_id')} placeholder="XXX-XX-0000" />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}