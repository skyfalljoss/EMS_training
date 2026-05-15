import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const titles = {
  dashboard: 'Dashboard',
  employees: 'Employees',
  departments: 'Departments',
  leave: 'Leave',
  payroll: 'Payroll',
}

export default function TopBar({ onMenuToggle, searchValue, onSearchChange, theme, onToggleTheme }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const segment = location.pathname.split('/')[1] || 'dashboard'
  const title = titles[segment] || 'Dashboard'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="hamburger" onClick={onMenuToggle}>
          <span></span><span></span><span></span>
        </div>
        <div>
          <div className="breadcrumb">OmniBank / <span>{title}</span></div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" placeholder="Search employees..." value={searchValue} onChange={onSearchChange} />
        </div>
        <div className="topbar-user">
          <span className="topbar-email">{user?.email || ''}</span>
          <button className="topbar-btn logout-btn-topbar" onClick={handleLogout} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
        <button className="topbar-btn" onClick={onToggleTheme} title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          )}
        </button>
      </div>
    </header>
  )
}
