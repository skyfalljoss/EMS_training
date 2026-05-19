# Frontend Auth Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the React frontend to the new backend security system with JWT login, protected routes, and role-based UI.

**Architecture:** AuthContext provides token/user state app-wide. Shared `request()` fetch wrapper attaches Bearer token and handles 401/403. ProtectedRoute component guards routes. Backend `PUT /auth/password` returns a new access token.

**Tech Stack:** React 19, react-router-dom v7, Vite 8, native `fetch`, plain JSX

---

### Task 1: Backend — change_password returns new token

**Files:**
- Modify: `backend/app/controllers/auth_controller.py`
- Modify: `backend/app/api/routes/auth.py`

- [ ] **Step 1: Update `change_password` in auth_controller.py**

Read `backend/app/controllers/auth_controller.py`. Find the `change_password` method. Currently returns `True`. Change to return a new access token dict:

```python
async def change_password(self, user_id: int, old_password: str, new_password: str) -> Optional[dict]:
    user = await self.repo.find_by_id(user_id)
    if user is None:
        return None
    if not verify_password(old_password, user["password_hash"]):
        return None
    new_hash = hash_password(new_password)
    await self.repo.update(user_id, {
        "password_hash": new_hash,
        "must_change_password": False,
        "failed_attempts": 0,
        "locked_until": None,
    })
    # Return new token with must_change_pwd=False
    token_data = {
        "sub": str(user["id"]),
        "role": user["auth_role"],
        "employee_id": user.get("employee_id"),
        "email": user["email"],
        "must_change_pwd": False,
    }
    return {"access_token": create_access_token(data=token_data), "token_type": "bearer"}
```

- [ ] **Step 2: Update auth route**

Read `backend/app/api/routes/auth.py`. Change the `change_password` route to use `TokenResponse` model and return the controller result directly:

```python
from app.models.auth_user import TokenResponse

@router.put("/password", response_model=TokenResponse)
async def change_password(
    body: PasswordChangeRequest,
    controller: AuthController = Depends(get_auth_controller),
    current_user: dict = Depends(get_current_user),
):
    result = await controller.change_password(
        current_user["id"], body.old_password, body.new_password
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    return result
```

- [ ] **Step 3: Run backend tests**

```bash
cd backend && uv run pytest tests/test_auth.py -v --tb=short
```
Expected: All auth tests pass (the change_password test may need updating since response changed).

- [ ] **Step 4: Commit**

```bash
git add backend/app/controllers/auth_controller.py backend/app/api/routes/auth.py
git commit -m "feat: change_password returns new access token"
```

---

### Task 2: Create shared api/request.js

**Files:**
- Create: `frontend/src/api/request.js`

- [ ] **Step 1: Create `frontend/src/api/request.js`**

```js
const BASE = ''
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/password']

export async function request(url, options = {}) {
  const token = localStorage.getItem('access_token')
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token && !AUTH_ENDPOINTS.includes(url)) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${BASE}${url}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (res.status === 401 || res.status === 403) {
      const err = new Error(body.detail || `HTTP ${res.status}`)
      err.status = res.status
      throw err
    }
    throw new Error(body.detail || `Request failed (${res.status})`)
  }
  return res.json()
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/request.js
git commit -m "feat: add shared fetch wrapper with auth header injection"
```

---

### Task 3: Create AuthContext + useAuth hook + api/auth.js

**Files:**
- Create: `frontend/src/context/AuthContext.jsx`
- Create: `frontend/src/hooks/useAuth.js`
- Create: `frontend/src/api/auth.js`

- [ ] **Step 1: Create `frontend/src/api/auth.js`**

```js
import { request } from './request'

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function changePassword(old_password, new_password) {
  return request('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ old_password, new_password }),
  })
}
```

- [ ] **Step 2: Create `frontend/src/hooks/useAuth.js`**

