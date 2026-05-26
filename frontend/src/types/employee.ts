export type EmployeeStatus =
  | 'active'
  | 'inactive'
  | 'on_leave'
  | 'terminated'

export interface EmployeeApi {
  id: number
  name: string
  email: string
  role: string
  department?: string | null
  department_id?: number | null
  position?: string | null
  status: EmployeeStatus
  phone?: string | null
  location?: string | null
  manager?: string | null
  salary?: number | null
  rating?: number | null
  start_date?: string | null
  date_of_birth?: string | null
  national_id?: string | null
  color?: string
  // legacy mock fields
  dept?: string
  start?: string
}

export interface EmployeeView {
  id: number
  name: string
  email: string
  dept: string
  department_id: number | null
  role: string
  status: EmployeeStatus
  start: string
  color: string
  phone: string
  location: string
  manager: string
  salary: string
  rating: string
  date_of_birth: string
  national_id: string
  position?: string
}

export interface EmployeeFilters {
  status?: string
  department?: string
  department_id?: number | string
  role?: string
  name?: string
}

export interface EmployeePayload {
  name: string
  email: string
  role: string
  department_id: number
  position?: string
  status: EmployeeStatus
  phone?: string
  location?: string
  manager?: string
  salary: number | null
  rating: number | null
  start_date: string | null
  date_of_birth: string | null
  national_id?: string
}
