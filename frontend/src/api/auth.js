import { request } from './request'

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function register(name, email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export function changePassword(old_password, new_password) {
  return request('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ old_password, new_password }),
  })
}

export function createAuthUser(employee_id, email, password, auth_role) {
  return request('/auth/users', {
    method: 'POST',
    body: JSON.stringify({ employee_id, email, password, auth_role }),
  })
}

export function listAuthUsers() {
  return request('/auth/users')
}

export function activateAuthUser(user_id) {
  return request(`/auth/users/${user_id}/activate`, { method: 'PUT' })
}

export function rejectAuthUser(user_id) {
  return request(`/auth/users/${user_id}`, { method: 'DELETE' })
}

export function updateAuthUserRole(user_id, auth_role) {
  return request(`/auth/users/${user_id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ auth_role }),
  })
}

export function getMe() {
  return request('/auth/me')
}
