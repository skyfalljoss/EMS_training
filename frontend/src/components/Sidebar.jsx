import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { listEmployees } from '../services/employeeService'
import { listAuthUsers } from '../api/auth'
import { useAuth } from '../hooks/useAuth'

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [empCount, setEmpCount] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let active = true
    listEmployees().then(data => {
      if (active) setEmpCount(data.length)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (user?.role !== 'admin') return
    let active = true
    let timer
    const load = () => {
      listAuthUsers()
        .then(data => {
          if (active) setPendingCount((data || []).filter(u => !u.is_active).length)
        })
        .catch(() => {})
    }
    load()
    timer = setInterval(load, 30000)
    return () => { active = false; clearInterval(timer) }
  }, [user])
  return (
    <nav className={`sidebar${open ? ' open' : ''}`} onClick={onClose}>
      <div className="logo" onClick={e => e.stopPropagation()}>
        <div className="logo-icon">CB</div>
        
        CitiBanks
      </div>
      <ul className="nav-items" onClick={e => e.stopPropagation()}>
        <li><NavLink to="/dashboard" className={({isActive}) => isActive ? 'active' : ''}>
          <svg className="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="7" height="7" rx="1"/><rect x="11" y="2" width="7" height="7" rx="1"/><rect x="2" y="11" width="7" height="7" rx="1"/><rect x="11" y="11" width="7" height="7" rx="1"/></svg>
          Dashboard
        </NavLink></li>
        <li><NavLink to="/employees" className={({isActive}) => isActive ? 'active' : ''}>
          <svg className="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 17v-2a3 3 0 00-3-3H5a3 3 0 00-3 3v2"/><circle cx="7.5" cy="5.5" r="3"/><path d="M18 17v-2a3 3 0 00-2-2.87"/><path d="M13 5.5a3 3 0 010 5.82"/></svg>
          Employees
          <span className="badge">{empCount !== null ? empCount.toLocaleString() : '...'}</span>
        </NavLink></li>
        <li><NavLink to="/departments" className={({isActive}) => isActive ? 'active' : ''}>
          <svg className="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3l-7 5v9h14V8l-7-5z"/><path d="M7 14h6"/><path d="M7 10h6"/></svg>
          Departments
        </NavLink></li>
        <li><NavLink to="/leave" className={({isActive}) => isActive ? 'active' : ''}>
          <svg className="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="14" height="14" rx="2"/><path d="M3 8h14"/><path d="M7 2v3"/><path d="M13 2v3"/></svg>
          Leave
          <span className="badge">12</span>
        </NavLink></li>
        {user?.role !== 'employee' && (
          <li><NavLink to="/payroll" className={({isActive}) => isActive ? 'active' : ''}>
            <svg className="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 8h16"/><circle cx="10" cy="12" r="2"/></svg>
            Payroll
          </NavLink></li>
        )}
        {user?.role === 'admin' && (
          <li><NavLink to="/admin/users" className={({isActive}) => isActive ? 'active' : ''}>
            <svg className="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l-4 4"/><path d="M5 11l4 4"/><circle cx="17" cy="6" r="3"/><path d="M14 14l2-3 3 3"/></svg>
            Users
            {pendingCount > 0 && (
              <span className="badge" style={{background:'var(--danger)',color:'#fff'}}>{pendingCount}</span>
            )}
          </NavLink></li>
        )}
      </ul>
      <div className="sidebar-footer">
        <div className="avatar">
          {user?.email ? user.email[0].toUpperCase() : '?'}
        </div>
        <div className="info">
          <div className="name">{user?.email?.split('@')[0] || 'User'}</div>
          <div className="role">{user?.role || '—'}</div>
        </div>
        <button className="logout-btn" onClick={() => { logout(); navigate('/login', { replace: true }) }}>
          Logout
        </button>
      </div>
    </nav>
  )
}
