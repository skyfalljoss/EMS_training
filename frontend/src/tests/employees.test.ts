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

import * as employeeApi from '../api/employees'
import type { EmployeeApi, EmployeeFilters } from '../types/employee'

function emp(overrides: Partial<EmployeeApi> = {}): EmployeeApi {
  return { id: 1, name: '', email: '', role: '', status: 'active', ...overrides }
}

describe('employees API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listEmployees', () => {
    it('calls GET /employees without filters', async () => {
      const mockData = [emp({ id: 1, name: 'Alice', email: 'alice@test.com', role: 'Developer' })]
      mockApi.get.mockResolvedValue(mockData)

      const result = await employeeApi.listEmployees()

      expect(mockApi.get).toHaveBeenCalledWith('/employees', { params: {} })
      expect(result).toEqual(mockData)
    })

    it('passes filters as query params', async () => {
      const filters: EmployeeFilters = { status: 'active', role: 'Developer' }
      mockApi.get.mockResolvedValue([])

      await employeeApi.listEmployees(filters)

      expect(mockApi.get).toHaveBeenCalledWith('/employees', {
        params: { status: 'active', role: 'Developer' },
      })
    })

    it('strips undefined, null, and empty string filter values', async () => {
      const filters: EmployeeFilters = {
        status: 'active',
        role: undefined,
        name: '',
      }
      mockApi.get.mockResolvedValue([])

      await employeeApi.listEmployees(filters)

      expect(mockApi.get).toHaveBeenCalledWith('/employees', {
        params: { status: 'active' },
      })
    })

    it('sends department_id as number', async () => {
      const filters: EmployeeFilters = { department_id: 3 }
      mockApi.get.mockResolvedValue([])

      await employeeApi.listEmployees(filters)

      expect(mockApi.get).toHaveBeenCalledWith('/employees', {
        params: { department_id: 3 },
      })
    })
  })

  describe('getEmployee', () => {
    it('calls GET /employees/:id with number', async () => {
      const mockData = emp({ id: 1, name: 'Alice', email: 'a@test.com', role: 'Dev' })
      mockApi.get.mockResolvedValue(mockData)

      const result = await employeeApi.getEmployee(1)

      expect(mockApi.get).toHaveBeenCalledWith('/employees/1')
      expect(result).toEqual(mockData)
    })

    it('calls GET /employees/:id with string id', async () => {
      mockApi.get.mockResolvedValue({ id: 1 })

      await employeeApi.getEmployee('42')

      expect(mockApi.get).toHaveBeenCalledWith('/employees/42')
    })
  })

  describe('createEmployee', () => {
    it('calls POST /employees with data', async () => {
      const payload = { name: 'Bob', email: 'bob@test.com', role: 'Designer' }
      const mockResponse = emp({ id: 2, ...payload })
      mockApi.post.mockResolvedValue(mockResponse)

      const result = await employeeApi.createEmployee(payload)

      expect(mockApi.post).toHaveBeenCalledWith('/employees', payload)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('updateEmployee', () => {
    it('calls PUT /employees/:id with data', async () => {
      const payload = { name: 'Bob Updated' }
      const mockResponse = emp({ id: 2, name: 'Bob Updated', email: 'bob@test.com', role: 'Designer' })
      mockApi.put.mockResolvedValue(mockResponse)

      const result = await employeeApi.updateEmployee(2, payload)

      expect(mockApi.put).toHaveBeenCalledWith('/employees/2', payload)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('deleteEmployee', () => {
    it('calls DELETE /employees/:id', async () => {
      mockApi.delete.mockResolvedValue(null)

      const result = await employeeApi.deleteEmployee(3)

      expect(mockApi.delete).toHaveBeenCalledWith('/employees/3')
      expect(result).toBeNull()
    })
  })
})
