import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as authApi from '../api/auth'
import * as employeesApi from '../api/employees'

const AUTH_USERS_KEY = 'auth-users'

export function useAuthUsersList(options?: Record<string, unknown>) {
  return useQuery({
    queryKey: [AUTH_USERS_KEY, 'list'],
    queryFn: () => authApi.listAuthUsers(),
    ...options,
  })
}

export function useCreateAuthUser() {
  const qc = useQueryClient() 
  return useMutation({
    mutationFn: ({ employeeId, email, password, role }: { employeeId: number; email: string; password: string; role: string }) =>
      authApi.createAuthUser(employeeId, email, password, role as Parameters<typeof authApi.updateAuthUserRole>[1]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [AUTH_USERS_KEY, 'list'] })
    },
  })
}

export function useEmployeesListForAdmin() {
  return useQuery({
    queryKey: ['employees', 'list', 'admin'],
    queryFn: () => employeesApi.listEmployees(),
  })
}

export function useActivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => authApi.activateAuthUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [AUTH_USERS_KEY, 'list'] })
    },
  })
}

export function useRejectUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => authApi.rejectAuthUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [AUTH_USERS_KEY, 'list'] })
    },
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      authApi.updateAuthUserRole(userId, role as Parameters<typeof authApi.updateAuthUserRole>[1]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [AUTH_USERS_KEY, 'list'] })
    },
  })
}
