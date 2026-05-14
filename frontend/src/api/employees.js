import { request } from './request'

export function listEmployees(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v)
  })
  const qs = params.toString()
  return request(`/employees${qs ? '?' + qs : ''}`)
}

export function getEmployee(id) { return request(`/employees/${id}`) }
export function createEmployee(data) { return request('/employees', { method: 'POST', body: JSON.stringify(data) }) }
export function updateEmployee(id, data) { return request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }) }
export function deleteEmployee(id) { return request(`/employees/${id}`, { method: 'DELETE' }) }
