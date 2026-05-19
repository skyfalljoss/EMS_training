import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
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
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [DEPARTMENTS_KEY, 'list'] })
      const previous = qc.getQueryData([DEPARTMENTS_KEY, 'list', {}])
      qc.setQueryData([DEPARTMENTS_KEY, 'list', {}], (old: unknown) =>
        Array.isArray(old) ? old.filter((d: { id: number }) => d.id !== Number(id)) : [],
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData([DEPARTMENTS_KEY, 'list', {}], context.previous)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY, 'list'] })
    },
  })
}

export function prefetchDepartmentsList(queryClient: QueryClient, filters?: DepartmentFilters) {
  return queryClient.prefetchQuery({
    queryKey: [DEPARTMENTS_KEY, 'list', filters ?? {}],
    queryFn: () => departmentService.listDepartments(filters),
    staleTime: 30_000,
  })
}
