import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'

interface Props {
  children: ReactNode
}

export default function GuestRoute({ children }: Props) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return null
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}
