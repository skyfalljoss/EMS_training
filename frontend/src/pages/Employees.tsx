import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmployeesList } from '../hooks/useEmployeesQuery'
import EmployeeFormModal from '../components/EmployeeFormModal'
import { usePermissions } from '../hooks/usePermissions'
import { employeeStatusLabel } from '../constants/employeeStatus'

export default function Employees() {
  const navigate = useNavigate()
  const { canCreate } = usePermissions()
  const [filter, setFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const { data: employees = [] } = useEmployeesList(
    filter !== 'all' ? { status: filter } : undefined,
  )

  return (
    <>
      <div className="glass-card">
        <div className="card-header">
          <div className="filter-row" style={{marginBottom:0}}>
            {['all','active','inactive','on-leave','terminated'].map(f => (
              <span key={f} className={`filter-pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'on-leave' ? 'On Leave' : f.charAt(0).toUpperCase() + f.slice(1)}
              </span>
            ))}
          </div>
          {canCreate && (
            <span className="action" onClick={() => setFormOpen(true)}>+ Add Employee</span>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>Status</th><th>Start Date</th></tr></thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:'center',padding:24,color:'var(--muted)'}}>No employees found</td></tr>
              ) : (
                employees.map(e => (
                  <tr key={e.id} style={{cursor:'pointer'}} onClick={() => navigate(`/employees/${e.id}`)}>
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
      </div>

      <EmployeeFormModal
        key={formOpen ? 'new' : 'closed'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </>
  )
}
