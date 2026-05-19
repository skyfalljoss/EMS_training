import * as api from '../api/departments'
import * as empApi from '../api/employees'
import type {
  DepartmentApi,
  DepartmentFilters,
  DepartmentPayload,
  DepartmentView,
} from '../types/department'


const COLORS = ['#0c2961','#1a3a6b','#2a4a7b','#0a1a3b','#3a5a8b','#4a6a9b','#5a7aab','#6a8abb']
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
  } catch (err) {
    return {}
  }
}

export async function listDepartments(
  filters: DepartmentFilters = {},
): Promise<DepartmentView[]> {

    const [data, counts] = await Promise.all([
      api.listDepartments(filters),
      _fetchEmployeeCounts(),
    ])
    return data.map(d => ({ ...toFrontend(d), headcount: counts[d.id] ?? 0 }))
  }

export async function getDepartment(
  id: number | string,
): Promise<DepartmentView | null> {

    const data = await api.getDepartment(id)
    return toFrontend(data)
  }

export async function createDepartment(
  data: Partial<DepartmentPayload>,
): Promise<DepartmentView> {

    const res = await api.createDepartment(data)
    return toFrontend(res)
  }

export async function updateDepartment(
  id: number | string,
  data: Partial<DepartmentPayload>,
): Promise<DepartmentView> {

    const res = await api.updateDepartment(id, data)
    return toFrontend(res)
  }

export async function deleteDepartment(id: number | string): Promise<void> {

    await api.deleteDepartment(id)
  }
