# Admin Role Management & Create User Modal

## Overview

Two admin features for the auth user management page (`/admin/users`):

1. **Inline role change** — admin can change any user's role between admin/manager/employee directly in the table
2. **Create User modal** — the inline create form is converted to a modal with employee email autofill

---

## Backend

### New permission

Add `AUTH_USER_UPDATE = "auth:user:update"` to `Permission` enum in `app/core/permissions.py`. Only ADMIN role inherits it (via the catch-all `ROLE_PERMISSIONS[AuthRole.ADMIN]`).

### New model

`AuthUserRoleUpdate` in `app/models/auth_user.py`:
```python
class AuthUserRoleUpdate(BaseModel):
    auth_role: AuthRole
```

### New endpoint

`PUT /auth/users/{user_id}/role` on `admin_router` in `app/api/routes/auth.py`:
- Body: `AuthUserRoleUpdate`
- Permission: `require_permissions(Permission.AUTH_USER_UPDATE)`
- Calls `controller.update_role(user_id, body.auth_role)`

### New controller method

`AuthController.update_role(self, user_id: int, new_role: AuthRole) -> bool` in `app/controllers/auth_controller.py`:
- Finds user via `repo.find_by_id()`, raises `NotFoundError` if missing
- Calls `repo.update(user_id, {"auth_role": new_role.value})`
- Returns True

No new repository method — `AuthRepository.update()` already applies `$set`.

---

## Frontend

### New API function

`updateAuthUserRole(user_id, auth_role)` in `frontend/src/api/auth.js`:
- `PUT /auth/users/{user_id}/role` with body `{ auth_role }`

### Role change UI (CreateUser.jsx)

In the "All Users" table, the role cell for each user changes from a static `<td>` label to:
- A `<select>` dropdown pre-selected with the user's current role
- A small "Save" button that appears only when the dropdown value differs from the original role
- When clicked, calls `updateAuthUserRole()` with `busyId` set to that user's ID for loading state
- On success, refreshes the user list
- On error, shows inline error

### Create User modal (new UserFormModal component)

Convert the inline create form (`showCreate` toggle) to a modal following the `EmployeeFormModal` pattern:

- New component: `UserFormModal.jsx` in `frontend/src/components/`
- Props: `open`, `employees`, `onClose`, `onSaved`
- Fields: Employee dropdown, Email, Password, Role
- On employee selection change: autofill email with `employees.find(e => e.id === selectedId).email`
- Email field is editable after autofill
- Submit calls `createAuthUser()`, then `onSaved()`
- Styled with `modal-backdrop`, `modal-dialog`, `glass-card` classes matching existing modals
- Error/success feedback in the modal

### Styling

No new CSS needed — reuses existing `.modal-backdrop`, `.modal-dialog`, `.modal-header`, `.modal-body`, `.modal-footer`, `.form-grid`, `.form-field` classes.

---

## Test impact

1. `tests/test_route_guards.py` — the new `PUT /auth/users/{user_id}/role` endpoint is on `admin_router` which already has `require_password_not_expired`, so no change needed to the guard test unless the new path doesn't match an existing pattern. Verify.
2. `tests/test_auth.py` — add tests for `update_role`: success case, not-found case, unauthorized (non-admin) case.
