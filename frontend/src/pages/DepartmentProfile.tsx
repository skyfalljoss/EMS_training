import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDepartmentDetail, useDeleteDepartment } from '../hooks/useDepartmentsQuery'
import { useEmployeesList } from '../hooks/useEmployeesQuery'
import ConfirmModal from '../components/ConfirmModal'
import DepartmentFormModal from '../components/DepartmentFormModal'
import { usePermissions } from '../hooks/usePermissions'
import { departmentStatusLabel } from '../constants/departmentStatus'
import { employeeStatusLabel } from '../constants/employeeStatus'

export default function DepartmentProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { canUpdate, canDelete } = usePermissions()
  const [formOpen, setFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: department, isLoading } = useDepartmentDetail(id!)
  const { data: employees = [] } = useEmployeesList({ department_id: id })
  const deleteMutation = useDeleteDepartment()

  async function handleDelete() {
    if (!id) return
    try {
      await deleteMutation.mutateAsync(id)
      navigate('/departments')
    } catch {
      setConfirmDelete(false)
    }
  }

  if (isLoading) return null

  if (!department) {
    return (
      <div className="glass-card" style={{textAlign:'center',padding:40}}>
        <h2>Department not found</h2>
        <button className="pa-btn mt-16" onClick={() => navigate('/departments')}>← Back to Departments</button>
      </div>
    )
  }

  const d = department

  return (
    <>
      <button className="back-link" onClick={() => navigate('/departments')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Departments
      </button>

      <div className="glass-card mt-12">
        <div className="flex-between">
          <div className="profile-header" style={{border:'none',padding:0,marginBottom:24}}>
            <div className="profile-avatar" style={{background:d.color}}>{d.icon}</div>
            <div className="profile-info">
              <h1>{d.name}</h1>
              <div className="role"><span className="mr-10">{d.code}</span><span className={`status-pill ${d.status}`}>{departmentStatusLabel(d.status)}</span></div>
              <div className="profile-meta">
                {d.head && <span>Head: {d.head}</span>}
                {d.description && <span>{d.description}</span>}
              </div>
            </div>
          </div>
          <div className="flex-gap-6" style={{flexShrink:0}}>
            {canUpdate && (
              <button className="icon-action-btn" onClick={() => setFormOpen(true)} title="Edit department">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            )}
            {canDelete && (
              <button className="icon-action-btn icon-action-btn-danger" onClick={() => setConfirmDelete(true)} title="Delete department">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            )}
          </div>
        </div>

        <div className="mb-24">
          <h3 className="subsection-title">Department Details</h3>
          <div className="info-grid">
            <div className="info-field"><label>Department ID</label><div className="value">DEPT-{String(d.id).padStart(3,'0')}</div></div>
            <div className="info-field"><label>Name</label><div className="value">{d.name}</div></div>
            <div className="info-field"><label>Code</label><div className="value">{d.code}</div></div>
            <div className="info-field"><label>Head</label><div className="value">{d.head || '—'}</div></div>
            <div className="info-field"><label>Description</label><div className="value">{d.description || '—'}</div></div>
            <div className="info-field"><label>Status</label><div className="value"><span className={`status-pill ${d.status}`}>{departmentStatusLabel(d.status)}</span></div></div>
          </div>
        </div>

        <div>
          <h3 className="subsection-title">Employees ({employees.length})</h3>
          {employees.length === 0 ? (
            <p className="text-muted" style={{fontSize:13,padding:12}}>No employees in this department.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Employee</th><th>Role</th><th>Status</th></tr></thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.id} className="cursor-pointer" onClick={() => navigate(`/employees/${e.id}`)}>
                      <td>
                        <div className="emp-cell">
                          <div className="emp-avatar" style={{background:e.color}}>{e.name.split(' ').map(n => n[0]).join('')}</div>
                          <div><div className="emp-name">{e.name}</div><div className="emp-email">{e.email}</div></div>
                        </div>
                      </td>
                      <td>{e.role}</td>
                      <td><span className={`status-pill ${e.status}`}>{employeeStatusLabel(e.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <DepartmentFormModal
        key={formOpen ? `edit-${department.id}` : 'closed'}
        open={formOpen}
        department={department}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmModal
        open={confirmDelete}
        title="Delete Department"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      >
        <p>Are you sure you want to delete <strong>{d.name}</strong>?</p>
        {employees.length > 0 && (
          <p className="text-danger mt-8">{employees.length} employee(s) must be reassigned first.</p>
        )}
      </ConfirmModal>
    </>
  )
}


