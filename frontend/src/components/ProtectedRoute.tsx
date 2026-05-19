import type { Location } from 'react-router-dom'
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'

interface Props {
  children: ReactNode
}

export default function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation() as Location

  if (loading) return null
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
