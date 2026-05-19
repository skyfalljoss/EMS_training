# Register & Login Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add self-registration, improve login UI with glassmorphism, 404 catch-all, and hide sidebar on auth pages.

**Architecture:** Backend auto-creates employee on register. Frontend uses glassmorphic card for auth pages, conditionally hides Sidebar/TopBar. 404 routes redirect to /login.

**Tech Stack:** React 19, FastAPI, Vite 8

---

### Task 1: Backend — Update RegisterRequest model

**Files:**
- Modify: `backend/app/models/auth_user.py`

- [ ] **Step 1: Read `backend/app/models/auth_user.py`** and find `RegisterRequest`.

- [ ] **Step 2: Modify `RegisterRequest`** — replace `employee_id: int` with `name: str`:

```python
class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Full name")
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, v: str) -> str:
        return _validate_password(v)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/auth_user.py
git commit -m "feat: replace employee_id with name in register request"
```

---

### Task 2: Backend — Update AuthController.register() and route

**Files:**
- Modify: `backend/app/controllers/auth_controller.py`
- Modify: `backend/app/api/routes/auth.py`

- [ ] **Step 1: Read `backend/app/controllers/auth_controller.py`** and find the `register` method.

- [ ] **Step 2: Update `register()`** to accept `(name, email, password)`, auto-create employee:

```python
async def register(self, name: str, email: str, password: str) -> int:
    existing = await self.repo.find_by_email(email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{email}' already registered",
        )
    # Create minimal employee first
    now = datetime.now(timezone.utc)
    from app.repositories.employee_repository import EmployeeRepository
    emp_repo = EmployeeRepository()
    emp_id = await emp_repo.next_id()
    emp_doc = {
        "id": emp_id,
        "name": name,
        "email": str(email),
        "role": "New Hire",
        "department_id": 1,
        "status": "active",
        "position": None,
        "phone": None,
        "location": None,
        "manager": None,
        "start_date": None,
        "date_of_birth": None,
        "createdAt": now,
        "updatedAt": now,
    }
    await emp_repo.insert(emp_doc)
    # Create auth user
    password_hash = hash_password(password)
    return await self.repo.insert({
        "employee_id": emp_id,
        "email": str(email),
        "password_hash": password_hash,
        "auth_role": AuthRole.EMPLOYEE.value,
        "is_active": False,
    })
```

- [ ] **Step 3: Update auth route** — read `backend/app/api/routes/auth.py`, update the register handler:

```python
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    controller: AuthController = Depends(get_auth_controller),
):
    user_id = await controller.register(body.name, body.email, body.password)
    return {"id": user_id, "message": "Registration submitted. Awaiting admin approval."}
```

- [ ] **Step 4: Run backend tests**

```bash
cd backend && uv run pytest tests/ -v --tb=short
```
Expected: 90 passed (update test_register_creates_inactive if it uses old employee_id field).

- [ ] **Step 5: Commit**

```bash
git add backend/app/controllers/auth_controller.py backend/app/api/routes/auth.py
git commit -m "feat: register auto-creates employee, uses name instead of employee_id"
```

---

### Task 3: Frontend — Add register() to api/auth.js and AuthContext

**Files:**
- Modify: `frontend/src/api/auth.js`
- Modify: `frontend/src/context/AuthContext.jsx`

- [ ] **Step 1: Add register to `frontend/src/api/auth.js`**:

```js
export function register(name, email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}
```

- [ ] **Step 2: Add register method to AuthContext** — read `frontend/src/context/AuthContext.jsx`, add:

```jsx
const register = useCallback(async (name, email, password) => {
  return await authApi.register(name, email, password)
}, [])
```

