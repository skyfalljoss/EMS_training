import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError } from '../types/api'
import type { DepartmentApi } from '../types/department'

vi.mock('../api/departments', () => ({
  listDepartments: vi.fn(),
  getDepartment: vi.fn(),
  createDepartment: vi.fn(),
  updateDepartment: vi.fn(),
  deleteDepartment: vi.fn(),
}))

vi.mock('../api/employees', () => ({
  listEmployees: vi.fn(),
}))

import * as deptApi from '../api/departments'
import * as empApi from '../api/employees'
import * as deptService from '../services/departmentService'

describe('departmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listDepartments', () => {
    it('returns transformed departments from API', async () => {
      const mockDepts: DepartmentApi[] = [
        { id: 1, name: 'Engineering', code: 'ENG', status: 'active' },
        { id: 2, name: 'Design', code: 'DES', status: 'active' },
      ]
      vi.mocked(deptApi.listDepartments).mockResolvedValue(mockDepts)
      vi.mocked(empApi.listEmployees).mockResolvedValue([])

      const result = await deptService.listDepartments()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ id: 1, name: 'Engineering', code: 'ENG' })
      expect(result[0]).toHaveProperty('headcount')
    })

    it('falls back to mock data on network error', async () => {
      vi.mocked(deptApi.listDepartments).mockRejectedValue(new TypeError('Failed to fetch'))

      const result = await deptService.listDepartments()

      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('name')
      expect(result[0]).toHaveProperty('code')
    })

    it('filters mock data by status on fallback', async () => {
      vi.mocked(deptApi.listDepartments).mockRejectedValue(new TypeError('Failed to fetch'))

      const result = await deptService.listDepartments({ status: 'active' })

      result.forEach(d => expect(d.status).toBe('active'))
    })

    it('does not fallback on ApiError — re-throws', async () => {
      vi.mocked(deptApi.listDepartments).mockRejectedValue(new ApiError('Forbidden', 403))

      await expect(deptService.listDepartments()).rejects.toThrow(ApiError)
    })
  })

  describe('getDepartment', () => {
    it('returns transformed department from API', async () => {
      const mockDept: DepartmentApi = { id: 1, name: 'Engineering', code: 'ENG', status: 'active' }
      vi.mocked(deptApi.getDepartment).mockResolvedValue(mockDept)

      const result = await deptService.getDepartment(1)

      expect(result).toMatchObject({ id: 1, name: 'Engineering' })
    })

    it('returns null when API 404s', async () => {
      vi.mocked(deptApi.getDepartment).mockRejectedValue(new ApiError('Not found', 404))

      await expect(deptService.getDepartment(999)).rejects.toThrow(ApiError)
    })

    it('falls back to mock data on network error', async () => {
      vi.mocked(deptApi.getDepartment).mockRejectedValue(new TypeError('Network error'))

      const result = await deptService.getDepartment(1)

      expect(result).not.toBeNull()
      expect(result).toHaveProperty('name')
    })
  })

  describe('createDepartment', () => {
    it('returns created department from API', async () => {
      const payload = { name: 'New Dept', code: 'NEW' }
      const mockResponse: DepartmentApi = { id: 99, ...payload, status: 'active' }
      vi.mocked(deptApi.createDepartment).mockResolvedValue(mockResponse)

      const result = await deptService.createDepartment(payload)

      expect(result).toMatchObject({ id: 99, name: 'New Dept' })
    })

    it('falls back to mock on network error', async () => {
      vi.mocked(deptApi.createDepartment).mockRejectedValue(new TypeError('Failed'))

      const result = await deptService.createDepartment({ name: 'MockDept' })

      expect(result).toHaveProperty('id')
      expect(result.name).toBe('MockDept')
    })
  })

  describe('updateDepartment', () => {
    it('returns updated department from API', async () => {
      const payload = { name: 'Updated Dept' }
      const mockResponse: DepartmentApi = { id: 1, name: 'Updated Dept', code: 'OLD', status: 'active' }
      vi.mocked(deptApi.updateDepartment).mockResolvedValue(mockResponse)

      const result = await deptService.updateDepartment(1, payload)

      expect(result).toMatchObject({ id: 1, name: 'Updated Dept' })
    })

    it('falls back to mock on network error', async () => {
      vi.mocked(deptApi.updateDepartment).mockRejectedValue(new TypeError('Failed'))

      const result = await deptService.updateDepartment(1, { name: 'UpdatedMock' })

      expect(result.name).toBe('UpdatedMock')
    })
  })

  describe('deleteDepartment', () => {
    it('calls API delete', async () => {
      vi.mocked(deptApi.deleteDepartment).mockResolvedValue(undefined)

      await deptService.deleteDepartment(1)

      expect(deptApi.deleteDepartment).toHaveBeenCalledWith(1)
    })

    it('falls back to mock on network error', async () => {
      vi.mocked(deptApi.deleteDepartment).mockRejectedValue(new TypeError('Failed'))

      await expect(deptService.deleteDepartment(1)).resolves.toBeUndefined()
    })

    it('re-throws ApiError', async () => {
      vi.mocked(deptApi.deleteDepartment).mockRejectedValue(new ApiError('Forbidden', 403))

      await expect(deptService.deleteDepartment(1)).rejects.toThrow(ApiError)
    })
  })
})
