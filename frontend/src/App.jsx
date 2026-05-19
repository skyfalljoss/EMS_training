import { useState, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ChangePassword from './pages/ChangePassword'
import CreateUser from './pages/CreateUser'
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('omnibank-theme') || 'light'
  })
  const location = useLocation()
  const authPaths = ['/login', '/register', '/change-password']
  const isAuthPage = authPaths.includes(location.pathname)

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
    <div className="app">
      <div className="bg-blobs">
        <div className="bg-blob b1"></div>
        <div className="bg-blob b2"></div>
        <div className="bg-blob b3"></div>
        <div className="bg-blob b4"></div>
      </div>
      {!isAuthPage && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      <div className={isAuthPage ? "auth-layout" : "main"}>
        {!isAuthPage && <TopBar
          onMenuToggle={() => setSidebarOpen(prev => !prev)}
          searchValue={searchValue}
          onSearchChange={e => setSearchValue(e.target.value)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />}
        <div className="screens">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><CreateUser /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
            <Route path="/employees/:id" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
            <Route path="/departments" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
            <Route path="/departments/:id" element={<ProtectedRoute><DepartmentProfile /></ProtectedRoute>} />
            <Route path="/leave" element={<ProtectedRoute><Leave /></ProtectedRoute>} />
            <Route path="/payroll" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
      {!isAuthPage && <TweaksPanel />}
    </div>
  )
}
