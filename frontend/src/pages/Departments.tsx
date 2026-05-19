import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDepartmentsList, useDeleteDepartment } from '../hooks/useDepartmentsQuery'
import ConfirmModal from '../components/ConfirmModal'
import DepartmentFormModal from '../components/DepartmentFormModal'
import { usePermissions } from '../hooks/usePermissions'
import { departmentStatusLabel } from '../constants/departmentStatus'
import type { DepartmentView } from '../types/department'

export default function Departments() {
  const navigate = useNavigate()
  const { canCreate, canUpdate, canDelete } = usePermissions()
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<DepartmentView | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<DepartmentView | null>(null)

  const { data: departments = [] } = useDepartmentsList(
    filter !== 'all' ? { status: filter } : undefined,
  )
  const deleteMutation = useDeleteDepartment()

  const displayedDepartments = departments.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: number) {
    try {
      await deleteMutation.mutateAsync(id)
      setConfirmDelete(null)
    } catch {
      /* error handled by mutation */
    }
  }

  function openEdit(dept: DepartmentView) {
    setEditingDept(dept)
    setFormOpen(true)
  }

  function openCreate() {
    setEditingDept(null)
    setFormOpen(true)
  }

  function handleCloseForm() {
    setFormOpen(false)
    setEditingDept(null)
  }

  return (
    <>
      <div className="glass-card filter-card">
        <div className="card-header mb-0 p-0 header-flex">
          <div className="filter-row mb-0">
            {['all','active','inactive','archived'].map(f => (
              <span key={f} className={`filter-pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </span>
            ))}
          </div>
          <div className="search-box filter-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" placeholder="Search departments..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {canCreate && (
            <span className="action" onClick={openCreate}>+ Add Department</span>
          )}
        </div>
      </div>

      <div className="dept-grid">
        {displayedDepartments.length === 0 ? (
          <div className="glass-card empty-glass-card">
            <p className="text-muted">No departments found</p>
          </div>
        ) : (
          displayedDepartments.map(d => (
            <div key={d.id} className="dept-card glass-card cursor-pointer" onClick={() => navigate(`/departments/${d.id}`)}>
              <div className="flex-between">
                <div className="dept-header">
                  <div className="dept-icon" style={{background:d.color}}>{d.icon}</div>
                  <div>
                    <div className="dept-name">{d.name}</div>
                    <div className="dept-manager">{d.head || 'No head'}</div>
                  </div>
                </div>
                <div className="flex-gap-8" onClick={e => e.stopPropagation()}>
                  {canUpdate && (
                    <button className="icon-btn icon-btn-edit" onClick={() => openEdit(d)} title="Edit department">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  )}
                  {canDelete && (
                    <button className="icon-btn icon-btn-delete" onClick={() => setConfirmDelete(d)} title="Delete department">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <span className={`status-pill ${d.status} status-pill-sm`}>{departmentStatusLabel(d.status)}</span>
              </div>
              <div className="dept-stats">
                <div className="dept-stat"><div className="num">{d.headcount}</div><div className="lbl">Employees</div></div>
                <div className="dept-stat"><div className="num">{d.budget}</div><div className="lbl">Budget</div></div>
              </div>
            </div>
          ))
        )}
      </div>

      <DepartmentFormModal
        key={formOpen ? (editingDept ? `edit-${editingDept.id}` : 'new') : 'closed'}
        open={formOpen}
        department={editingDept}
        onClose={handleCloseForm}
      />

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Department"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete.id)}
      >
        Are you sure you want to delete <strong>{confirmDelete?.name}</strong>? This action cannot be undone.
      </ConfirmModal>
    </>
  )
}
