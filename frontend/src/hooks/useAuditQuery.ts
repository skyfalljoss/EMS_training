import { useQuery } from '@tanstack/react-query'
import * as auditApi from '../api/audit'
import { isApiError } from '../types/api'

const AUDIT_KEY = 'audit'

export function useAuditLogs(limit = 10, outcome?: string) {
  return useQuery({
    queryKey: [AUDIT_KEY, 'logs', limit, outcome],
    queryFn: async () => {
      try {
        return await auditApi.listAuditLogs(limit, outcome)
      } catch (err) {
        if (isApiError(err)) throw err
        return []
      }
    },
  })
}
