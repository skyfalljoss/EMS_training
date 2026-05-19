import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEmployeesList } from '../hooks/useEmployeesQuery'
import { useDepartmentsList } from '../hooks/useDepartmentsQuery'

const titles: Record<string, string> = {
  dashboard: 'Dashboard',
  employees: 'Employees',
  departments: 'Departments',
  leave: 'Leave',
}

interface Props {
  onMenuToggle: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function TopBar({
  onMenuToggle,
  theme,
  onToggleTheme,
}: Props) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [searchValue, setSearchValue] = useState('')
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const { data: employees = [] } = useEmployeesList()
  const { data: departments = [] } = useDepartmentsList()

  const currentEmployee = employees.find(emp => emp.id === user?.employee_id)
  const displayName = currentEmployee?.name || user?.email || ''

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const empMatches = searchValue.trim() === '' ? [] : employees.filter(emp =>
    emp.name.toLowerCase().includes(searchValue.toLowerCase()) || 
    emp.email.toLowerCase().includes(searchValue.toLowerCase())
  ).slice(0, 4)

  const deptMatches = searchValue.trim() === '' ? [] : departments.filter(dept =>
    dept.name.toLowerCase().includes(searchValue.toLowerCase())
  ).slice(0, 4)

  function handleSelect(path: string) {
    setSearchValue('')
    setShowResults(false)
    navigate(path)
  }

  const segment = location.pathname.split('/')[1] || 'dashboard'
  const title = titles[segment] ?? 'Dashboard'

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
          <div className="breadcrumb">EMS / <span>{title}</span></div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="search-container" ref={searchRef}>
          <div className="search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input 
              type="text" 
              placeholder="Search ..." 
              value={searchValue} 
              onChange={e => {
                setSearchValue(e.target.value)
                setShowResults(true)
              }}
              onFocus={() => setShowResults(true)}
            />
          </div>
          {showResults && searchValue.trim() !== '' && (
            <div className="search-dropdown">
              {(empMatches.length > 0 || deptMatches.length > 0) ? (
                <>
                  {empMatches.length > 0 && (
                    <div className="search-dropdown-section">Employees</div>
                  )}
                  {empMatches.map(emp => (
                    <div 
                      key={`emp-${emp.id}`} 
                      onClick={() => handleSelect(`/employees/${emp.id}`)}
                      className="search-dropdown-item"
                    >
                      <span className="search-item-title">{emp.name}</span>
                      <span className="search-item-subtitle">{emp.email} (Dept #{emp.department_id})</span>
                    </div>
                  ))}
                  {deptMatches.length > 0 && (
                    <div className="search-dropdown-section">Departments</div>
                  )}
                  {deptMatches.map(dept => (
                    <div 
                      key={`dept-${dept.id}`} 
                      onClick={() => handleSelect(`/departments/${dept.id}`)}
                      className="search-dropdown-item"
                    >
                      <span className="search-item-title">{dept.name}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="search-dropdown-empty">
                  No matches found.
                </div>
              )}
            </div>
          )}
        </div>
        <div className="topbar-user">
          <span 
            className="topbar-email"
            style={{ cursor: currentEmployee ? 'pointer' : 'default' }}
            onClick={() => currentEmployee && navigate(`/employees/${currentEmployee.id}`)}
          >
            {displayName}
          </span>
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
