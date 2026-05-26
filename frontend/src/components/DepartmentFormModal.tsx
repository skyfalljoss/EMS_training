import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useCreateDepartment, useUpdateDepartment } from '../hooks/useDepartmentsQuery'
import type {
  DepartmentPayload,
  DepartmentStatus,
  DepartmentView,
} from '../types/department'
import { departmentSchema, firstError } from '../validation'

interface FormState {
  name: string
  code: string
  description: string
  head: string
  status: DepartmentStatus
}

function fromDepartment(d: DepartmentView): FormState {
  return {
    name: d.name,
    code: d.code,
    description: d.description ?? '',
    head: d.head ?? '',
    status: d.status,
  }
}

function emptyForm(): FormState {
  return { name: '', code: '', description: '', head: '', status: 'active' }
}

const STATUSES: readonly DepartmentStatus[] = ['active', 'inactive', 'archived']

interface Props {
  open: boolean
  department?: DepartmentView | null
  onClose: () => void
}

export default function DepartmentFormModal({ open, department, onClose }: Props) {
  const isEdit = !!department
  const createMutation = useCreateDepartment()
  const updateMutation = useUpdateDepartment()
  const [form, setForm] = useState<FormState>(
    isEdit && department ? fromDepartment(department) : emptyForm(),
  )
  const [error, setError] = useState('')

  function setField<K extends keyof FormState>(field: K) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value as FormState[K] }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const result = departmentSchema.safeParse(form)
    if (!result.success) {
      setError(firstError(result.error))
      return
    }
    try {
      const payload: Partial<DepartmentPayload> = {
        ...form,
        code: form.code.toUpperCase(),
        description: form.description || undefined,
        head: form.head || undefined,
      }
      if (isEdit && department) {
        await updateMutation.mutateAsync({ id: department.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function handleClose() {
    setError('')
    onClose()
  }

  if (!open) return null

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-dialog glass-card glass-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Department' : 'Add Department'}</h2>
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
              <input value={form.name} onChange={setField('name')} placeholder="Department name" />
            </div>
            <div className="form-field">
              <label>Code <span className="required">*</span></label>
              <input value={form.code} onChange={setField('code')} placeholder="e.g. IT" className="form-code-input" />
            </div>
            <div className="form-field form-field-span-2">
              <label>Description</label>
              <textarea value={form.description} onChange={setField('description')} placeholder="Optional description" rows={3} />
            </div>
            <div className="form-field">
              <label>Head</label>
              <input value={form.head} onChange={setField('head')} placeholder="Department head" />
            </div>
            <div className="form-field">
              <label>Status</label>
              <select value={form.status} onChange={setField('status')}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
