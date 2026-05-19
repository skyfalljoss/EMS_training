import { api } from './request'
import type { AuditLogEntry } from '../types/audit'

export function listAuditLogs(limit = 10, outcome?: string): Promise<AuditLogEntry[]> {
  return api.get<AuditLogEntry[]>('/audit/logs', { params: { limit, outcome } })
}