Add to the Provider value: `register,`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/auth.js frontend/src/context/AuthContext.jsx
git commit -m "feat: add register to auth API and context"
```

---

### Task 4: Frontend — Create Register page

**Files:**
- Create: `frontend/src/pages/Register.jsx`

- [ ] **Step 1: Create `frontend/src/pages/Register.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await register(name, email, password)
      setName(''); setEmail(''); setPassword('')
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      if (err.status === 400) {
        setError(err.message || 'Email already registered.')
      } else if (err.status === 422) {
        setError('Please check your inputs. Password must be 8+ chars with upper, digit, and special character.')
      } else {
        setError(err.message || 'Registration failed.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="glass-card login-card">
          <h1>Check Your Email</h1>
          <p>Registration submitted. An admin will activate your account.</p>
          <p className="subtitle">Redirecting to login…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="glass-card login-card">
        <h1>Create Account</h1>
        <p className="subtitle">Register for an EMS account</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Full name" value={name}
            onChange={e => setName(e.target.value)} required autoFocus
            autoComplete="name" disabled={saving} />
          <input type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
            autoComplete="email" disabled={saving} />
          <input type="password" placeholder="Password (8+ chars, upper, digit, special)" value={password}
            onChange={e => setPassword(e.target.value)} required
            autoComplete="new-password" disabled={saving} />
          <button type="submit" disabled={saving}>
            {saving ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Register.jsx
git commit -m "feat: add register page with self-registration form"
```

---

### Task 5: Frontend — Improve Login page with glassmorphism

**Files:**
- Modify: `frontend/src/pages/Login.jsx`

- [ ] **Step 1: Read `frontend/src/pages/Login.jsx`** and replace with glassmorphic version:

```jsx
import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
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
        setError(err.message || 'Login failed.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="login-page">
      <div className="glass-card login-card">
        <h1>EMS Login</h1>
        <p className="subtitle">Sign in to your account</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required autoFocus
            autoComplete="email" disabled={saving} />
          <input type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required
            autoComplete="current-password" disabled={saving} />
          <button type="submit" disabled={saving}>
            {saving ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Login.jsx
git commit -m "feat: improve login page with glassmorphism and register link"
```

---

### Task 6: Frontend — Update App.jsx (register route, 404, conditional layout)

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Read `frontend/src/App.jsx`** fully.

- [ ] **Step 2: Add imports:**
```jsx
import Register from './pages/Register'
import { useLocation } from 'react-router-dom'
```

- [ ] **Step 3: Inside the App component**, add location detection and conditional layout:

```jsx
function App() {
  const location = useLocation()
  const authPaths = ['/login', '/register', '/change-password']
  const isAuthPage = authPaths.includes(location.pathname)
  // ... existing state hooks ...

  // In the JSX, wrap everything:
  return (
    <div className="app">
      <div className="bg-blobs">{/* ...blobs... */}</div>
      {!isAuthPage && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      <div className={isAuthPage ? "auth-layout" : "main"}>
        {!isAuthPage && <TopBar onMenuClick={() => setSidebarOpen(true)} />}
        <div className="screens">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/change-password" element={<ChangePassword />} />
            {/* ... existing protected routes ... */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
      {!isAuthPage && <TweaksPanel />}
    </div>
  )
}
```

Key changes:
1. Add `useLocation()` at the top of component
2. Add `const authPaths = ['/login', '/register', '/change-password']`
3. Add `const isAuthPage = authPaths.includes(location.pathname)`
4. Wrap Sidebar with `{!isAuthPage && <Sidebar ... />}`
5. Wrap TopBar with `{!isAuthPage && <TopBar ... />}`
6. Wrap TweaksPanel with `{!isAuthPage && <TweaksPanel />}`
7. Use `<div className={isAuthPage ? "auth-layout" : "main"}>` instead of `<div className="main">`
8. Add `<Route path="/register" ...>` and `<Route path="*" ...>`

- [ ] **Step 3: Verify frontend builds**

```bash
cd frontend && npx vite build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: add register route, 404 catch-all, conditional sidebar on auth pages"
```

---

### Task 7: Frontend — Update CSS for glassmorphic auth pages

**Files:**
- Modify: `frontend/src/styles/design.css`

- [ ] **Step 1: Read `frontend/src/styles/design.css`** and find the existing auth styles (bottom of file, around the `.login-page` section).

- [ ] **Step 2: Replace the old flat auth styles with glassmorphic styles:**

Find this block:
```css
/* Auth pages */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}
.login-card { ... }
```

Replace with:
```css
/* Auth pages */
.auth-layout {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.login-page {
  width: 100%;
  max-width: 420px;
  padding: 24px;
}

.login-card.glass-card,
.glass-card.login-card {
  padding: 40px 36px;
}

.login-card h1 {
  margin: 0 0 4px;
  font-size: 26px;
  font-weight: 700;
}

.login-card .subtitle {
  margin: 0 0 24px;
  font-size: 14px;
  opacity: 0.6;
}

.login-card .error {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.login-card input {
  width: 100%;
  padding: 10px 14px;
  margin-bottom: 14px;
  border: 1px solid var(--border-subtle, rgba(0,0,0,0.1));
  border-radius: 10px;
  font-size: 14px;
  box-sizing: border-box;
  background: rgba(255,255,255,0.05);
  color: inherit;
  transition: border-color 0.2s;
}

.login-card input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow);
}

.login-card button[type="submit"] {
  width: 100%;
  padding: 12px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.login-card button[type="submit"]:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px var(--primary-glow);
}

.login-card button[type="submit"]:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.login-card .auth-link {
  text-align: center;
  margin-top: 20px;
  font-size: 13px;
  opacity: 0.7;
}

.login-card .auth-link a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}

.login-card .auth-link a:hover {
  text-decoration: underline;
}
```

- [ ] **Step 2: Verify frontend builds**

```bash
cd frontend && npx vite build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/design.css
git commit -m "feat: glassmorphic auth page styles with dark mode support"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run backend tests**

```bash
cd backend && uv run pytest tests/ -v --tb=short
```
Expected: All pass (update test_register_creates_inactive if needed — it now uses `name` field instead of `employee_id`).

- [ ] **Step 2: Build frontend**

```bash
cd frontend && npx vite build 2>&1 | tail -5
```
Expected: Build succeeds.

- [ ] **Step 3: Move docs**

```bash
mv .opencode/plans/2026-05-14-register-and-login-improvement-design.md docs/superpowers/specs/
mv .opencode/plans/2026-05-14-register-and-login-improvement.md docs/superpowers/plans/
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/ docs/superpowers/plans/
git commit -m "docs: add register and login improvement spec and plan"
```
