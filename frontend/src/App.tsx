import { lazy, useState, useEffect, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import TweaksPanel from './components/TweaksPanel'
import './styles/design.css'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ChangePassword = lazy(() => import('./pages/ChangePassword'))
const CreateUser = lazy(() => import('./pages/CreateUser'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Employees = lazy(() => import('./pages/Employees'))
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'))
const Departments = lazy(() => import('./pages/Departments'))
const DepartmentProfile = lazy(() => import('./pages/DepartmentProfile'))
const Leave = lazy(() => import('./pages/Leave'))

type Theme = 'light' | 'dark'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('omnibank-theme') as Theme | null) ?? 'light'
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
          <Suspense fallback={null}>
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
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
      {!isAuthPage && <TweaksPanel />}
    </div>
  )
}
