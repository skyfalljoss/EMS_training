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

import * as deptApi from '../api/departments'
import type { DepartmentApi, DepartmentFilters } from '../types/department'

function dept(overrides: Partial<DepartmentApi> = {}): DepartmentApi {
  return { id: 1, name: '', status: 'active', ...overrides }
}

describe('departments API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listDepartments', () => {
    it('calls GET /departments without filters', async () => {
      const mockData = [dept({ id: 1, name: 'Engineering', code: 'ENG' })]
      mockApi.get.mockResolvedValue(mockData)

      const result = await deptApi.listDepartments()

      expect(mockApi.get).toHaveBeenCalledWith('/departments', { params: {} })
      expect(result).toEqual(mockData)
    })

    it('passes filters as query params and strips empty values', async () => {
      const filters: DepartmentFilters = { status: 'active' }
      mockApi.get.mockResolvedValue([])

      await deptApi.listDepartments(filters)

      expect(mockApi.get).toHaveBeenCalledWith('/departments', {
        params: { status: 'active' },
      })
    })
  })

  describe('getDepartment', () => {
    it('calls GET /departments/:id', async () => {
      const mockData = dept({ id: 1, name: 'Engineering', code: 'ENG' })
      mockApi.get.mockResolvedValue(mockData)

      const result = await deptApi.getDepartment(1)

      expect(mockApi.get).toHaveBeenCalledWith('/departments/1')
      expect(result).toEqual(mockData)
    })
  })

  describe('createDepartment', () => {
    it('calls POST /departments with data', async () => {
      const payload = { name: 'Design', code: 'DES' }
      const mockResponse = dept({ id: 3, ...payload })
      mockApi.post.mockResolvedValue(mockResponse)

      const result = await deptApi.createDepartment(payload)

      expect(mockApi.post).toHaveBeenCalledWith('/departments', payload)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('updateDepartment', () => {
    it('calls PUT /departments/:id with data', async () => {
      const payload = { name: 'Design Team' }
      const mockResponse = dept({ id: 3, name: 'Design Team', code: 'DES' })
      mockApi.put.mockResolvedValue(mockResponse)

      const result = await deptApi.updateDepartment(3, payload)

      expect(mockApi.put).toHaveBeenCalledWith('/departments/3', payload)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('deleteDepartment', () => {
    it('calls DELETE /departments/:id', async () => {
      mockApi.delete.mockResolvedValue(undefined)

      const result = await deptApi.deleteDepartment(3)

      expect(mockApi.delete).toHaveBeenCalledWith('/departments/3')
      expect(result).toBeUndefined()
    })
  })
})