```js
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

- [ ] **Step 3: Create `frontend/src/context/AuthContext.jsx`**

```jsx
import { createContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authApi from '../api/auth'

export const AuthContext = createContext(null)

function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      const payload = decodeToken(token)
      if (payload && payload.exp * 1000 > Date.now()) {
        setUser(payload)
      } else {
        localStorage.removeItem('access_token')
        setToken(null)
      }
    }
    setLoading(false)
  }, [token])

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password)
    localStorage.setItem('access_token', data.access_token)
    setToken(data.access_token)
    const payload = decodeToken(data.access_token)
    setUser(payload)
    return payload
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    setToken(null)
    setUser(null)
  }, [])

  const changePassword = useCallback(async (old_pwd, new_pwd) => {
    const data = await authApi.changePassword(old_pwd, new_pwd)
    localStorage.setItem('access_token', data.access_token)
    setToken(data.access_token)
    const payload = decodeToken(data.access_token)
    setUser(payload)
    return payload
  }, [])

  const isAuthenticated = !!token
  const mustChangePassword = user?.must_change_pwd === true

  return (
    <AuthContext.Provider value={{ user, token, login, logout, changePassword, isAuthenticated, mustChangePassword, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/auth.js frontend/src/hooks/useAuth.js frontend/src/context/AuthContext.jsx
git commit -m "feat: add AuthContext, useAuth hook, and auth API module"
```

---

### Task 4: Create Login page

**Files:**
- Create: `frontend/src/pages/Login.jsx`

- [ ] **Step 1: Create `frontend/src/pages/Login.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login, mustChangePassword, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const from = location.state?.from?.pathname || '/dashboard'

  if (isAuthenticated && !mustChangePassword) {
    navigate(from, { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = await login(email, password)
      setPassword('')
      if (payload?.must_change_pwd) {
        navigate('/change-password', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      if (err.status === 429) {
        setError('Too many login attempts. Try again in 1 minute.')
      } else if (err.status === 401) {
        setError('Invalid email or password.')
      } else {
        setError(err.message || 'Login failed. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>EMS Login</h1>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required autoFocus
            autoComplete="email" disabled={saving}
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required
            autoComplete="current-password" disabled={saving}
          />
          <button type="submit" disabled={saving}>
            {saving ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Login.jsx
git commit -m "feat: add login page with error handling"
```

---

### Task 5: Create ChangePassword page

**Files:**
- Create: `frontend/src/pages/ChangePassword.jsx`

- [ ] **Step 1: Create `frontend/src/pages/ChangePassword.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ChangePassword() {
  const { changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPwd !== confirmPwd) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    try {
      await changePassword(oldPwd, newPwd)
      setOldPwd(''); setNewPwd(''); setConfirmPwd('')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Password change failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Change Password</h1>
        <p className="subtitle">You must change your password before continuing.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="password" placeholder="Current password" value={oldPwd}
            onChange={e => setOldPwd(e.target.value)} required autoFocus disabled={saving} />
          <input type="password" placeholder="New password (8+ chars, upper, digit, special)" value={newPwd}
            onChange={e => setNewPwd(e.target.value)} required disabled={saving} />
          <input type="password" placeholder="Confirm new password" value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)} required disabled={saving} />
          <button type="submit" disabled={saving}>
            {saving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
        <button className="link" onClick={logout}>Logout</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ChangePassword.jsx
git commit -m "feat: add forced password change page"
```

---

### Task 6: Create ProtectedRoute and update App.jsx + main.jsx

**Files:**
- Create: `frontend/src/components/ProtectedRoute.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/main.jsx`

- [ ] **Step 1: Create `frontend/src/components/ProtectedRoute.jsx`**

```jsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, mustChangePassword, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  return children
}
```

- [ ] **Step 2: Update `frontend/src/main.jsx`**

Read existing file. Wrap `<App />` with `<AuthProvider>`:

```jsx
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

// Change:
//   <App />
// To:
//   <AuthProvider><App /></AuthProvider>
```

- [ ] **Step 3: Update `frontend/src/App.jsx`**

Read existing file. Add new routes and wrap protected routes with `<ProtectedRoute>`:

```jsx
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'

// Inside <Routes> add before root redirect:
<Route path="/login" element={<Login />} />
<Route path="/change-password" element={<ChangePassword />} />

// Wrap existing routes with ProtectedRoute:
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
<Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
<Route path="/employees/:id" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
<Route path="/departments" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
<Route path="/departments/:id" element={<ProtectedRoute><DepartmentProfile /></ProtectedRoute>} />
<Route path="/leave" element={<ProtectedRoute><Leave /></ProtectedRoute>} />
<Route path="/payroll" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ProtectedRoute.jsx frontend/src/App.jsx frontend/src/main.jsx
git commit -m "feat: add ProtectedRoute guard and wire auth routes"
```

---

### Task 7: Update API modules to use shared request helper

**Files:**
- Modify: `frontend/src/api/employees.js`
- Modify: `frontend/src/api/departments.js`

- [ ] **Step 1: Update `frontend/src/api/employees.js`**

Read the existing file. Remove the private `request()` function at the top. Add import and use shared `request()`:

```js
import { request } from './request'

export function listEmployees(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params.set(k, v) })
  const qs = params.toString()
  return request(`/employees${qs ? '?' + qs : ''}`)
}

export function getEmployee(id) { return request(`/employees/${id}`) }
export function createEmployee(data) { return request('/employees', { method: 'POST', body: JSON.stringify(data) }) }
export function updateEmployee(id, data) { return request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }) }
export function deleteEmployee(id) { return request(`/employees/${id}`, { method: 'DELETE' }) }
```

- [ ] **Step 2: Update `frontend/src/api/departments.js`**

Same pattern — remove private `request()`, import shared one:

```js
import { request } from './request'

export function listDepartments(params = {}) { /* use request */ }
export function getDepartment(id) { return request(`/departments/${id}`) }
export function createDepartment(data) { return request('/departments', { method: 'POST', body: JSON.stringify(data) }) }
export function updateDepartment(id, data) { return request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }) }
export function deleteDepartment(id) { return request(`/departments/${id}`, { method: 'DELETE' }) }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/employees.js frontend/src/api/departments.js
git commit -m "refactor: use shared fetch wrapper for all API calls"
```

---

### Task 8: Update services to propagate auth errors

**Files:**
- Modify: `frontend/src/services/employeeService.js`
- Modify: `frontend/src/services/departmentService.js`

- [ ] **Step 1: Update `frontend/src/services/employeeService.js`**

Read existing file. Each method has:
```js
try { return toFrontend(await api.createEmployee(data)) }
catch { /* mock fallback */ }
```

Change to propagate auth errors:
```js
try { return toFrontend(await api.createEmployee(data)) }
catch (err) {
  if (err.status) throw err  // 401/403 propagate — don't mock
  // Network error → mock fallback
  const emp = { ...data, id: _nextId++ }; _mockData.push(emp); return toFrontend(emp)
}
```

Apply the same pattern to all methods: `listEmployees`, `createEmployee`, `updateEmployee`, `getEmployee`, `deleteEmployee`.

- [ ] **Step 2: Update `frontend/src/services/departmentService.js`**

Same pattern — add `if (err.status) throw err` to all catch blocks.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/employeeService.js frontend/src/services/departmentService.js
git commit -m "fix: propagate 401/403 errors through services (don't mock auth failures)"
```

---

### Task 9: Update Sidebar and TopBar with real user + RBAC + logout

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/components/TopBar.jsx`

- [ ] **Step 1: Update `frontend/src/components/Sidebar.jsx`**

Read existing file. Key changes:
1. Import `useAuth` and read user
2. Replace hardcoded "Alex Chen — HR Manager" with real info
3. Add logout button
4. Conditionally hide admin/manager-only links

```jsx
import { useAuth } from '../hooks/useAuth'
// ...
function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  // Replace hardcoded sidebar-footer:
  <div className="sidebar-footer">
    <div className="avatar">
      {user?.email ? user.email[0].toUpperCase() : '?'}
    </div>
    <div className="info">
      <div className="name">{user?.email?.split('@')[0] || 'User'}</div>
      <div className="role">{user?.role || '—'}</div>
    </div>
    <button className="logout-btn" onClick={handleLogout}>Logout</button>
  </div>

  // For nav links that should be role-restricted:
  // Payroll — hide from employee role:
  {user?.role !== 'employee' && (
    <NavLink to="/payroll" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
      <span className="nav-icon">$</span>
      <span className="nav-text">Payroll</span>
    </NavLink>
  )}
```

- [ ] **Step 2: Update `frontend/src/components/TopBar.jsx`**

Read existing file. Replace any hardcoded user references with `useAuth()`:

```jsx
import { useAuth } from '../hooks/useAuth'

function TopBar() {
  const { user } = useAuth()
  // Use user?.email or user?.role where applicable
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Sidebar.jsx frontend/src/components/TopBar.jsx
git commit -m "feat: replace hardcoded user with AuthContext, add logout and RBAC sidebar"
```

---

### Task 10: Update Vite proxy + CSS styles

**Files:**
- Modify: `frontend/vite.config.js`
- Modify: `frontend/src/styles/design.css`

- [ ] **Step 1: Update `frontend/vite.config.js`**

Read existing file. Add `/auth` proxy rule:

```js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      // ... keep existing entries for /employees, /departments, /health
    },
  },
})
```

- [ ] **Step 2: Add auth styles to `frontend/src/styles/design.css`**

Append at the end of the existing CSS file:

```css
/* Auth pages */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}

.login-card {
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-card h1 {
  margin: 0 0 8px;
  font-size: 24px;
  color: #1a1a2e;
}

.login-card .subtitle {
  color: #666;
  margin-bottom: 20px;
  font-size: 14px;
}

.login-card .error {
  background: #fff0f0;
  color: #d32f2f;
  padding: 10px 14px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
}

.login-card input {
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.login-card input:focus {
  outline: none;
  border-color: #1a1a2e;
}

.login-card button[type="submit"] {
  width: 100%;
  padding: 10px;
  background: #1a1a2e;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.login-card button[type="submit"]:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-card button.link {
  background: none;
  border: none;
  color: #1a1a2e;
  cursor: pointer;
  padding: 8px 0;
  font-size: 13px;
  width: auto;
}

.sidebar-footer .logout-btn {
  background: none;
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-top: 8px;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/vite.config.js frontend/src/styles/design.css
git commit -m "feat: add /auth proxy and auth page styles"
```

---

### Task 11: Final integration verification

- [ ] **Step 1: Start backend**

```bash
cd backend && uv run uvicorn app.main:app &
```

- [ ] **Step 2: Start frontend**

```bash
cd frontend && npm run dev &
```

- [ ] **Step 3: Manual smoke test**

```bash
# Visit http://localhost:5173
# Should redirect to /login
# Login with admin@ems.com / Admin@1234
# Should redirect to /change-password
# Change password
# Should redirect to /dashboard
# Sidebar should show email initial avatar, role "admin"
# Logout button should work
# Employee user should NOT see Payroll in sidebar
# Invalid login should show error message
# Accessing /employees without auth should redirect to /login
```

- [ ] **Step 4: Verify backend tests still pass**

```bash
cd backend && uv run pytest tests/ -v --tb=short
```
Expected: 90 passed.

- [ ] **Step 5: Move plan and spec to docs**

```bash
mv .opencode/plans/2026-05-14-frontend-auth-integration-design.md docs/superpowers/specs/
mv .opencode/plans/2026-05-14-frontend-auth-integration-implementation.md docs/superpowers/plans/
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/ docs/superpowers/plans/
git commit -m "docs: add frontend auth integration spec and plan"
```
