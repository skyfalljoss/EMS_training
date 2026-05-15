import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listEmployees } from '../services/employeeService'
import EmployeeFormModal from '../components/EmployeeFormModal'

const statusLabel = {
  active: 'Active',
  remote: 'Remote',
  'on-leave': 'On Leave',
  terminated: 'Terminated',
}

export default function Employees() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [employees, setEmployees] = useState([])
  const [formOpen, setFormOpen] = useState(false)

  const fetch = useCallback(() => {
    let active = true
    listEmployees({ status: filter !== 'all' ? filter : undefined }).then(data => {
      if (active) setEmployees(data)
    })
    return () => { active = false }
  }, [filter])

  useEffect(fetch, [fetch])

  return (
    <>
      <div className="glass-card">
        <div className="card-header">
          <div className="filter-row" style={{marginBottom:0}}>
            {['all','active','remote','on-leave','terminated'].map(f => (
              <span key={f} className={`filter-pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'on-leave' ? 'On Leave' : f.charAt(0).toUpperCase() + f.slice(1)}
              </span>
            ))}
          </div>
          <span className="action" onClick={() => setFormOpen(true)}>+ Add Employee</span>
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
                    <td><span className={`status-pill ${e.status}`}>{statusLabel[e.status] || e.status}</span></td>
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
        onSaved={fetch}
      />
    </>
  )
}
