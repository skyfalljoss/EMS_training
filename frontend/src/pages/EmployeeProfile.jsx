import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEmployee, deleteEmployee } from '../services/employeeService'
import ConfirmModal from '../components/ConfirmModal'
import EmployeeFormModal from '../components/EmployeeFormModal'
import { usePermissions } from '../hooks/usePermissions'

const statusLabel = {
  active: 'Active',
  remote: 'Remote',
  'on-leave': 'On Leave',
  terminated: 'Terminated',
}

const tabs = ['personal', 'employment', 'performance', 'documents']

export default function EmployeeProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canUpdate, canDelete } = usePermissions()
  const [activeTab, setActiveTab] = useState('personal')
  const [employee, setEmployee] = useState(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    getEmployee(id).then(data => {
      if (active) setEmployee(data || null)
    })
    return () => { active = false }
  }, [id])

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteEmployee(id)
      navigate('/employees')
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (employee === undefined) return null

  if (!employee) {
    return (
      <div className="glass-card" style={{textAlign:'center',padding:40}}>
        <h2>Employee not found</h2>
        <button className="pa-btn" style={{marginTop:16}} onClick={() => navigate('/employees')}>Back to Directory</button>
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

      <div className="glass-card" style={{marginTop:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div className="profile-header" style={{border:'none',padding:0,marginBottom:24}}>
            <div className="profile-avatar" style={{background:e.color}}>{e.name.split(' ').map(n => n[0]).join('')}</div>
            <div className="profile-info">
              <h1>{e.name}</h1>
              <div className="role">{e.role}{e.dept}</div>
              <div className="profile-meta">
                <span>{e.location}</span>
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
            {canUpdate && (
              <button style={iconBtnStyle} onClick={() => setFormOpen(true)} title="Edit employee">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            )}
            {canDelete && (
              <button style={{...iconBtnStyle,color:'var(--danger)'}} onClick={() => setConfirmDelete(true)} title="Delete employee">
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
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32}}>
            <div>
              <div className="section-title" style={{fontSize:13,marginBottom:16}}>Identity</div>
              <div className="info-grid">
                <div className="info-field"><label>Full Name</label><div className="value">{e.name}</div></div>
                <div className="info-field"><label>Date of Birth</label><div className="value">{e.date_of_birth}</div></div>
                <div className="info-field"><label>National ID</label><div className="value">{e.national_id}</div></div>
              </div>
            </div>
            <div>
              <div className="section-title" style={{fontSize:13,marginBottom:16}}>Contact</div>
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
            <div className="info-field"><label>Status</label><div className="value"><span className={`status-pill ${e.status}`}>{statusLabel[e.status]}</span></div></div>
          </div>
        </div>

        <div className={`profile-tab-content${activeTab === 'documents' ? ' active' : ''}`}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {['Employment_Contract_2025.pdf','Q1_2025_Performance_Review.pdf','NDA_Agreement_signed.pdf','Benefits_Enrollment_2025.pdf'].map(doc => (
              <div key={doc} style={{padding:12,borderRadius:'var(--radius-sm)',background:'var(--primary-glass)',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                <span style={{fontSize:13}}>{doc}</span>
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
        onSaved={() => {
          getEmployee(id).then(data => setEmployee(data || null))
        }}
      />

      <ConfirmModal
        open={confirmDelete}
        title="Delete Employee"
        confirmLabel="Delete"
        loading={deleting}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      >
        Are you sure you want to delete <strong>{e.name}</strong>? This action cannot be undone.
      </ConfirmModal>
    </>
  )
}

const iconBtnStyle = {
  background:'none',border:'none',cursor:'pointer',
  padding:4,borderRadius:'var(--radius-sm)',
  color:'var(--muted)',display:'flex',alignItems:'center',
  transition:'all .15s',
}