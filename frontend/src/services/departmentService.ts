import * as api from '../api/departments'
import * as empApi from '../api/employees'
import type {
  DepartmentApi,
  DepartmentFilters,
  DepartmentPayload,
  DepartmentView,
} from '../types/department'

const COLORS = ['#0c2961', '#1a3a6b', '#2a4a7b', '#0a1a3b', '#3a5a8b', '#4a6a9b', '#5a7aab', '#6a8abb']

const DEPT_ICONS: Record<string, string> = {
  IT: '💻', HR: '👥', FIN: '💰', MKT: '📊',
  RETAIL: '🏦', CORP: '🏛️', RISK: '🛡️', WEALTH: '📈',
  COMPLIANCE: '⚖️', OPS: '⚙️', DEV: '🔧', SALES: '🤝',
  SUPPORT: '🎧', LEGAL: '⚖️', ADMIN: '📋',
}

function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length] ?? COLORS[0]!
}

function iconForCode(code: string | undefined | null): string {
  return DEPT_ICONS[code?.toUpperCase() ?? ''] ?? '🏢'
}

function toFrontend(dept: DepartmentApi): DepartmentView {
  return {
    id: dept.id,
    name: dept.name,
    code: dept.code ?? '',
    description: dept.description ?? '',
    head: dept.head ?? '',
    status: dept.status ?? 'active',
    icon: dept.icon ?? iconForCode(dept.code),
    color: dept.color ?? hashColor(dept.name),
    headcount: dept.headcount ?? '—',
    budget: dept.budget ?? '—',
    createdAt: dept.createdAt ?? null,
    updatedAt: dept.updatedAt ?? null,
  }
}

async function _fetchEmployeeCounts(): Promise<Record<number, number>> {
  try {
    const employees = await empApi.listEmployees()
    const counts: Record<number, number> = {}
    for (const emp of employees) {
      const id = emp.department_id
      if (id != null) counts[id] = (counts[id] ?? 0) + 1
    }
    return counts
  } catch {
    return {}
  }
}

export async function listDepartments(filters: DepartmentFilters = {}): Promise<DepartmentView[]> {
  try {
    const [data, counts] = await Promise.all([
      api.listDepartments(filters),
      _fetchEmployeeCounts(),
    ])
    return data.map(d => ({ ...toFrontend(d), headcount: counts[d.id] ?? 0 }))
  } catch (err: any) {
    if (err.status) throw err
    const mockDepts: DepartmentView[] = [
      { id: 1, name: 'Engineering', code: 'ENG', description: 'Engineering Dept', head: 'Alice', status: 'active', icon: '💻', color: hashColor('Engineering'), headcount: 10, budget: '$1M', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 2, name: 'Sales', code: 'SAL', description: 'Sales Dept', head: 'Bob', status: 'inactive', icon: '🤝', color: hashColor('Sales'), headcount: 5, budget: '$500K', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
    ]
    let res = mockDepts
    if (filters.status) res = res.filter(d => d.status === filters.status)
    return res
  }
}

export async function getDepartment(id: number | string): Promise<DepartmentView | null> {
  try {
    const data = await api.getDepartment(id)
    return toFrontend(data)
  } catch (err: any) {
    if (err.status) throw err
    return { id: Number(id) || 1, name: 'Engineering', code: 'ENG', description: 'Engineering Dept', head: 'Alice', status: 'active', icon: '💻', color: hashColor('Engineering'), headcount: 10, budget: '$1M', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
  }
}

export async function createDepartment(data: Partial<DepartmentPayload>): Promise<DepartmentView> {
  try {
    const res = await api.createDepartment(data)
    return toFrontend(res)
  } catch (err: any) {
    if (err.status) throw err
    return { id: Date.now(), name: data.name || 'MockDept', code: data.code || 'MOCK', description: data.description || '', head: data.head || '', status: data.status || 'active', icon: '💻', color: hashColor(data.name || 'MockDept'), headcount: 0, budget: '—', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
  }
}

export async function updateDepartment(id: number | string, data: Partial<DepartmentPayload>): Promise<DepartmentView> {
  try {
    const res = await api.updateDepartment(id, data)
    return toFrontend(res)
  } catch (err: any) {
    if (err.status) throw err
    return { id: Number(id) || 1, name: data.name || 'UpdatedMock', code: data.code || 'MOCK', description: data.description || '', head: data.head || '', status: data.status || 'active', icon: '💻', color: hashColor(data.name || 'UpdatedMock'), headcount: 10, budget: '—', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
  }
}

export async function deleteDepartment(id: number | string): Promise<void> {
  try {
    await api.deleteDepartment(id)
  } catch (err: any) {
    if (err.status) throw err
  }
}
