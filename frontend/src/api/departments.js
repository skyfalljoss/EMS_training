import { request } from './request'

export function listDepartments(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v)
  })
  const qs = params.toString()
  return request(`/departments${qs ? '?' + qs : ''}`)
}

export function getDepartment(id) { return request(`/departments/${id}`) }
export function createDepartment(data) { return request('/departments', { method: 'POST', body: JSON.stringify(data) }) }
export function updateDepartment(id, data) { return request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }) }
export function deleteDepartment(id) { return request(`/departments/${id}`, { method: 'DELETE' }) }
