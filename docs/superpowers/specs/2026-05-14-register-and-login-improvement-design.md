# Register & Login Improvement Design

## Overview

Add self-registration form, improve login page UI with glassmorphism, add 404 catch-all redirect, and conditionally hide sidebar on auth pages.

## Backend Changes

### RegisterRequest model (app/models/auth_user.py)
- Remove `employee_id` field
- Add `name: str = Field(..., min_length=1)` field

### AuthController.register() (app/controllers/auth_controller.py)
- Accept `(name, email, password)` instead of `(employee_id, email, password)`
- Auto-create minimal employee: `{name, email, role: "New Hire", department_id: 1, status: "active"}`
- Create auth user linked to new employee, `is_active: False`

### Auth route (app/api/routes/auth.py)
- Update route parameter to pass `name` to controller

## Frontend Changes

### New: Register page (src/pages/Register.jsx)
- 3 fields: Name, Email, Password (with validation requirements shown)
- "Already have an account? Sign in" link
- Glassmorphic card design
- On success → show message + redirect to /login
- On error → inline error display

### Improved: Login page (src/pages/Login.jsx)
- Glassmorphic card using existing CSS vars (`--glass-bg`, `--glass-blur`, etc.)
- "Don't have an account? Register" link
- Same layout as register for consistency
- Keep existing error handling (401, 429)

### Updated: App.jsx
- Add `path="/register"` route
- Add `path="*"` catch-all → redirect to `/login`
- Conditional layout: hide Sidebar + TopBar when path is `/login`, `/register`, `/change-password`

### Updated: api/auth.js
- Add `register(name, email, password)` export

### Updated: CSS (design.css)
- Replace flat `.login-page`/`.login-card` with glassmorphic styles
- Use existing `glass-card` classes and CSS vars
- `.auth-layout` class for full-viewport centered layout

## File Changes Summary

| File | Action |
|------|--------|
| `backend/app/models/auth_user.py` | Modify RegisterRequest |
| `backend/app/controllers/auth_controller.py` | Modify register() method |
| `backend/app/api/routes/auth.py` | Modify route parameter |
| `frontend/src/pages/Register.jsx` | Create |
| `frontend/src/pages/Login.jsx` | Modify |
| `frontend/src/App.jsx` | Modify |
| `frontend/src/api/auth.js` | Modify |
| `frontend/src/styles/design.css` | Modify |
