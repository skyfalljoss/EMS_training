import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmployeesList } from '../hooks/useEmployeesQuery'
import { useDepartmentsList } from '../hooks/useDepartmentsQuery'
import EmployeeFormModal from '../components/EmployeeFormModal'
import { usePermissions } from '../hooks/usePermissions'
import { employeeStatusLabel } from '../constants/employeeStatus'

export default function Employees() {
  const navigate = useNavigate()
  const { canCreate } = usePermissions()
  const [filter, setFilter] = useState<string>('all')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 8

  const { data: employees = [] } = useEmployeesList(
    filter !== 'all' ? { status: filter } : undefined,
  )
  const { data: departments = [] } = useDepartmentsList()

  const displayedEmployees = useMemo(() => {
    return employees.filter(e => 
      (deptFilter === 'all' || e.dept === deptFilter) &&
      (e.name.toLowerCase().includes(search.toLowerCase()) || 
       e.email.toLowerCase().includes(search.toLowerCase()))
    )
  }, [employees, deptFilter, search])

  const totalPages = Math.max(1, Math.ceil(displayedEmployees.length / pageSize))
  const paginatedEmployees = displayedEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handlePrev = () => setCurrentPage(p => Math.max(1, p - 1))
  const handleNext = () => setCurrentPage(p => Math.min(totalPages, p + 1))

  return (
    <>
      <div className="glass-card">
        <div className="card-header">
          <div className="filter-row mb-0">
            {['all','active','inactive','on-leave','terminated'].map(f => (
              <span 
                key={f} 
                className={`filter-pill${filter === f ? ' active' : ''}`} 
                onClick={() => {
                  setFilter(f)
                  setCurrentPage(1)
                }}
              >
                {f === 'all' ? 'All' : f === 'on-leave' ? 'On Leave' : f.charAt(0).toUpperCase() + f.slice(1)}
              </span>
            ))}
          </div>
          <div className="table-search-bar">
            <select 
              value={deptFilter} 
              onChange={e => {
                setDeptFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="table-search-select"
            >
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <div className="search-box filter-search" style={{ margin: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input 
                type="text" 
                placeholder="Search employees..." 
                value={search} 
                onChange={e => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }} 
              />
            </div>
          </div>
          {canCreate && (
            <span className="action" onClick={() => setFormOpen(true)}>+ Add Employee</span>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>Status</th><th>Start Date</th></tr></thead>
            <tbody>
              {paginatedEmployees.length === 0 ? (
                <tr><td colSpan={5} className="no-data">No employees found</td></tr>
              ) : (
                paginatedEmployees.map(e => (
                  <tr key={e.id} className="cursor-pointer" onClick={() => navigate(`/employees/${e.id}`)}>
                    <td>
                      <div className="emp-cell">
                        <div className="emp-avatar" style={{background:e.color}}>{e.name.split(' ').map(n => n[0]).join('')}</div>
                        <div><div className="emp-name">{e.name}</div><div className="emp-email">{e.email}</div></div>
                      </div>
                    </td>
                    <td>{e.dept}</td>
                    <td>{e.role}</td>
                    <td><span className={`status-pill ${e.status}`}>{employeeStatusLabel(e.status)}</span></td>
                    <td>{e.start}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, displayedEmployees.length)} of {displayedEmployees.length} employees
            </div>
            <div className="pagination-controls">
              <button className="page-btn" disabled={currentPage === 1} onClick={handlePrev}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Prev
              </button>
              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                  Math.max(0, Math.min(currentPage - 3, totalPages - 5)),
                  Math.max(5, Math.min(currentPage + 2, totalPages))
                ).map(pageNum => (
                  <button 
                    key={pageNum} 
                    className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
              <button className="page-btn" disabled={currentPage === totalPages} onClick={handleNext}>
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <EmployeeFormModal
        key={formOpen ? 'new' : 'closed'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </>
  )
}
