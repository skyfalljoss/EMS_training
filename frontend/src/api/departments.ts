import { api } from './request'
import type {
  DepartmentApi,
  DepartmentFilters,
  DepartmentPayload,
} from '../types/department'

export function listDepartments(
  filters: DepartmentFilters = {},
): Promise<DepartmentApi[]> {
  const clean = Object.fromEntries(
    Object.entries(filters).filter(([key, v]) => key && v !== undefined && v !== null && v !== ''),
  )
  return api.get<DepartmentApi[]>('/departments', { params: clean })
}

export function getDepartment(id: number | string): Promise<DepartmentApi> {
  return api.get<DepartmentApi>(`/departments/${id}`)
}

export function createDepartment(
  data: Partial<DepartmentPayload>,
): Promise<DepartmentApi> {
  return api.post<DepartmentApi>('/departments', data)
}

export function updateDepartment(
  id: number | string,
  data: Partial<DepartmentPayload>,
): Promise<DepartmentApi> {
  return api.put<DepartmentApi>(`/departments/${id}`, data)
}

export function deleteDepartment(id: number | string): Promise<unknown> {
  return api.delete(`/departments/${id}`)
}
