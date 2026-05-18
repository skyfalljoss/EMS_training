import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as employeeService from '../services/employeeService'
import type { EmployeeFilters } from '../types/employee'

const EMPLOYEES_KEY = 'employees'

export function useEmployeesList(filters?: EmployeeFilters) {
  return useQuery({
    queryKey: [EMPLOYEES_KEY, 'list', filters ?? {}],
    queryFn: () => employeeService.listEmployees(filters),
  })
}

export function useEmployeeDetail(id: number | string) {
  return useQuery({
    queryKey: [EMPLOYEES_KEY, id],
    queryFn: () => employeeService.getEmployee(id),
    enabled: !!id,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof employeeService.createEmployee>[0]) =>
      employeeService.createEmployee(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY, 'list'] })
    },
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Parameters<typeof employeeService.updateEmployee>[1] }) =>
      employeeService.updateEmployee(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY, 'list'] })
      qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY, id] })
    },
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => employeeService.deleteEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY, 'list'] })
    },
  })
}
