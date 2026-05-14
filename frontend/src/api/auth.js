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
