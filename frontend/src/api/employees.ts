import { api } from './request'
import type { EmployeeApi, EmployeeFilters, EmployeePayload } from '../types/employee'

export function listEmployees(filters: EmployeeFilters = {}): Promise<EmployeeApi[]> {
  const clean = Object.fromEntries(
    Object.entries(filters).filter(([key, v]) => key && v !== undefined && v !== null && v !== ''),
  )
  return api.get<EmployeeApi[]>('/employees', { params: clean })
}

export function getEmployee(id: number | string): Promise<EmployeeApi> {
  return api.get<EmployeeApi>(`/employees/${id}`)
}

export function createEmployee(data: Partial<EmployeePayload>): Promise<EmployeeApi> {
  return api.post<EmployeeApi>('/employees', data)
}

export function updateEmployee(
  id: number | string,
  data: Partial<EmployeePayload>,
): Promise<EmployeeApi> {
  return api.put<EmployeeApi>(`/employees/${id}`, data)
}

export function deleteEmployee(id: number | string): Promise<unknown> {
  return api.delete(`/employees/${id}`)
}
