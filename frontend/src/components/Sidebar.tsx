import { memo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthUsersList } from '../hooks/useAuthQuery'
import { useEmployeesList, prefetchEmployeesList } from '../hooks/useEmployeesQuery'
import { prefetchDepartmentsList } from '../hooks/useDepartmentsQuery'
import { useAuth } from '../hooks/useAuth'

interface Props {
  open: boolean
  onClose: () => void
}

export default memo(function Sidebar({ open, onClose }: Props) {
  const queryClient = useQueryClient()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: employees = [] } = useEmployeesList()

  const { data: authUsers = [] } = useAuthUsersList({
    enabled: user?.role === 'admin',
    refetchInterval: 30_000,
    staleTime: 0,
  })

  const empCount = employees.length
  const pendingCount = authUsers.filter((u: { is_active: boolean }) => !u.is_active).length

  const currentEmployee = employees.find(emp => emp.id === user?.employee_id)
  const displayName = currentEmployee?.name || user?.email?.split('@')[0] || 'User'
  const displayInitial = currentEmployee?.name?.[0]?.toUpperCase() ?? 
    user?.email?.[0]?.toUpperCase() ?? '?'
  return (
    <nav className={`sidebar${open ? ' open' : ''}`} onClick={onClose}>
      <div className="logo" onClick={e => e.stopPropagation()}>
        <div className="logo-icon">CB</div>
        EMS
      </div>
      <ul className="nav-items" onClick={e => e.stopPropagation()}>
        <li><NavLink to="/dashboard" className={({isActive}) => isActive ? 'active' : ''}>
          <svg className="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="7" height="7" rx="1"/><rect x="11" y="2" width="7" height="7" rx="1"/><rect x="2" y="11" width="7" height="7" rx="1"/><rect x="11" y="11" width="7" height="7" rx="1"/></svg>
          Dashboard
        </NavLink></li>
        <li><NavLink
          to="/employees"
          className={({isActive}) => isActive ? 'active' : ''}
          onMouseEnter={() => prefetchEmployeesList(queryClient)}
        >
          <svg className="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 17v-2a3 3 0 00-3-3H5a3 3 0 00-3 3v2"/><circle cx="7.5" cy="5.5" r="3"/><path d="M18 17v-2a3 3 0 00-2-2.87"/><path d="M13 5.5a3 3 0 010 5.82"/></svg>
          Employees
          <span className="badge">{empCount.toLocaleString()}</span>
        </NavLink></li>
        <li><NavLink
          to="/departments"
          className={({isActive}) => isActive ? 'active' : ''}
          onMouseEnter={() => prefetchDepartmentsList(queryClient)}
        >
          <svg className="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3l-7 5v9h14V8l-7-5z"/><path d="M7 14h6"/><path d="M7 10h6"/></svg>
          Departments
        </NavLink></li>
        {/* <li><NavLink to="/leave" className={({isActive}) => isActive ? 'active' : ''}>
          <svg className="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="14" height="14" rx="2"/><path d="M3 8h14"/><path d="M7 2v3"/><path d="M13 2v3"/></svg>
          Leave
          <span className="badge">12</span>
        </NavLink></li> */}
        {user?.role === 'admin' && (
          <li><NavLink to="/admin/users" className={({isActive}) => isActive ? 'active' : ''}>
            <svg className="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l-4 4"/><path d="M5 11l4 4"/><circle cx="17" cy="6" r="3"/><path d="M14 14l2-3 3 3"/></svg>
            Users
            {pendingCount > 0 && (
              <span className="badge">{pendingCount}</span>
            )}
          </NavLink></li>
        )}
      </ul>
      <div className="sidebar-footer">
        <div 
          className="avatar"
          onClick={() => currentEmployee && navigate(`/employees/${currentEmployee.id}`)}
          style={{ cursor: currentEmployee ? 'pointer' : 'default' }}
        >
          {displayInitial}
        </div>
        <div 
          className="info"
          onClick={() => currentEmployee && navigate(`/employees/${currentEmployee.id}`)}
          style={{ cursor: currentEmployee ? 'pointer' : 'default' }}
        >
          <div className="name">{displayName}</div>
          <div className="role">{user?.role ?? '—'}</div>
        </div>
        <button className="logout-btn" onClick={() => { logout(); navigate('/login', { replace: true }) }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </nav>
  )
})
