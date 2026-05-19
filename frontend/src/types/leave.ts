export interface PendingLeave {
  name: string
  dept: string
  from: string
  type: string
}

export interface LeaveBalance {
  type: string
  used: number
  total: number
  color: string
}
