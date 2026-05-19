export interface AuditLogEntry {
  id: number
  user_id: number | null
  user_email: string | null
  user_role: string | null
  employee_name: string | null
  department_name: string | null
  action: string
  resource_type: string
  resource_id: string | null
  outcome: string
  detail: string | null
  timestamp: string
}
