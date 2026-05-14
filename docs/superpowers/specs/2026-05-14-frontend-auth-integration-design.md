# Frontend Auth Integration Design

## Overview

Connect the React frontend to the backend security system. Add login, role-based routing, JWT token management, and auth-aware API calls. The frontend is a plain JSX React 19 SPA with Vite, no state management library, using raw `fetch`.

## Security Principles

| Rule | Implementation |
|------|---------------|
| Store only the token | Decode JWT payload on read — never store user separately |
| Clear passwords from memory | Set password state to `""` after login submit |
| 401 = logout | Auto-clear token, redirect to `/login` with "Session expired" |
| 403 = stay | Show "Access denied" message, don't redirect |
| must_change_password | Block all routes except `/change-password` and `/login` |
| Rate limit UX | Show "Too many attempts. Try again in 1 minute." |

## Backend Change: Password Change Returns New Token

Current `/auth/password` returns `{"message": "Password changed successfully"}`. Change it to return a **new access token** (with `must_change_password: False`) so the frontend can continue without re-logging in.

New response:
```json
{"access_token": "...", "token_type": "bearer"}
```

This is a 2-line change in `app/controllers/auth_controller.py` — generate and return a new token after successful password change.

## New Files (Frontend)

| File | Purpose |
|------|---------|
| `src/context/AuthContext.jsx` | React Context — stores token, user info, login/logout functions |
| `src/api/request.js` | Shared fetch wrapper — attaches `Authorization` header, handles 401/403 |
| `src/api/auth.js` | HTTP calls: `login()`, `register()`, `changePassword()` |
| `src/pages/Login.jsx` | Login page — dedicated `/login` route, centered card form |
| `src/pages/ChangePassword.jsx` | Forced password change page |
| `src/components/ProtectedRoute.jsx` | Route guard — redirect to `/login` if not authenticated |
| `src/hooks/useAuth.js` | `const { user, login, logout } = useAuth()` |

## Modified Files (Frontend)

| File | Changes |
|------|---------|
| `src/api/employees.js` | Use shared `request()` from `api/request.js` instead of local |
| `src/api/departments.js` | Same |
| `src/services/employeeService.js` | Don't catch errors with `.status` (401/403 propagate) |
| `src/services/departmentService.js` | Same |
| `src/main.jsx` | Wrap app with `<AuthProvider>` |
| `src/App.jsx` | Add `/login` and `/change-password` routes, wrap routes with `<ProtectedRoute>` |
| `src/components/Sidebar.jsx` | Read user from AuthContext, add logout button, hide admin links for non-admin |
| `src/components/TopBar.jsx` | Show real user name from AuthContext |
| `vite.config.js` | Add `/auth` to proxy targets |
| `src/styles/design.css` | Login page styles, change password styles |

## Modified Files (Backend)

| File | Changes |
|------|---------|
| `app/controllers/auth_controller.py` | `change_password()` returns a new access_token |
| `app/api/routes/auth.py` | Change response model (use `TokenResponse` instead of plain dict) |

## Architecture Flow

```
[Before any API call]
  request(url, opts)
    → read token from localStorage
    → attach Authorization header (unless auth endpoint)
    → fetch(url, headers)
    → if 401 → throw with .status=401 → AuthContext catches → logout()
    → if 403 → throw with .status=403 → UI shows "Access Denied"
    → if network error → service catches → mock fallback
    → if OK → return json

[AuthContext on mount]
    → check localStorage for token
    → if exists: decode JWT payload → set user
    → if expired: clear token

[ProtectedRoute]
    → if !isAuthenticated → redirect /login
    → if must_change_password → redirect /change-password (unless already there)
    → else → render children
```

## Component Details

### AuthContext (`src/context/AuthContext.jsx`)

