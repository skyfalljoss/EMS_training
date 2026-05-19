import { useNavigate } from 'react-router-dom'
import { useEmployeesList } from '../hooks/useEmployeesQuery'
import { useDepartmentsList } from '../hooks/useDepartmentsQuery'
import { useAuditLogs } from '../hooks/useAuditQuery'

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  if (diff < 172800000) return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function newestName(items: { id: number; name: string }[]): string | undefined {
  if (!items.length) return undefined
  return items.reduce((a, b) => (a.id > b.id ? a : b)).name
}

function describeAction(
  action: string,
  resourceType: string,
  detail: string,
  resourceId: string | null,
  nameLookup: Map<number, string>,
  newest?: string,
): { text: string; name: string | null } {
  if (action === 'LOGIN') return { text: 'logged in', name: null }
  if (action === 'REGISTER') return { text: 'registered', name: null }
  if (action === 'CHANGE_PASSWORD') return { text: 'changed password', name: null }

  if (detail?.includes('/activate')) return { text: 'activated', name: 'user' }
  if (detail?.includes('/reject')) return { text: 'rejected', name: 'user' }
  if (detail?.includes('/deactivate')) return { text: 'deactivated', name: 'user' }

  const resource: Record<string, string> = {
    employee: 'employee',
    department: 'department',
    auth: 'user',
    audit: 'audit log',
  }
  const label = resource[resourceType] ?? resourceType
  const name = resourceId ? nameLookup.get(Number(resourceId)) : (action === 'CREATE' ? newest : undefined)

  const verb = action === 'CREATE' ? 'created' : action === 'UPDATE' ? 'updated' : action === 'DELETE' ? 'deleted' : action.toLowerCase()
  return { text: `${verb} ${label}`, name: name ?? null }
}


export default function Dashboard() {
  const navigate = useNavigate()
  const { data: employees = [] } = useEmployeesList()
  const { data: departments = [] } = useDepartmentsList()
  const { data: auditLogs = [] } = useAuditLogs(5, 'success')

  const totalEmployees = employees.length
  const activeNow = employees.filter(e => e.status === 'active').length
  const onLeave = employees.filter(e => e.status === 'on_leave' || e.status === 'on-leave').length
  const terminated = employees.filter(e => e.status === 'terminated').length

  const employeeNameMap = new Map(employees.map(e => [e.id, e.name]))
  const departmentNameMap = new Map(departments.map(d => [d.id, d.name]))
  const nameLookup = (resourceType: string) =>
    resourceType === 'department' ? departmentNameMap : employeeNameMap
  const newestEmployee = newestName(employees)
  const newestDepartment = newestName(departments)

  const maxHeadcount = Math.max(1, ...departments.map(d => Number(d.headcount) || 0))

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card glass-card">
          <div className="kpi-label">Total Employees</div>
          <div className="kpi-value">{totalEmployees.toLocaleString()}</div>
          <div className="kpi-trend up">Active: {activeNow}<span className="kpi-trend down">Terminated: {terminated}</span></div>
        </div>
        <div className="kpi-card glass-card">
          <div className="kpi-label">Active Now</div>
          <div className="kpi-value">{activeNow.toLocaleString()}</div>
          <div className="kpi-trend up">{((activeNow / (totalEmployees || 1)) * 100).toFixed(0)}%<span className="kpi-sub">of total workforce</span></div>
        </div>
        <div className="kpi-card glass-card">
          <div className="kpi-label">On Leave</div>
          <div className="kpi-value">{onLeave}</div>
          <div className="kpi-trend down">{((onLeave / (totalEmployees || 1)) * 100).toFixed(1)}%<span className="kpi-sub">of total workforce</span></div>
        </div>
        {/* <div className="kpi-card glass-card">
          <div className="kpi-label">Open Positions</div>
          <div className="kpi-value">—</div>
          <div className="kpi-trend up"><span className="kpi-sub">tracking coming soon</span></div>
        </div> */}
      </div>

      <div className="dashboard-grid">
        <div className="glass-card chart-card">
          <div className="card-header"><h2>Department Headcount</h2></div>
          {departments.length === 0 ? (
            <div className="empty-state">No departments found</div>
          ) : (
            <div className="chart-bars chart-bars-lg">
              {departments.map(d => (
                <div key={d.id} className="chart-bar-group">
                  <div className="chart-value">
                    {Number(d.headcount) || 0}
                  </div>
                  <div
                    className="chart-bar"
                    style={{ height: `${((Number(d.headcount) || 0) / maxHeadcount) * 100}%` }}
                  />
                  <div className="chart-label">{d.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card">
          <div className="card-header"><h2>Recent Activity</h2></div>
          {auditLogs.length === 0 ? (
            <div className="empty-state">No recent activity</div>
          ) : (
            auditLogs.map(log => {
              const desc = describeAction(log.action, log.resource_type, log.detail ?? '', log.resource_id, nameLookup(log.resource_type), log.resource_type === 'department' ? newestDepartment : newestEmployee)
              return (
                <div key={log.id} className="activity-item">
                  <div className="activity-dot arc" />
                  <div className="activity-body">
                    <div className="activity-text">
                      <strong>{log.employee_name ?? log.user_email ?? 'System'}</strong> {desc.text}{desc.name ? <strong>{` ${desc.name}`}</strong> : null}
                    </div>
                    <div className="activity-time">{formatTimestamp(log.timestamp)}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="glass-card">
          <div className="card-header"><h2>Quick Actions</h2></div>
          <div className="quick-action-grid">
            <div className="quick-action-card" onClick={() => navigate('/employees')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              <span className="quick-action-label">Add Employee</span>
            </div>
            {/* <div className="quick-action-card" onClick={() => navigate('/leave')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
              <span className="quick-action-label">Approve Leave</span>
            </div> */}
            {/* <div className="quick-action-card">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
              <span className="quick-action-label">Generate Report</span>
            </div> */}
          </div>
        </div>
      </div>
    </>
  )
}
