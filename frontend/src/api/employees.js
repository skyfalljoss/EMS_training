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

export function listEmployees(filters = {}) {
  const params = new URLSearchParams()
  if (filters.department) params.set('department', filters.department)
  if (filters.department_id) params.set('department_id', filters.department_id)
  if (filters.role) params.set('role', filters.role)
  if (filters.name) params.set('name', filters.name)
  const qs = params.toString()
  return request(`/employees${qs ? '?' + qs : ''}`)
}

export function getEmployee(id) {
  return request(`/employees/${id}`)
}

export function createEmployee(data) {
  return request('/employees', { method: 'POST', body: JSON.stringify(data) })
}

export function updateEmployee(id, data) {
  return request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function deleteEmployee(id) {
  return request(`/employees/${id}`, { method: 'DELETE' })
}
