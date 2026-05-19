import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../api/request', () => ({
  api: mockApi,
}))

import * as authApi from '../api/auth'
import type { LoginResponse, RegisterResponse, AuthUserAdmin, AuthUser } from '../types/auth'

describe('auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('calls POST /auth/login with email and password', async () => {
      const mockResponse: LoginResponse = { access_token: 'token123', token_type: 'bearer' }
      mockApi.post.mockResolvedValue(mockResponse)

      const result = await authApi.login('admin@test.com', 'password123')

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@test.com',
        password: 'password123',
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('register', () => {
    it('calls POST /auth/register with name, email, password', async () => {
      const mockResponse: RegisterResponse = { id: 1, email: 'new@test.com', auth_role: 'employee', is_active: false }
      mockApi.post.mockResolvedValue(mockResponse)

      const result = await authApi.register('New User', 'new@test.com', 'pass123')

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', {
        name: 'New User',
        email: 'new@test.com',
        password: 'pass123',
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('changePassword', () => {
    it('calls PUT /auth/password with old and new passwords', async () => {
      const mockResponse: LoginResponse = { access_token: 'new-token', token_type: 'bearer' }
      mockApi.put.mockResolvedValue(mockResponse)

      const result = await authApi.changePassword('oldPass', 'newPass')

      expect(mockApi.put).toHaveBeenCalledWith('/auth/password', {
        old_password: 'oldPass',
        new_password: 'newPass',
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('createAuthUser', () => {
    it('calls POST /auth/users with employee data', async () => {
      const mockResponse: AuthUserAdmin = { id: 1, employee_id: 42, email: 'emp@test.com', auth_role: 'employee', is_active: true }
      mockApi.post.mockResolvedValue(mockResponse)

      const result = await authApi.createAuthUser(42, 'emp@test.com', 'pass123', 'employee')

      expect(mockApi.post).toHaveBeenCalledWith('/auth/users', {
        employee_id: 42,
        email: 'emp@test.com',
        password: 'pass123',
        auth_role: 'employee',
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('listAuthUsers', () => {
    it('calls GET /auth/users', async () => {
      const mockResponse: AuthUserAdmin[] = [
        { id: 1, employee_id: 42, email: 'a@test.com', auth_role: 'admin', is_active: true },
      ]
      mockApi.get.mockResolvedValue(mockResponse)

      const result = await authApi.listAuthUsers()

      expect(mockApi.get).toHaveBeenCalledWith('/auth/users')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('activateAuthUser', () => {
    it('calls PUT /auth/users/:id/activate', async () => {
      const mockResponse: AuthUserAdmin = { id: 1, employee_id: 42, email: 'a@test.com', auth_role: 'employee', is_active: true }
      mockApi.put.mockResolvedValue(mockResponse)

      const result = await authApi.activateAuthUser(1)

      expect(mockApi.put).toHaveBeenCalledWith('/auth/users/1/activate')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('rejectAuthUser', () => {
    it('calls DELETE /auth/users/:id', async () => {
      mockApi.delete.mockResolvedValue(undefined)

      const result = await authApi.rejectAuthUser(5)

      expect(mockApi.delete).toHaveBeenCalledWith('/auth/users/5')
      expect(result).toBeUndefined()
    })
  })

  describe('updateAuthUserRole', () => {
    it('calls PUT /auth/users/:id/role with new role', async () => {
      const mockResponse: AuthUserAdmin = { id: 1, employee_id: 42, email: 'a@test.com', auth_role: 'manager', is_active: true }
      mockApi.put.mockResolvedValue(mockResponse)

      const result = await authApi.updateAuthUserRole(1, 'manager')

      expect(mockApi.put).toHaveBeenCalledWith('/auth/users/1/role', { auth_role: 'manager' })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getMe', () => {
    it('calls GET /auth/me', async () => {
      const mockResponse: AuthUser = { sub: '1', email: 'admin@test.com', role: 'admin' }
      mockApi.get.mockResolvedValue(mockResponse)

      const result = await authApi.getMe()

      expect(mockApi.get).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual(mockResponse)
    })
  })
})
