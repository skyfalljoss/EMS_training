import { useState, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import TweaksPanel from './components/TweaksPanel'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import EmployeeProfile from './pages/EmployeeProfile'
import DepartmentProfile from './pages/DepartmentProfile'
import Departments from './pages/Departments'
import Leave from './pages/Leave'
import Payroll from './pages/Payroll'
import './styles/design.css'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('omnibank-theme') || 'light'
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('omnibank-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <>
      <div className="bg-canvas">
        <div className="bg-blob b1"></div>
        <div className="bg-blob b2"></div>
        <div className="bg-blob b3"></div>
        <div className="bg-blob b4"></div>
      </div>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main">
        <TopBar
          onMenuToggle={() => setSidebarOpen(prev => !prev)}
          searchValue={searchValue}
          onSearchChange={e => setSearchValue(e.target.value)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <div className="screens">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/employees/:id" element={<EmployeeProfile />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/departments/:id" element={<DepartmentProfile />} />
            <Route path="/leave" element={<Leave />} />
            <Route path="/payroll" element={<Payroll />} />
          </Routes>
        </div>
      </div>
      <TweaksPanel />
    </>
  )
}
