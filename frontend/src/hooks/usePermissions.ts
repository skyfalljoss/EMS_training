import { useAuth } from './useAuth'
import type { Role } from '../types/auth'

export interface Permissions {
  role: Role | undefined
  isAdmin: boolean
  isManager: boolean
  isEmployee: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canManageUsers: boolean
}

/**
 * Centralized UI permission checks. Mirrors the backend policy:
 *  - everyone can read & create employees / departments
 *  - manager + admin can update
 *  - only admin can delete
 *
 * The backend is still the source of truth — these flags only control
 * whether the buttons are shown / enabled.
 */
export function usePermissions(): Permissions {
  const { user } = useAuth()
  const role = user?.role as Role | undefined
  const isAdmin = role === 'admin'
  const isManager = role === 'manager'
  const isEmployee = role === 'employee'

  return {
    role,
    isAdmin,
    isManager,
    isEmployee,
    canCreate: !!role,
    canUpdate: isAdmin || isManager,
    canDelete: isAdmin,
    canManageUsers: isAdmin,
  }
}
