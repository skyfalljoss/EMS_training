// Single source of truth for employee status values & display labels.
// Values must match the backend `EmploymentStatus` enum
// (see backend/app/models/employee.py).

import type { EmployeeStatus } from '../types/employee'

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  on_leave: 'On Leave',
  terminated: 'Terminated',
}

export const EMPLOYEE_STATUSES: string[] = Object.keys(EMPLOYEE_STATUS_LABELS)

export function employeeStatusLabel(status: EmployeeStatus | string): string {
  return EMPLOYEE_STATUS_LABELS[status] ?? status
}
