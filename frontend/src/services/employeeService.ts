import * as api from '../api/employees'
import * as deptApi from '../api/departments'
import type {
  EmployeeApi,
  EmployeeFilters,
  EmployeePayload,
  EmployeeView,
} from '../types/employee'


const COLORS = ['#0c2961','#1a3a6b','#2a4a7b','#0a1a3b','#3a5a8b','#4a6a9b','#5a7aab','#6a8abb']

function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length] ?? COLORS[0]!
}

function formatSalary(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return '$' + Number(n).toLocaleString('en-US')
}

function formatRating(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return Number(n).toFixed(1) + '/5.0'
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  const s = typeof d === 'string' ? d : String(d)
  return s.slice(0, 10)
}

function toFrontend(emp: EmployeeApi): EmployeeView {
  return {
    id: emp.id,
    name: emp.name,
    email: emp.email,
    dept: emp.department ?? emp.dept ?? '',
    department_id: emp.department_id ?? null,
    role: emp.role,
    status: emp.status ?? 'active',
    start: formatDate(emp.start_date ?? emp.start),
    color: emp.color ?? hashColor(emp.name),
    phone: emp.phone ?? '—',
    location: emp.location ?? '—',
    manager: emp.manager ?? '—',
    salary: formatSalary(emp.salary),
    rating: formatRating(emp.rating),
    date_of_birth: formatDate(emp.date_of_birth),
    national_id: emp.national_id ?? '—',
  }
}

export async function listEmployees(
  filters: EmployeeFilters = {},
): Promise<EmployeeView[]> {

    const data = await api.listEmployees(filters)
    const depts = await deptApi.listDepartments().catch(() => [])
    const deptMap: Record<number, string> = {}
    for (const d of depts) deptMap[d.id] = d.name
    return data.map(e => {
      const fe = toFrontend(e)
      if (e.department_id != null && deptMap[e.department_id]) {
        fe.dept = deptMap[e.department_id]!
      }
      return fe
    })
  }

export async function getEmployee(
  id: number | string,
): Promise<EmployeeView | null> {

    const data = await api.getEmployee(id)
    return toFrontend(data)
  }

export async function createEmployee(
  data: Partial<EmployeePayload> & { department?: string },
): Promise<EmployeeView> {

    const res = await api.createEmployee(data)
    return toFrontend(res)
  }

export async function updateEmployee(
  id: number | string,
  data: Partial<EmployeePayload> & { department?: string },
): Promise<EmployeeView> {

    const res = await api.updateEmployee(id, data)
    return toFrontend(res)
  }

export async function deleteEmployee(id: number | string): Promise<void> {

    await api.deleteEmployee(id)
  }
