import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as departmentService from '../services/departmentService'
import type { DepartmentFilters } from '../types/department'

const DEPARTMENTS_KEY = 'departments'

export function useDepartmentsList(filters?: DepartmentFilters) {
  return useQuery({
    queryKey: [DEPARTMENTS_KEY, 'list', filters ?? {}],
    queryFn: () => departmentService.listDepartments(filters),
  })
}

export function useDepartmentDetail(id: number | string) {
  return useQuery({
    queryKey: [DEPARTMENTS_KEY, id],
    queryFn: () => departmentService.getDepartment(id),
    enabled: !!id,
  })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof departmentService.createDepartment>[0]) =>
      departmentService.createDepartment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY, 'list'] })
    },
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Parameters<typeof departmentService.updateDepartment>[1] }) =>
      departmentService.updateDepartment(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY, 'list'] })
      qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY, id] })
    },
  })
}

export function useDeleteDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => departmentService.deleteDepartment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY, 'list'] })
    },
  })
}
