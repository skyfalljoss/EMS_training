# Admin Role Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) for syntax tracking.

**Goal:** Enable admin to change user roles inline and convert create-user form to a modal with email autofill

**Architecture:** Backend adds a role-specific endpoint (`PUT /auth/users/{user_id}/role`) with a new `AUTH_USER_UPDATE` permission. Frontend adds an inline role dropdown + save button in the users table, and converts the create-user inline form to a reusable modal component following existing `EmployeeFormModal` patterns.

**Tech Stack:** FastAPI/Motor (Python), React 19 (JSX), pymongo sync client for test helpers

---

### Task 1: Backend — Add permission and model

**Files:**
- Modify: `backend/app/core/permissions.py:20`
- Modify: `backend/app/models/auth_user.py:81`

- [ ] **Step 1: Add `AUTH_USER_UPDATE` permission**

In `backend/app/core/permissions.py`, add the new permission after `AUTH_USER_DELETE`:

```python
class Permission(str, Enum):
    EMPLOYEE_READ      = "employee:read"
    EMPLOYEE_CREATE    = "employee:create"
    EMPLOYEE_UPDATE    = "employee:update"
    EMPLOYEE_DELETE    = "employee:delete"
    DEPARTMENT_READ    = "department:read"
    DEPARTMENT_CREATE  = "department:create"
    DEPARTMENT_UPDATE  = "department:update"
    DEPARTMENT_DELETE  = "department:delete"
    AUTH_USER_CREATE   = "auth:user:create"
    AUTH_USER_DELETE   = "auth:user:delete"
    AUTH_USER_UPDATE   = "auth:user:update"
    AUDIT_READ         = "audit:read"
    LEAVE_CREATE       = "leave:create"
    LEAVE_APPROVE      = "leave:approve"
    PAYROLL_READ       = "payroll:read"
    DASHBOARD_VIEW     = "dashboard:view"
```

No need to update `ROLE_PERMISSIONS` — `ADMIN` already gets all permissions via `[p.value for p in Permission]`.

- [ ] **Step 2: Add `AuthUserRoleUpdate` model**

In `backend/app/models/auth_user.py`, append before the closing of the file (after `PasswordChangeRequest`):

```python
class AuthUserRoleUpdate(BaseModel):
    auth_role: AuthRole
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/permissions.py backend/app/models/auth_user.py
git commit -m "feat: add AUTH_USER_UPDATE permission and AuthUserRoleUpdate model"
```

---

### Task 2: Backend — Controller method and route

**Files:**
- Modify: `backend/app/controllers/auth_controller.py:128` (after `list_users`)
- Modify: `backend/app/api/routes/auth.py:88` (before `@router.put("/password")`)
- Test: route guard test should pass as-is (new route is on `admin_router` which already has `require_password_not_expired`)

- [ ] **Step 1: Add `update_role` to controller**

In `backend/app/controllers/auth_controller.py`, add after `list_users`:

```python
    async def update_role(self, user_id: int, new_role: AuthRole) -> bool:
        user = await self.repo.find_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found")
        await self.repo.update(user_id, {"auth_role": new_role.value})
        return True
```

- [ ] **Step 2: Add the PUT route**

In `backend/app/api/routes/auth.py`, add before `@router.put("/password")` (line 91):

```python
@admin_router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    body: AuthUserRoleUpdate,
    controller: AuthController = Depends(get_auth_controller),
    current_user: dict = Depends(require_permissions(Permission.AUTH_USER_UPDATE)),
):
    await controller.update_role(user_id, body.auth_role)
    return {"message": "User role updated"}
```

Also add `AuthUserRoleUpdate` to the import from `app.models.auth_user`:

```python
from app.models.auth_user import (
    AuthUserCreate, AuthUserResponse, AuthUserRoleUpdate, LoginRequest,
    PasswordChangeRequest, RegisterRequest, TokenResponse,
)
```

- [ ] **Step 3: Run existing tests to confirm no regressions**

```bash
pytest tests/ -v --tb=short
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/app/controllers/auth_controller.py backend/app/api/routes/auth.py
git commit -m "feat: add update_role controller and PUT /auth/users/{id}/role endpoint"
```

---

### Task 3: Backend — Tests for update_role

