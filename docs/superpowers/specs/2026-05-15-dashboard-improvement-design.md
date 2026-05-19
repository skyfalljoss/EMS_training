# Dashboard Improvement Design

**Date:** 2026-05-15
**Status:** Approved

## Summary

Replace the hardcoded mock-data dashboard with a live dashboard that fetches real data from existing backend APIs. Add pure CSS/SVG charts (no library dependencies) and a service layer that aggregates employee, department, and audit log data. Write a companion backend suggestion file for a future dedicated `/dashboard/stats` endpoint and audit log wiring.

## Architecture

### Dependency flow

```
Dashboard.jsx
  └─ useEffect → dashboardService.js
       ├─ GET /employees          → compute KPIs + headcount + role dist + hires
       ├─ GET /departments        → map department_id → name for headcount
       └─ GET /audit/logs?limit=5 → recent activity feed
```

No backend changes needed for the initial frontend work. Data aggregation happens client-side in `dashboardService.js`.

### Role-awareness

| Role | Employee scope | Department scope | Activity scope |
|------|---------------|-----------------|----------------|
| Admin | All employees | All departments | All audit logs |
| Manager | Filtered by their department_id | Their department only | Their department's logs |
| Employee | Personal (own record) | Their department name | Own logs only |

The frontend knows the user's role + employee_id from `AuthContext` and applies client-side filtering since the backend currently returns all records for all roles.

## Layout

```
Row 1 ┌─────────┬──────────┬───────────┬──────────────┐
      │ Total   │ Active   │ On Leave  │ New Hires    │
      │ Employees│ Now      │           │ (30d)        │
      └─────────┴──────────┴───────────┴──────────────┘

Row 2 ┌──────────────────────────────────────────────────┐
      │    Department Headcount (bar chart, full width)  │
      └──────────────────────────────────────────────────┘

Row 3 ┌─────────────────────────┬────────────────────────┐
      │  Role Distribution     │ Monthly Hire Trend     │
      │  (donut chart)         │ (line chart)           │
      └─────────────────────────┴────────────────────────┘

Row 4 ┌─────────────────────────┬────────────────────────┐
      │  Recent Activity       │ Quick Actions          │
      │  (audit logs)          │ (unchanged)            │
      └─────────────────────────┴────────────────────────┘
```

## Sections Detail

### KPI Row — 4 cards

| Card | Data source | Manager scope | Employee scope |
|------|------------|---------------|----------------|
| Total Employees | `employees.length` | Filtered by dept | `—` |
| Active Now | `emp.status === 'active'` | Filtered by dept | `—` |
| On Leave | `emp.status === 'on_leave'` | Filtered by dept | `—` |
| New Hires (30d) | `start_date >= today - 30d` | Filtered by dept | `—` |

### Department Headcount (bar chart)

- Reuse existing `.chart-bars` CSS
- Group employees by `department_id`
- Map IDs to names from departments API
- Bar height = `(count / maxCount) * 100%`
- Empty state: "No data"
- Colors: use the existing `COLORS` palette

### Role Distribution (donut chart)

- New inline SVG `<DonutChart>` component
- `employees.reduce` by `role` field
- SVG `stroke-dasharray` / `stroke-dashoffset` circles
- Legend below: role name + count + color dot
- Empty state: "No data"

### Monthly Hire Trend (line chart)

- New inline SVG `<LineChart>` component
- Group employees by month from `start_date` (last 12 months)
- SVG `<polyline>` with scaled coordinates
- X-axis: abbreviated month labels (Jan, Feb...)
- Y-axis: ticks at 0, max/2, max
- Dots at each data point
- Empty state: "No data"

### Recent Activity

- From `GET /audit/logs?limit=5`
- Map `action` + `resource_type` + `timestamp` + `detail`
- Color dots: CREATE=success(green), UPDATE=warn(orange), DELETE=danger(red)
- Format: `"Admin created employee #5"` (derived from user_email + action + resource_type + resource_id)
- Empty state: "No recent activity"
- Not available: show `—`

### Quick Actions

- Unchanged from current implementation
- Navigate to /employees, /leave, /payroll

## Chart Components

Pure SVG, no external dependencies. Co-located in `Dashboard.jsx`.

### DonutChart
```jsx
<DonutChart data={[{ label, value, color }]} size={160} />
```
- One `<circle>` per segment
- Computes circumference, dasharray, dashoffset
- Center text shows total count
- Legend rendered below

### LineChart  
```jsx
<LineChart data={[{ label, value }]} width={400} height={160} />
```
- Computes x/y scales from data bounds
- `<polyline>` for the line, `<circle>` for dots
- Axes with labels
- Responsive via `viewBox`

## New / Modified Files

### New files
| File | Purpose |
|------|---------|
| `src/services/dashboardService.js` | Aggregates 3 APIs, computes KPIs |
| `src/api/audit.js` | `listAuditLogs()` wrapper |

### Modified files
| File | Changes |
|------|---------|
| `src/pages/Dashboard.jsx` | Full rewrite: live data, charts, loading states |
| `src/styles/design.css` | +40 lines: skeleton, donut, line chart styles |

### Backend suggestion file (separate)
| File | Purpose |
|------|---------|
| `docs/dashboard-api-suggestion.md` | Recommends audit wiring + stats endpoint |

## Error / Loading / Empty States

| State | KPI cards | Charts | Activity |
|-------|-----------|--------|----------|
| Loading | CSS skeleton shimmer | Skeleton placeholder | Skeleton rows |
| API failure (fallback) | Mock data | Mock data | "No recent activity" |
| Empty (no records) | Shows `0` | "No data" state | "No recent activity" |
| Missing backend field | Shows `—` | "No data" | `—` |

## Backend Suggestion Summary

The companion file `docs/dashboard-api-suggestion.md` recommends:

1. **Audit logging helper** — `app/controllers/_audit_helper.py` with `log_audit()` function
2. **Wire audit logs** — EmployeeController, DepartmentController, AuthController log all mutations
3. **Seed audit data** — `app/data/sample_audit_logs.py` + update `seed.py`
4. **New `GET /dashboard/stats`** — single aggregation pipeline endpoint
5. **New Permission** — `DASHBOARD_READ` added to Permission enum and ROLE_PERMISSIONS

See `docs/dashboard-api-suggestion.md` for full details.
