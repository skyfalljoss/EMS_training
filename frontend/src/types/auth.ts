export type Role = 'admin' | 'manager' | 'employee'

export interface JwtPayload {
  sub: string
  exp: number
  iat?: number
  must_change_password?: boolean
  [key: string]: unknown
}

export interface AuthUser {
  id?: number
  sub?: string
  email?: string
  auth_role?: Role
  role?: Role
  employee_id?: number
  is_active?: boolean
  must_change_password?: boolean
  last_login?: string | null
  created_at?: string | null
  [key: string]: unknown
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface RegisterResponse {
  id: number
  email: string
  auth_role: Role
  is_active: boolean
}

export interface AuthUserAdmin {
  id: number
  email: string
  employee_id: number
  auth_role: Role
  is_active: boolean
  must_change_password?: boolean
  last_login?: string | null
  created_at?: string | null
}