**Files:**
- Create: `backend/tests/test_auth_update_role.py`

- [ ] **Step 1: Write the test file**

```python
"""Tests for PUT /auth/users/{user_id}/role."""

from fastapi.testclient import TestClient


def test_admin_can_change_user_role(api: TestClient, auth_headers: dict, unique_email: callable):
    """Admin can change another user's role from employee to manager."""
    email = unique_email("role")
    payload = {
        "employee_id": 1,
        "email": email,
        "password": "Test@1234",
        "auth_role": "employee",
    }
    create_resp = api.post("/auth/users", json=payload, headers=auth_headers)
    assert create_resp.status_code == 201
    user_id = create_resp.json()["id"]

    update_resp = api.put(
        f"/auth/users/{user_id}/role",
        json={"auth_role": "manager"},
        headers=auth_headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["message"] == "User role updated"

    # Verify via list
    list_resp = api.get("/auth/users", headers=auth_headers)
    users = list_resp.json()
    updated = next(u for u in users if u["id"] == user_id)
    assert updated["auth_role"] == "manager"


def test_manager_cannot_change_role(api: TestClient, manager_headers: dict, auth_headers: dict, unique_email: callable):
    """Manager gets 403 when trying to change a user's role."""
    email = unique_email("role2")
    payload = {
        "employee_id": 1,
        "email": email,
        "password": "Test@1234",
        "auth_role": "employee",
    }
    create_resp = api.post("/auth/users", json=payload, headers=auth_headers)
    assert create_resp.status_code == 201
    user_id = create_resp.json()["id"]

    resp = api.put(
        f"/auth/users/{user_id}/role",
        json={"auth_role": "admin"},
        headers=manager_headers,
    )
    assert resp.status_code == 403


def test_employee_cannot_change_role(api: TestClient, employee_headers: dict, auth_headers: dict, unique_email: callable):
    """Employee gets 403 when trying to change a user's role."""
    email = unique_email("role3")
    payload = {
        "employee_id": 1,
        "email": email,
        "password": "Test@1234",
        "auth_role": "employee",
    }
    create_resp = api.post("/auth/users", json=payload, headers=auth_headers)
    assert create_resp.status_code == 201
    user_id = create_resp.json()["id"]

    resp = api.put(
        f"/auth/users/{user_id}/role",
        json={"auth_role": "admin"},
        headers=employee_headers,
    )
    assert resp.status_code == 403


def test_change_role_not_found(api: TestClient, auth_headers: dict):
    """Changing role for non-existent user returns 404."""
    resp = api.put(
        "/auth/users/99999/role",
        json={"auth_role": "manager"},
        headers=auth_headers,
    )
    assert resp.status_code == 404
```

- [ ] **Step 2: Run the tests**

```bash
pytest tests/test_auth_update_role.py -v --tb=short
```

Expected: 4 passed.

- [ ] **Step 3: Run full test suite**

```bash
pytest tests/ -v --tb=short
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_auth_update_role.py
git commit -m "test: add tests for PUT /auth/users/{id}/role"
```

---

### Task 4: Frontend — API function and inline role change UI

**Files:**
- Modify: `frontend/src/api/auth.js:41` (add `updateAuthUserRole`)
- Modify: `frontend/src/pages/CreateUser.jsx` (inline role dropdown + save, integrate modal)

- [ ] **Step 1: Add `updateAuthUserRole` API function**

In `frontend/src/api/auth.js`, append before the closing of the file:

