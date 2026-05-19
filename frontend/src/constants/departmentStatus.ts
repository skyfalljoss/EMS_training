// Single source of truth for department status values & display labels.
// Values must match the backend Department status set
// (see backend/app/models/department.py).

import type { DepartmentStatus } from '../types/department'

export const DEPARTMENT_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
}

export const DEPARTMENT_STATUSES: string[] = Object.keys(DEPARTMENT_STATUS_LABELS)

export function departmentStatusLabel(status: DepartmentStatus | string): string {
  return DEPARTMENT_STATUS_LABELS[status] ?? status
}
