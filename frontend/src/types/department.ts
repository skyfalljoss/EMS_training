export type DepartmentStatus = 'active' | 'inactive' | 'archived'

export interface DepartmentApi {
  id: number
  name: string
  code?: string
  description?: string | null
  head?: string | null
  status: DepartmentStatus
  icon?: string
  color?: string
  headcount?: number | string
  budget?: string
  createdAt?: string | null
  updatedAt?: string | null
}

export interface DepartmentView {
  id: number
  name: string
  code: string
  description: string
  head: string
  status: DepartmentStatus
  icon: string
  color: string
  headcount: number | string
  budget: string
  createdAt: string | null
  updatedAt: string | null
}

export interface DepartmentFilters {
  status?: string
}

export interface DepartmentPayload {
  name: string
  code: string
  description?: string
  head?: string
  status: DepartmentStatus
}
