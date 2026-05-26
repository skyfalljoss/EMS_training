import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEmployeeDetail, useDeleteEmployee } from '../hooks/useEmployeesQuery'
import ConfirmModal from '../components/ConfirmModal'
import EmployeeFormModal from '../components/EmployeeFormModal'
import { usePermissions } from '../hooks/usePermissions'
import { employeeStatusLabel } from '../constants/employeeStatus'

const tabs = ['personal', 'employment', 'performance', 'documents'] as const
type Tab = (typeof tabs)[number]

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { canUpdate, canDelete } = usePermissions()
  const [activeTab, setActiveTab] = useState<Tab>('personal')
  const [formOpen, setFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: employee, isLoading } = useEmployeeDetail(id!)
  const deleteMutation = useDeleteEmployee()

  async function handleDelete() {
    if (!id) return
    try {
      await deleteMutation.mutateAsync(id)
      navigate('/employees')
    } catch {
      setConfirmDelete(false)
    }
  }

  if (isLoading) return null

  if (!employee) {
    return (
      <div className="glass-card" style={{textAlign:'center',padding:40}}>
        <h2>Employee not found</h2>
        <button className="pa-btn mt-16" onClick={() => navigate('/employees')}>Back to Directory</button>
      </div>
    )
  }

  const e = employee

  return (
    <>
      <button className="back-link" onClick={() => navigate('/employees')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Directory
      </button>

      <div className="glass-card mt-12">
        <div className="flex-between">
          <div className="profile-header" style={{border:'none',padding:0,marginBottom:24}}>
            <div className="profile-avatar" style={{background:e.color}}>{e.name.split(' ').map(n => n[0]).join('')}</div>
            <div className="profile-info">
              <h1>{e.name}</h1>
              <div className="role">{e.role}  -  {e.dept}</div>
              <div className="profile-meta">
                <span>{e.location}</span>
              </div>
            </div>
          </div>
          <div className="flex-gap-6" style={{flexShrink:0}}>
            {canUpdate && (
              <button className="icon-action-btn" onClick={() => setFormOpen(true)} title="Edit employee">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            )}
            {canDelete && (
              <button className="icon-action-btn icon-action-btn-danger" onClick={() => setConfirmDelete(true)} title="Delete employee">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            )}
          </div>
        </div>

        <div className="profile-tabs">
          {tabs.map(t => (
            <span key={t} className={`profile-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
        </div>

        <div className={`profile-tab-content${activeTab === 'personal' ? ' active' : ''}`}>
          <div className="grid-2-lg">
            <div>
              <div className="section-subtitle">Identity</div>
              <div className="info-grid">
                <div className="info-field"><label>Full Name</label><div className="value">{e.name}</div></div>
                <div className="info-field"><label>Date of Birth</label><div className="value">{e.date_of_birth}</div></div>
                <div className="info-field"><label>National ID</label><div className="value">{e.national_id}</div></div>
              </div>
            </div>
            <div>
              <div className="section-subtitle">Contact</div>
              <div className="info-grid">
                <div className="info-field"><label>Phone</label><div className="value">{e.phone}</div></div>
                <div className="info-field"><label>Email</label><div className="value">{e.email}</div></div>
                <div className="info-field"><label>Location</label><div className="value">{e.location}</div></div>
              </div>
            </div>
          </div>
        </div>

        <div className={`profile-tab-content${activeTab === 'employment' ? ' active' : ''}`}>
          <div className="info-grid">
            <div className="info-field"><label>Employee ID</label><div className="value">EMP-{String(e.id).padStart(4,'0')}</div></div>
            <div className="info-field"><label>Department</label><div className="value">{e.dept}</div></div>
            <div className="info-field"><label>Role</label><div className="value">{e.role}</div></div>
            <div className="info-field"><label>Manager</label><div className="value">{e.manager}</div></div>
            <div className="info-field"><label>Start Date</label><div className="value">{e.start}</div></div>
            <div className="info-field"><label>Salary</label><div className="value">{e.salary}</div></div>
          </div>
        </div>

        <div className={`profile-tab-content${activeTab === 'performance' ? ' active' : ''}`}>
          <div className="info-grid">
            <div className="info-field"><label>Overall Rating</label><div className="value">{e.rating}</div></div>
            <div className="info-field"><label>Last Review</label><div className="value">Q4 2025</div></div>
            <div className="info-field"><label>Goals Met</label><div className="value">8/10</div></div>
            <div className="info-field"><label>Training Completed</label><div className="value">6 courses (2025)</div></div>
            <div className="info-field"><label>Tenure</label><div className="value">{e.start !== '—' ? `${new Date().getFullYear() - new Date(e.start).getFullYear()} years` : '—'}</div></div>
            <div className="info-field"><label>Status</label><div className="value"><span className={`status-pill ${e.status}`}>{employeeStatusLabel(e.status)}</span></div></div>
          </div>
        </div>

        <div className={`profile-tab-content${activeTab === 'documents' ? ' active' : ''}`}>
          <div className="grid-2">
            {['Employment_Contract_2025.pdf','Q1_2025_Performance_Review.pdf','NDA_Agreement_signed.pdf','Benefits_Enrollment_2025.pdf'].map(doc => (
              <div key={doc} className="doc-card">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                <span className="doc-name">{doc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <EmployeeFormModal
        key={formOpen ? `edit-${employee.id}` : 'closed'}
        open={formOpen}
        employee={employee}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmModal
        open={confirmDelete}
        title="Delete Employee"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      >
        <p>Are you sure you want to delete <strong>{e.name}</strong>?</p>
        <p className="text-danger" style={{fontSize:13,marginTop:8}}>
          This will also revoke their user login access. This action cannot be undone.
        </p>
      </ConfirmModal>
    </>
  )
}


