import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useCreateEmployee, useUpdateEmployee } from '../hooks/useEmployeesQuery'
import { useDepartmentsList } from '../hooks/useDepartmentsQuery'
import { EMPLOYEE_STATUSES, EMPLOYEE_STATUS_LABELS } from '../constants/employeeStatus'
import type { EmployeeStatus, EmployeeView } from '../types/employee'

interface FormState {
  name: string
  email: string
  role: string
  department_id: string
  position: string
  status: EmployeeStatus
  phone: string
  location: string
  manager: string
  salary: string
  rating: string
  start_date: string
  date_of_birth: string
  national_id: string
}

function fromEmployee(e: EmployeeView): FormState {
  return {
    name: e.name,
    email: e.email,
    role: e.role,
    department_id: String(e.department_id ?? ''),
    position: e.position ?? '',
    status: e.status,
    phone: e.phone !== '—' ? e.phone : '',
    location: e.location !== '—' ? e.location : '',
    manager: e.manager !== '—' ? e.manager : '',
    salary: e.salary !== '—' ? String(e.salary).replace(/[$,]/g, '') : '',
    rating: e.rating !== '—' ? String(e.rating).replace('/5.0', '') : '',
    start_date: e.start !== '—' ? e.start : '',
    date_of_birth: e.date_of_birth !== '—' ? e.date_of_birth : '',
    national_id: e.national_id !== '—' ? e.national_id : '',
  }
}

function emptyForm(): FormState {
  return {
    name: '', email: '', role: '', department_id: '', position: '',
    status: 'active', phone: '', location: '', manager: '',
    salary: '', rating: '', start_date: '', date_of_birth: '', national_id: '',
  }
}

interface Props {
  open: boolean
  employee?: EmployeeView | null
  onClose: () => void
}

export default function EmployeeFormModal({ open, employee, onClose }: Props) {
  const isEdit = !!employee
  const { data: departments = [] } = useDepartmentsList()
  const createMutation = useCreateEmployee()
  const updateMutation = useUpdateEmployee()
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState('')

  const [prevEmployee, setPrevEmployee] = useState<EmployeeView | null | undefined>(employee)
  const [prevOpen, setPrevOpen] = useState(open)

  if (employee !== prevEmployee || open !== prevOpen) {
    setPrevEmployee(employee)
    setPrevOpen(open)
    setForm(employee ? fromEmployee(employee) : emptyForm())
    setError('')
  }

  function setField<K extends keyof FormState>(field: K) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value as FormState[K] }))
  }

  function handleClose() {
    setError('')
    onClose()
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.name || !form.email || !form.role || !form.department_id) {
      setError('Name, email, role, and department are required.')
      return
    }
    setError('')
    try {
      const payload: Record<string, unknown> = {
        ...form,
        department_id: Number(form.department_id),
        salary: form.salary ? Number(form.salary) : null,
        rating: form.rating ? Number(form.rating) : null,
        start_date: form.start_date || null,
        date_of_birth: form.date_of_birth || null,
      }
      delete payload.department
      const OPTIONAL_STRINGS = ['position', 'phone', 'location', 'manager', 'national_id']
      for (const k of OPTIONAL_STRINGS) {
        if (payload[k] === '' || payload[k] == null) delete payload[k]
      }

      if (isEdit && employee) {
        await updateMutation.mutateAsync({ id: employee.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  if (!open) return null

  const saving = createMutation.isPending || updateMutation.isPending

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
                {EMPLOYEE_STATUSES.map(s => (
                  <option key={s} value={s}>{EMPLOYEE_STATUS_LABELS[s]}</option>
                ))}
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
