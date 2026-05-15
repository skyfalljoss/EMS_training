import { useState, useEffect, useCallback } from 'react'
import {
  createAuthUser,
  listAuthUsers,
  activateAuthUser,
  rejectAuthUser,
} from '../api/auth'
import { listEmployees } from '../api/employees'
import { useAuth } from '../hooks/useAuth'
import ConfirmModal from '../components/ConfirmModal'

const roleLabel = { admin: 'Admin', manager: 'Manager', employee: 'Employee' }

function fmtDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

export default function CreateUser() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [confirmReject, setConfirmReject] = useState(null)

  // create form
  const [showCreate, setShowCreate] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('employee')
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [u, emps] = await Promise.all([listAuthUsers(), listEmployees()])
      setUsers(u || [])
      setEmployees(emps || [])
    } catch (err) {
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'admin') fetch()
  }, [user, fetch])

  const empById = Object.fromEntries(employees.map(e => [e.id, e]))
  const pending = users.filter(u => !u.is_active)
  const active = users.filter(u => u.is_active)

  async function handleApprove(u) {
    setBusyId(u.id)
    setError(''); setSuccess('')
    try {
      await activateAuthUser(u.id)
      setSuccess(`Approved ${u.email}`)
      await fetch()
    } catch (err) {
      setError(err.message || 'Failed to approve user')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(u) {
    setBusyId(u.id)
    setError(''); setSuccess('')
    try {
      await rejectAuthUser(u.id)
      setSuccess(`Rejected ${u.email}`)
      setConfirmReject(null)
      await fetch()
    } catch (err) {
      setError(err.message || 'Failed to reject user')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    setSaving(true)
    try {
      await createAuthUser(Number(employeeId), email, password, role)
      setEmployeeId(''); setEmail(''); setPassword(''); setRole('employee')
      setShowCreate(false)
      setSuccess('User created successfully')
      await fetch()
    } catch (err) {
      setError(err.message || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="glass-card" style={{padding:24}}>
        <p>Access denied. Admin only.</p>
      </div>
    )
  }

  return (
    <>
      {error && <div className="glass-card" style={{padding:14,marginBottom:14,borderLeft:'4px solid var(--danger)',color:'var(--danger)'}}>{error}</div>}
      {success && <div className="glass-card" style={{padding:14,marginBottom:14,borderLeft:'4px solid #10b981'}}>{success}</div>}

      {/* Pending Approvals */}
      <div className="glass-card" style={{marginBottom:20}}>
        <div className="card-header">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <h3 style={{margin:0}}>Pending Approvals</h3>
            <span className="badge" style={{background:pending.length ? 'var(--danger)' : 'var(--muted)',color:'#fff'}}>
              {pending.length}
            </span>
          </div>
          <span className="action" onClick={fetch}>↻ Refresh</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Email</th><th>Employee</th><th>Role</th><th>Requested</th><th style={{width:200}}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{textAlign:'center',padding:24,color:'var(--muted)'}}>Loading…</td></tr>
              ) : pending.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:'center',padding:24,color:'var(--muted)'}}>No pending registration requests</td></tr>
              ) : (
                pending.map(u => {
                  const emp = empById[u.employee_id]
                  return (
                    <tr key={u.id}>
                      <td><div className="emp-name">{u.email}</div></td>
                      <td>{emp ? `${emp.name} (#${emp.id})` : `#${u.employee_id}`}</td>
                      <td>{roleLabel[u.auth_role] || u.auth_role}</td>
                      <td>{fmtDate(u.created_at)}</td>
                      <td>
                        <div style={{display:'flex',gap:8}}>
                          <button
                            className="btn-primary"
                            disabled={busyId === u.id}
                            onClick={() => handleApprove(u)}
                            style={{padding:'6px 12px',fontSize:12}}
                          >
                            {busyId === u.id ? '…' : 'Approve'}
                          </button>
                          <button
                            className="btn-secondary"
                            disabled={busyId === u.id}
                            onClick={() => setConfirmReject(u)}
                            style={{padding:'6px 12px',fontSize:12,color:'var(--danger)',borderColor:'var(--danger)'}}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Users */}
      <div className="glass-card">
        <div className="card-header">
          <h3 style={{margin:0}}>All Users <span style={{color:'var(--muted)',fontWeight:400}}>({users.length})</span></h3>
          <span className="action" onClick={() => setShowCreate(s => !s)}>
            {showCreate ? '× Cancel' : '+ Create User'}
          </span>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} style={{padding:'12px 20px 20px',display:'grid',gridTemplateColumns:'repeat(4,1fr) auto',gap:10,alignItems:'end'}}>
            <label style={{display:'flex',flexDirection:'column',gap:4,fontSize:12}}>
              Employee
              <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} required>
                <option value="">Select…</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} (#{emp.id})</option>
                ))}
              </select>
            </label>
            <label style={{display:'flex',flexDirection:'column',gap:4,fontSize:12}}>
              Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </label>
            <label style={{display:'flex',flexDirection:'column',gap:4,fontSize:12}}>
              Password
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </label>
            <label style={{display:'flex',flexDirection:'column',gap:4,fontSize:12}}>
              Role
              <select value={role} onChange={e => setRole(e.target.value)} required>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button type="submit" className="btn-primary" disabled={saving} style={{padding:'8px 16px'}}>
              {saving ? 'Creating…' : 'Create'}
            </button>
          </form>
        )}

        <div className="table-wrap">
          <table>
            <thead><tr><th>Email</th><th>Employee</th><th>Role</th><th>Status</th><th>Last Login</th><th style={{width:140}}>Actions</th></tr></thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:24,color:'var(--muted)'}}>No users</td></tr>
              ) : (
                users.map(u => {
                  const emp = empById[u.employee_id]
                  return (
                    <tr key={u.id}>
                      <td><div className="emp-name">{u.email}</div></td>
                      <td>{emp ? emp.name : `#${u.employee_id}`}</td>
                      <td>{roleLabel[u.auth_role] || u.auth_role}</td>
                      <td>
                        <span className={`status-pill ${u.is_active ? 'active' : 'on-leave'}`}>
                          {u.is_active ? 'Active' : 'Pending'}
                        </span>
                      </td>
                      <td>{fmtDate(u.last_login)}</td>
                      <td>
                        {!u.is_active ? (
                          <button
                            className="btn-primary"
                            disabled={busyId === u.id}
                            onClick={() => handleApprove(u)}
                            style={{padding:'6px 12px',fontSize:12}}
                          >Approve</button>
                        ) : (
                          <span style={{color:'var(--muted)',fontSize:12}}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmReject}
        title="Reject Registration"
        confirmLabel="Reject"
        loading={busyId === confirmReject?.id}
        onConfirm={() => confirmReject && handleReject(confirmReject)}
        onClose={() => setConfirmReject(null)}
      >
        <p>
          Reject and delete the registration request for{' '}
          <strong>{confirmReject?.email}</strong>? This cannot be undone.
        </p>
      </ConfirmModal>
    </>
  )
}
