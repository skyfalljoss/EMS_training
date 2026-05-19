import { useState } from 'react'
import {
  useAuthUsersList,
  useEmployeesListForAdmin,
  useActivateUser,
  useRejectUser,
  useUpdateUserRole,
} from '../hooks/useAuthQuery'
import { useAuth } from '../hooks/useAuth'
import ConfirmModal from '../components/ConfirmModal'
import UserFormModal from '../components/UserFormModal'
import type { AuthUserAdmin, Role } from '../types/auth'
import type { EmployeeApi } from '../types/employee'

const roleLabel: Record<string, string> = { admin: 'Admin', manager: 'Manager', employee: 'Employee' }

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

export default function CreateUser() {
  const { user } = useAuth()
  const { data: users = [], isLoading } = useAuthUsersList()
  const { data: employees = [] } = useEmployeesListForAdmin()
  const activateMutation = useActivateUser()
  const rejectMutation = useRejectUser()
  const updateRoleMutation = useUpdateUserRole()

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  // Role edit per-row
  const [editingRole, setEditingRole] = useState<number | null>(null)
  const [newRole, setNewRole] = useState<Role | ''>('')

  // Create modal
  const [formOpen, setFormOpen] = useState(false)

  const [confirmReject, setConfirmReject] = useState<AuthUserAdmin | null>(null)
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<AuthUserAdmin | null>(null)

  const empById: Record<number, EmployeeApi> = Object.fromEntries(
    employees.map(e => [e.id, e]),
  )
  const pending = users.filter(u => !u.is_active)

  async function handleApprove(u: AuthUserAdmin) {
    setBusyId(u.id)
    setError(''); setSuccess('')
    try {
      await activateMutation.mutateAsync(u.id)
      setSuccess(`Approved ${u.email}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve user')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(u: AuthUserAdmin) {
    setBusyId(u.id)
    setError(''); setSuccess('')
    try {
      await rejectMutation.mutateAsync(u.id)
      setSuccess(`Rejected ${u.email}`)
      setConfirmReject(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject user')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDeleteUser(u: AuthUserAdmin) {
    setBusyId(u.id)
    setError(''); setSuccess('')
    try {
      await rejectMutation.mutateAsync(u.id)
      setSuccess(`Deleted user ${u.email}`)
      setConfirmDeleteUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setBusyId(null)
    }
  }

  async function handleSaveRole(userId: number) {
    if (!newRole) return
    setError(''); setSuccess('')
    try {
      await updateRoleMutation.mutateAsync({ userId, role: newRole })
      setSuccess('Role updated')
      setEditingRole(null)
      setNewRole('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  function startEditRole(u: AuthUserAdmin) {
    setEditingRole(u.id)
    setNewRole(u.auth_role)
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
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Email</th><th>Employee</th><th>Role</th><th>Requested</th><th style={{width:200}}>Actions</th></tr></thead>
            <tbody>
              {isLoading ? (
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
                      <td>{roleLabel[u.auth_role] ?? u.auth_role}</td>
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
          <span className="action" onClick={() => setFormOpen(true)}>+ Create User</span>
        </div>

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
                      <td>
                        {editingRole === u.id ? (
                          <div style={{display:'flex',gap:6,alignItems:'center'}}>
                            <select
                              value={newRole}
                              onChange={e => setNewRole(e.target.value as Role)}
                              style={{padding:'6px 10px',borderRadius:10,border:'1px solid var(--glass-border-left)',background:'var(--glass-highlight)',fontSize:12,fontWeight:600,color:'var(--fg)',outline:'none',cursor:'pointer',fontFamily:'var(--font-body)'}}
                            >
                              <option value="employee">Employee</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              className="btn btn-primary"
                              disabled={updateRoleMutation.isPending}
                              onClick={() => handleSaveRole(u.id)}
                              style={{padding:'6px 10px',fontSize:11,whiteSpace:'nowrap'}}
                            >
                              {updateRoleMutation.isPending ? '…' : 'Save'}
                            </button>
                            <button
                              disabled={updateRoleMutation.isPending}
                              onClick={() => setEditingRole(null)}
                              className="btn btn-danger"
                              style={{padding:'4px 8px',fontSize:13}}
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <span
                            className="action"
                            onClick={() => startEditRole(u)}
                            style={{cursor:'pointer'}}
                          >
                            {roleLabel[u.auth_role] ?? u.auth_role} ✎
                          </span>
                        )}
                      </td>
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
                          <button
                            className="btn btn-danger"
                            disabled={busyId === u.id}
                            onClick={() => setConfirmDeleteUser(u)}
                          >Delete</button>
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

      <UserFormModal
        key={formOpen ? 'new' : 'closed'}
        open={formOpen}
        employees={employees.map(e => ({
          id: e.id,
          name: e.name,
          email: e.email,
          dept: e.department ?? e.dept ?? '',
          department_id: e.department_id ?? null,
          role: e.role,
          status: e.status,
          start: e.start ?? '—',
          color: e.color ?? '',
          phone: e.phone ?? '—',
          location: e.location ?? '—',
          manager: e.manager ?? '—',
          salary: '—',
          rating: '—',
          date_of_birth: '—',
          national_id: e.national_id ?? '—',
        }))}
        onClose={() => setFormOpen(false)}
        onSaved={() => setFormOpen(false)}
      />

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

      <ConfirmModal
        open={!!confirmDeleteUser}
        title="Delete User"
        confirmLabel="Delete"
        loading={busyId === confirmDeleteUser?.id}
        onConfirm={() => confirmDeleteUser && handleDeleteUser(confirmDeleteUser)}
        onClose={() => setConfirmDeleteUser(null)}
      >
        <p>
          Delete user account for <strong>{confirmDeleteUser?.email}</strong>?
        </p>
        <p style={{color:'var(--muted)',fontSize:13,marginTop:8}}>
          The linked employee record will be preserved. Only login access will be revoked.
        </p>
      </ConfirmModal>
    </>
  )
}
