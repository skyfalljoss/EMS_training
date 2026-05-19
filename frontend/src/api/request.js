const BASE = ''
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register']

function redirectToLogin() {
  localStorage.removeItem('access_token')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

export async function request(url, options = {}) {
  const token = localStorage.getItem('access_token')
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token && !AUTH_ENDPOINTS.includes(url)) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${BASE}${url}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (res.status === 401) {
      redirectToLogin()
      const err = new Error('Session expired. Please login again.')
      err.status = 401
      throw err
    }
    if (res.status === 403) {
      const err = new Error(body.detail || 'Access denied')
      err.status = 403
      throw err
    }
    throw new Error(body.detail || `Request failed (${res.status})`)
  }
  return res.json()
}
