import * as api from '../api/departments'
import * as empApi from '../api/employees'
import mockDepartments from '../data/departments'

let _nextId = 100
let _mockData = [...mockDepartments]

const COLORS = ['#0c2961','#1a3a6b','#2a4a7b','#0a1a3b','#3a5a8b','#4a6a9b','#5a7aab','#6a8abb']
const DEPT_ICONS = {
  IT: '💻', HR: '👥', FIN: '💰', MKT: '📊',
  RETAIL: '🏦', CORP: '🏛️', RISK: '🛡️', WEALTH: '📈',
  COMPLIANCE: '⚖️', OPS: '⚙️', DEV: '🔧', SALES: '🤝',
  SUPPORT: '🎧', LEGAL: '⚖️', ADMIN: '📋',
}

function hashColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

function iconForCode(code) {
  return DEPT_ICONS[code?.toUpperCase()] || '🏢'
}

function toFrontend(dept) {
  return {
    id: dept.id,
    name: dept.name,
    code: dept.code || '',
    description: dept.description || '',
    head: dept.head || '',
    status: dept.status || 'active',
    icon: dept.icon || iconForCode(dept.code),
    color: dept.color || hashColor(dept.name),
    headcount: dept.headcount ?? '—',
    budget: dept.budget || '—',
    createdAt: dept.createdAt || null,
    updatedAt: dept.updatedAt || null,
  }
}

async function _fetchEmployeeCounts() {
  try {
    const employees = await empApi.listEmployees()
    const counts = {}
    for (const emp of employees) {
      const id = emp.department_id
      if (id != null) counts[id] = (counts[id] || 0) + 1
    }
    return counts
  } catch (err) {
    if (err.status) throw err
    return {}
  }
}

export async function listDepartments(filters = {}) {
  try {
    const [data, counts] = await Promise.all([
      api.listDepartments(filters),
      _fetchEmployeeCounts(),
    ])
    return data.map(d => ({ ...toFrontend(d), headcount: counts[d.id] ?? 0 }))
  } catch (err) {
    if (err.status) throw err
    let list = [..._mockData]
    if (filters.status) list = list.filter(d => d.status === filters.status)
    return list.map(toFrontend)
  }
}

export async function getDepartment(id) {
  try {
    const data = await api.getDepartment(id)
    return toFrontend(data)
  } catch (err) {
    if (err.status) throw err
    const dept = _mockData.find(d => d.id === Number(id))
    return dept ? toFrontend(dept) : null
  }
}

export async function createDepartment(data) {
  try {
    const res = await api.createDepartment(data)
    return toFrontend(res)
  } catch (err) {
    if (err.status) throw err
    const dept = { ...data, id: _nextId++ }
    _mockData.push(dept)
    return toFrontend(dept)
  }
}

export async function updateDepartment(id, data) {
  try {
    const res = await api.updateDepartment(id, data)
    return toFrontend(res)
  } catch (err) {
    if (err.status) throw err
    const idx = _mockData.findIndex(d => d.id === Number(id))
    if (idx === -1) throw new Error('Department not found')
    const updated = { ..._mockData[idx], ...data }
    _mockData[idx] = updated
    return toFrontend(updated)
  }
}

export async function deleteDepartment(id) {
  try {
    await api.deleteDepartment(id)
  } catch (err) {
    if (err.status) throw err
    const idx = _mockData.findIndex(d => d.id === Number(id))
    if (idx === -1) throw new Error('Department not found')
    _mockData.splice(idx, 1)
  }
}
