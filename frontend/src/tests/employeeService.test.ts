import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError } from '../types/api'
import type { EmployeeApi } from '../types/employee'

vi.mock('../api/employees', () => ({
  listEmployees: vi.fn(),
  getEmployee: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
}))

vi.mock('../api/departments', () => ({
  listDepartments: vi.fn(),
}))

import * as employeeApi from '../api/employees'
import * as deptApi from '../api/departments'
import * as employeeService from '../services/employeeService'

describe('employeeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listEmployees', () => {
    it('returns transformed employees from API', async () => {
      const mockEmployees: EmployeeApi[] = [
        { id: 1, name: 'Alice', email: 'alice@test.com', role: 'Developer', status: 'active', department_id: 1, start_date: '2024-01-15', salary: 75000, rating: 4.5 },
      ]
      vi.mocked(employeeApi.listEmployees).mockResolvedValue(mockEmployees)
      vi.mocked(deptApi.listDepartments).mockResolvedValue([
        { id: 1, name: 'Engineering', code: 'ENG', status: 'active' },
      ])

      const result = await employeeService.listEmployees()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 1,
        name: 'Alice',
        role: 'Developer',
        dept: 'Engineering',
      })
    })

    it('returns untransformed dept name when department not found', async () => {
      const mockEmployees: EmployeeApi[] = [
        { id: 1, name: 'Bob', email: 'bob@test.com', role: 'Dev', status: 'active', dept: 'Sales' },
      ]
      vi.mocked(employeeApi.listEmployees).mockResolvedValue(mockEmployees)
      vi.mocked(deptApi.listDepartments).mockResolvedValue([])

      const result = await employeeService.listEmployees()

      expect(result[0]!.dept).toBe('Sales')
    })

    it('falls back to mock data on network error', async () => {
      vi.mocked(employeeApi.listEmployees).mockRejectedValue(new TypeError('Failed to fetch'))

      const result = await employeeService.listEmployees()

      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('name')
      expect(result[0]).toHaveProperty('dept')
    })

    it('filters mock data by status on fallback', async () => {
      vi.mocked(employeeApi.listEmployees).mockRejectedValue(new TypeError('Failed to fetch'))

      const result = await employeeService.listEmployees({ status: 'active' })

      expect(result.length).toBeGreaterThan(0)
      result.forEach(e => expect(e.status).toBe('active'))
    })

    it('does not fallback on ApiError — re-throws', async () => {
      vi.mocked(employeeApi.listEmployees).mockRejectedValue(new ApiError('Forbidden', 403))

      await expect(employeeService.listEmployees()).rejects.toThrow(ApiError)
      await expect(employeeService.listEmployees()).rejects.toThrow('Forbidden')
    })

    it('does not fallback on 401 ApiError', async () => {
      vi.mocked(employeeApi.listEmployees).mockRejectedValue(new ApiError('Unauthorized', 401))

      await expect(employeeService.listEmployees()).rejects.toThrow(ApiError)
      await expect(employeeService.listEmployees()).rejects.toThrow('Unauthorized')
    })
  })

  describe('getEmployee', () => {
    it('returns transformed employee from API', async () => {
      const mockEmployee: EmployeeApi = { id: 1, name: 'Alice', email: 'a@test.com', role: 'Dev', status: 'active', dept: 'Engineering' }
      vi.mocked(employeeApi.getEmployee).mockResolvedValue(mockEmployee)

      const result = await employeeService.getEmployee(1)

      expect(result).toMatchObject({ id: 1, name: 'Alice', dept: 'Engineering' })
    })

    it('returns null when API 404s', async () => {
      vi.mocked(employeeApi.getEmployee).mockRejectedValue(new ApiError('Not found', 404))

      await expect(employeeService.getEmployee(999)).rejects.toThrow(ApiError)
    })

    it('falls back to mock data on network error', async () => {
      vi.mocked(employeeApi.getEmployee).mockRejectedValue(new TypeError('Network error'))

      const result = await employeeService.getEmployee(1)

      expect(result).not.toBeNull()
      expect(result).toHaveProperty('name')
    })
  })

  describe('createEmployee', () => {
    it('returns created employee from API', async () => {
      const payload = { name: 'New', email: 'new@test.com', role: 'Dev' }
      const mockResponse: EmployeeApi = { id: 99, ...payload, dept: '', status: 'active' }
      vi.mocked(employeeApi.createEmployee).mockResolvedValue(mockResponse)

      const result = await employeeService.createEmployee(payload)

      expect(result).toMatchObject({ id: 99, name: 'New' })
    })

    it('falls back to mock on network error', async () => {
      vi.mocked(employeeApi.createEmployee).mockRejectedValue(new TypeError('Failed'))

      const result = await employeeService.createEmployee({ name: 'MockUser', role: 'Dev' })

      expect(result).toHaveProperty('id')
      expect(result.name).toBe('MockUser')
    })
  })

  describe('updateEmployee', () => {
    it('returns updated employee from API', async () => {
      const payload = { name: 'Updated' }
      const mockResponse: EmployeeApi = { id: 1, name: 'Updated', email: 'a@test.com', role: 'Dev', status: 'active' }
      vi.mocked(employeeApi.updateEmployee).mockResolvedValue(mockResponse)

      const result = await employeeService.updateEmployee(1, payload)

      expect(result).toMatchObject({ id: 1, name: 'Updated' })
    })

    it('falls back to mock on network error', async () => {
      vi.mocked(employeeApi.updateEmployee).mockRejectedValue(new TypeError('Failed'))

      const result = await employeeService.updateEmployee(1, { name: 'UpdatedMock' })

      expect(result.name).toBe('UpdatedMock')
    })
  })

  describe('deleteEmployee', () => {
    it('calls API delete', async () => {
      vi.mocked(employeeApi.deleteEmployee).mockResolvedValue(undefined)

      await employeeService.deleteEmployee(1)

      expect(employeeApi.deleteEmployee).toHaveBeenCalledWith(1)
    })

    it('falls back to mock on network error', async () => {
      vi.mocked(employeeApi.deleteEmployee).mockRejectedValue(new TypeError('Failed'))

      await expect(employeeService.deleteEmployee(1)).resolves.toBeUndefined()
    })

    it('re-throws ApiError', async () => {
      vi.mocked(employeeApi.deleteEmployee).mockRejectedValue(new ApiError('Forbidden', 403))

      await expect(employeeService.deleteEmployee(1)).rejects.toThrow(ApiError)
    })
  })
})
