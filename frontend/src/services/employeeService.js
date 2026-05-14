import * as api from '../api/employees'
import * as deptApi from '../api/departments'
import mockEmployees from '../data/employees'

let _nextId = 100
let _mockData = [...mockEmployees]

const COLORS = ['#0c2961','#1a3a6b','#2a4a7b','#0a1a3b','#3a5a8b','#4a6a9b','#5a7aab','#6a8abb']

function hashColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

function formatSalary(n) {
  if (n === null || n === undefined) return '—'
  return '$' + Number(n).toLocaleString('en-US')
}

function formatRating(n) {
  if (n === null || n === undefined) return '—'
  return Number(n).toFixed(1) + '/5.0'
}

function formatDate(d) {
  if (!d) return '—'
  const s = typeof d === 'string' ? d : String(d)
  return s.slice(0, 10)
}

function toFrontend(emp) {
  return {
    id: emp.id,
    name: emp.name,
    email: emp.email,
    dept: emp.department || emp.dept || '',
    department_id: emp.department_id ?? null,
    role: emp.role,
    status: emp.status || 'active',
    start: formatDate(emp.start_date || emp.start),
    color: emp.color || hashColor(emp.name),
    phone: emp.phone || '—',
    location: emp.location || '—',
    manager: emp.manager || '—',
    salary: formatSalary(emp.salary),
    rating: formatRating(emp.rating),
    date_of_birth: formatDate(emp.date_of_birth),
    national_id: emp.national_id || '—',
  }
}

export async function listEmployees(filters = {}) {
  try {
    const data = await api.listEmployees(filters)
    const depts = await deptApi.listDepartments().catch(() => [])
    const deptMap = {}
    for (const d of depts) deptMap[d.id] = d.name
    return data.map(e => {
      const fe = toFrontend(e)
      if (e.department_id && deptMap[e.department_id]) fe.dept = deptMap[e.department_id]
      return fe
    })
  } catch {
    let list = [..._mockData]
    if (filters.status) list = list.filter(e => e.status === filters.status)
    if (filters.department) list = list.filter(e => e.dept === filters.department)
    if (filters.department_id) list = list.filter(e => e.department_id === Number(filters.department_id))
    if (filters.role) list = list.filter(e => e.role === filters.role)
    if (filters.name) {
      const q = filters.name.toLowerCase()
      list = list.filter(e => e.name.toLowerCase().includes(q) || e.dept.toLowerCase().includes(q) || e.role.toLowerCase().includes(q))
    }
    return list
  }
}

export async function getEmployee(id) {
  try {
    const data = await api.getEmployee(id)
    return toFrontend(data)
  } catch {
    const emp = _mockData.find(e => e.id === Number(id))
    return emp ? toFrontend(emp) : null
  }
}

export async function createEmployee(data) {
  try {
    const res = await api.createEmployee(data)
    return toFrontend(res)
  } catch {
    const emp = { ...data, id: _nextId++, dept: data.department || '', department_id: data.department_id, start: data.start_date || '—' }
    _mockData.push(emp)
    return toFrontend(emp)
  }
}

export async function updateEmployee(id, data) {
  try {
    const res = await api.updateEmployee(id, data)
    return toFrontend(res)
  } catch {
    const idx = _mockData.findIndex(e => e.id === Number(id))
    if (idx === -1) throw new Error('Employee not found')
    const emp = _mockData[idx]
    const updated = { ...emp, ...data, department: data.department || emp.dept, department_id: data.department_id ?? emp.department_id, start_date: data.start_date || emp.start }
    _mockData[idx] = updated
    return toFrontend(updated)
  }
}

export async function deleteEmployee(id) {
  try {
    await api.deleteEmployee(id)
  } catch {
    const idx = _mockData.findIndex(e => e.id === Number(id))
    if (idx === -1) throw new Error('Employee not found')
    _mockData.splice(idx, 1)
  }
}
