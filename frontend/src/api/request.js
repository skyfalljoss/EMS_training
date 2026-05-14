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