```javascript
export function updateAuthUserRole(user_id, auth_role) {
  return request(`/auth/users/${user_id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ auth_role }),
  })
}
```

- [ ] **Step 2: Update CreateUser.jsx with inline role dropdown**

Replace the entire `CreateUser.jsx` content. Key changes:
- Import `updateAuthUserRole` from `../api/auth`
- Import `UserFormModal` from `../components/UserFormModal`
- Remove inline create form (`showCreate`, `employeeId`, `email`, `password`, `role`, `saving` state + form JSX)
- Add `formOpen` state for the modal
- Add `updatingRole` state (similar to `busyId` but tracks which user has an active role edit)
- In the "All Users" table, replace the static `<td>{roleLabel[u.auth_role] ...}</td>` with an inline dropdown + save button
- Remove the `showCreate` toggle, replace "+ Create User" button with one that opens the modal

```jsx
import { useState, useEffect, useCallback } from 'react'
import {
  createAuthUser,
  listAuthUsers,
  activateAuthUser,
  rejectAuthUser,
  updateAuthUserRole,
} from '../api/auth'
import { listEmployees } from '../api/employees'
import { useAuth } from '../hooks/useAuth'
import ConfirmModal from '../components/ConfirmModal'
import UserFormModal from '../components/UserFormModal'

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

  // Role edit per-row
  const [editingRole, setEditingRole] = useState(null)   // user id being edited
  const [newRole, setNewRole] = useState('')
  const [savingRole, setSavingRole] = useState(false)

  // Create modal
  const [formOpen, setFormOpen] = useState(false)

  const [confirmReject, setConfirmReject] = useState(null)

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

  async function handleSaveRole(userId) {
    setSavingRole(true)
    setError(''); setSuccess('')
    try {
      await updateAuthUserRole(userId, newRole)
      setSuccess('Role updated')
      setEditingRole(null)
      setNewRole('')
      await fetch()
    } catch (err) {
      setError(err.message || 'Failed to update role')
    } finally {
      setSavingRole(false)
    }
  }

  function startEditRole(u) {
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
                              onChange={e => setNewRole(e.target.value)}
                              style={{fontSize:12,padding:'3px 6px'}}
                            >
                              <option value="employee">Employee</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              className="btn-primary"
                              disabled={savingRole}
                              onClick={() => handleSaveRole(u.id)}
                              style={{padding:'3px 8px',fontSize:11,whiteSpace:'nowrap'}}
                            >
                              {savingRole ? '…' : 'Save'}
                            </button>
                            <button
                              className="btn-secondary"
                              disabled={savingRole}
                              onClick={() => setEditingRole(null)}
                              style={{padding:'3px 8px',fontSize:11}}
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
                            {roleLabel[u.auth_role] || u.auth_role} ✎
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

      <UserFormModal
        key={formOpen ? 'new' : 'closed'}
        open={formOpen}
        employees={employees}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); fetch() }}
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
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/auth.js frontend/src/pages/CreateUser.jsx
git commit -m "feat: add inline role change dropdown in users table"
```

---

### Task 5: Frontend — UserFormModal component

**Files:**
- Create: `frontend/src/components/UserFormModal.jsx`
- Modify: `frontend/src/pages/CreateUser.jsx` (already updated in Task 4 to import and use the modal)

- [ ] **Step 1: Create `UserFormModal.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { createAuthUser } from '../api/auth'

function emptyForm() {
  return { employee_id: '', email: '', password: '', auth_role: 'employee' }
}

export default function UserFormModal({ open, employees, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(emptyForm())
      setError('')
      setSaving(false)
    }
  }, [open])

  function setField(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function handleEmployeeChange(e) {
    const id = e.target.value
    const emp = employees.find(emp => String(emp.id) === id)
    setForm(prev => ({
      ...prev,
      employee_id: id,
      email: emp ? emp.email : '',
    }))
  }

  function handleClose() {
    setError('')
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.employee_id || !form.email || !form.password) {
      setError('Employee, email, and password are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createAuthUser(Number(form.employee_id), form.email, form.password, form.auth_role)
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
      <div className="modal-dialog glass-card glass-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Auth User</h2>
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
              <label>Employee <span className="required">*</span></label>
              <select value={form.employee_id} onChange={handleEmployeeChange} required>
                <option value="">Select employee…</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} (#{emp.id})</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Email <span className="required">*</span></label>
              <input
                type="email"
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
```

- [ ] **Step 2: Verify frontend builds**

```bash
npm run build
```

Run from `frontend/` directory. Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/UserFormModal.jsx
git commit -m "feat: create UserFormModal with employee email autofill"
```

---

### Task 6: Verify backend + frontend together

- [ ] **Step 1: Run full backend test suite**

```bash
pytest tests/ -v --tb=short
```

Expected: all tests pass.

- [ ] **Step 2: Verify frontend builds clean**

```bash
npm run build
```

Expected: no errors or warnings.
