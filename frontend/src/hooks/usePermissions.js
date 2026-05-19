import { useAuth } from './useAuth'

/**
 * Centralized UI permission checks. Mirrors the backend policy:
 *  - everyone can read & create employees / departments
 *  - manager + admin can update
 *  - only admin can delete
 *
 * The backend is still the source of truth — these flags only control
 * whether the buttons are shown / enabled.
 */
export function usePermissions() {
  const { user } = useAuth()
  const role = user?.role
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
