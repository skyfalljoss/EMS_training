import { api } from './request'
import type {
  AuthUser,
  AuthUserAdmin,
  LoginResponse,
  RegisterResponse,
  Role,
} from '../types/auth'

export function login(email: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/login', { email, password })
}

export function register(
  name: string,
  email: string,
  password: string,
): Promise<RegisterResponse> {
  return api.post<RegisterResponse>('/auth/register', { name, email, password })
}

export function changePassword(
  old_password: string,
  new_password: string,
): Promise<LoginResponse> {
  return api.put<LoginResponse>('/auth/password', { old_password, new_password })
}

export function createAuthUser(
  employee_id: number,
  email: string,
  password: string,
  auth_role: Role,
): Promise<AuthUserAdmin> {
  return api.post<AuthUserAdmin>('/auth/users', { employee_id, email, password, auth_role })
}

export function listAuthUsers(): Promise<AuthUserAdmin[]> {
  return api.get<AuthUserAdmin[]>('/auth/users')
}

export function activateAuthUser(user_id: number): Promise<AuthUserAdmin> {
  return api.put<AuthUserAdmin>(`/auth/users/${user_id}/activate`)
}

export function rejectAuthUser(user_id: number): Promise<unknown> {
  return api.delete(`/auth/users/${user_id}`)
}

export function updateAuthUserRole(
  user_id: number,
  auth_role: Role,
): Promise<AuthUserAdmin> {
  return api.put<AuthUserAdmin>(`/auth/users/${user_id}/role`, { auth_role })
}

export function getMe(): Promise<AuthUser> {
  return api.get<AuthUser>('/auth/me')
}