```jsx
// State
const [user, setUser] = useState(null)  // decoded from JWT
const [token, setToken] = useState(localStorage.getItem('access_token'))
const [loading, setLoading] = useState(true)

// Initialize on mount
useEffect(() => {
  if (token) {
    const payload = decodeToken(token)  // parse JWT without library (base64 decode)
    if (payload && payload.exp * 1000 > Date.now()) {
      setUser(payload)
    } else {
      localStorage.removeItem('access_token')
      setToken(null)
    }
  }
  setLoading(false)
}, [])

// login(email, password)
  → POST /auth/login
  → store token in localStorage
  → decode and set user
  → return

// logout()
  → localStorage.removeItem('access_token')
  → setToken(null), setUser(null)
  → navigate('/login')

// changePassword(old, new)
  → PUT /auth/password
  → store NEW token (backend now returns token)
  → decode and set user
  → return
```

### Shared request helper (`src/api/request.js`)

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
      throw err  // NOT caught by services — propagates to AuthContext or component
    }
    throw new Error(body.detail || `Request failed (${res.status})`)
  }
  return res.json()
}
```

### ProtectedRoute (`src/components/ProtectedRoute.jsx`)

```jsx
function ProtectedRoute({ children }) {
  const { isAuthenticated, isPasswordExpired } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (isPasswordExpired && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  return children
}
```

### Login Page (`src/pages/Login.jsx`)

- Centered card, clean minimal design
- Email field (type=email, autocomplete=email)
- Password field (type=password, autocomplete=current-password)
- Submit button with loading spinner
- Error message display area (invalid creds, rate limited, server error)
- **Security:** Clear password state (`setPassword('')`) after submit

### ChangePassword Page (`src/pages/ChangePassword.jsx`)

- Same centered card layout as login
- Old password, new password, confirm new password
- Password requirements displayed (8+ chars, upper, digit, special)
- On success → auto-navigate to `/dashboard`
- **Security:** Clear all password fields after submit

### Sidebar Changes

- Replace hardcoded "Alex Chen — HR Manager" with user info from AuthContext
- Get real employee name: call `GET /employees/{employee_id}` (from JWT payload)
- Add logout button at bottom of sidebar
- Conditionally hide admin-only nav links:
  - Only **admin** sees: "Users" (future)
  - Only **admin/manager** sees: "Payroll"

## API Module Updates

Refactor existing `api/employees.js` and `api/departments.js` to use the shared `request()`:

```js
// src/api/employees.js — simplified:
import { request } from './request'

export function listEmployees(filters = {}) { ... }
export function getEmployee(id) { return request(`/employees/${id}`) }
// etc. — all use request() instead of local request()
```

Create `src/api/auth.js`:
```js
import { request } from './request'

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function changePassword(oldPassword, newPassword) {
  return request('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  })
}
```

## Service Layer Changes

In `src/services/employeeService.js`, the catch block currently catches ALL errors. Change to only catch network errors:

```js
// Current:
try { return toFrontend(await api.createEmployee(data)) }
catch { /* mock fallback */ }

// New:
try { return toFrontend(await api.createEmployee(data)) }
catch (err) {
  if (err.status) throw err  // 401/403 propagate — don't mock
  // network error → mock fallback
  const emp = { ...data, id: _nextId++ }; _mockData.push(emp); return toFrontend(emp)
}
```

## Vite Proxy Config

Add `/auth` to proxy:

```js
server: {
  proxy: {
    '/auth': 'http://localhost:8000',
    // ... existing entries
  },
},
```

## CSS Additions (~100 lines to `src/styles/design.css`)

- `.login-page` — full-screen centered layout
- `.login-card` — card container
- `.login-card h1` — title
- `.login-card .error` — error message styling
- `.login-card input` — input fields
- `.login-card button` — submit button + loading state
- Same pattern for `.change-password-page`

## Test Plan

- [ ] Login with valid credentials → redirected to `/dashboard` (or `/change-password`)
- [ ] Login with invalid credentials → error message shown
- [ ] Login rate limited → rate limit message shown
- [ ] Access `/employees` without auth → redirected to `/login`
- [ ] 401 from expired token → auto-logout, redirect to `/login`
- [ ] 403 from insufficient permissions → "Access denied" shown, NOT redirected
- [ ] Password change → new token received, redirected to `/dashboard`
- [ ] must_change_password → blocked from all routes except change password
- [ ] Logout → token cleared, redirected to `/login`
- [ ] Page refresh → token persists (reads from localStorage)
- [ ] Employee user sees limited sidebar (no Payroll)
- [ ] Service mock fallback still works on network errors
