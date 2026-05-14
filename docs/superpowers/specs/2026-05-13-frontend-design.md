# EMS Frontend — React + Vite

## Goal

Build a simple SPA that displays and interacts with the EMS backend API.

## Stack

- **React 18** with **Vite** build tool
- **react-router-dom** for client-side routing
- Plain CSS (no framework)

## Layout

Top navigation bar with "Employees" link. Content renders below.

## Pages & Components

```
src/
├── main.jsx                       # Entry point
├── App.jsx                        # Router + Top Nav layout
├── App.css                        # Global styles
├── api/
│   └── employees.js               # API call helpers (fetch wrapper)
├── pages/
│   ├── EmployeeList.jsx           # Table + search/filter + delete
│   └── EmployeeForm.jsx           # Create & Edit (shared form)
└── components/
    ├── Navbar.jsx                 # Top nav bar
    ├── EmployeeTable.jsx          # Table rows with edit/delete actions
    └── ConfirmModal.jsx           # Delete confirmation dialog
```

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | Redirect | Redirects to `/employees` |
| `/employees` | EmployeeList | List, filter, delete |
| `/employees/new` | EmployeeForm | Create employee |
| `/employees/:id/edit` | EmployeeForm | Edit employee |

## API Integration

All calls go to `http://localhost:8000` (FastAPI backend).

Functions in `api/employees.js`:
- `listEmployees(filters)` → `GET /employees?department=&role=&name=`
- `getEmployee(id)` → `GET /employees/{id}`
- `createEmployee(data)` → `POST /employees`
- `updateEmployee(id, data)` → `PUT /employees/{id}`
- `deleteEmployee(id)` → `DELETE /employees/{id}`

## Data Flow

1. **EmployeeList** mounts → `listEmployees()` → renders table
2. Filter inputs (department, role, name) → debounced → re-fetch
3. "Add Employee" → navigate to `/employees/new`
4. Edit button → navigate to `/employees/:id/edit` → `getEmployee(id)` pre-fills form
5. Delete button → `ConfirmModal` → on confirm: `deleteEmployee(id)` → re-fetch
6. **EmployeeForm** submit → `createEmployee()` or `updateEmployee()` → redirect to `/employees`
