const BASE = ''

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed (${res.status})`)
  }
  return res.json()
}

export function listDepartments(filters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  const qs = params.toString()
  return request(`/departments${qs ? '?' + qs : ''}`)
}

export function getDepartment(id) {
  return request(`/departments/${id}`)
}

export function createDepartment(data) {
  return request('/departments', { method: 'POST', body: JSON.stringify(data) })
}

export function updateDepartment(id, data) {
  return request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function deleteDepartment(id) {
  return request(`/departments/${id}`, { method: 'DELETE' })
}
