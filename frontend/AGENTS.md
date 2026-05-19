# Frontend — Agent Guide

## Commands

```bash
npm run dev           # Vite dev server (HMR at localhost:5173)
npm run build         # tsc -b && vite build (production to dist/)
npm run typecheck     # tsc -b --noEmit (type-check only, no output)
npm run lint          # ESLint
npm test              # Vitest
npm run test:watch    # Vitest watch mode
npm run coverage      # Vitest with coverage
```

- Node 18+, npm
- Backend must be running for real API calls; falls back to mock data if unreachable

## Project Structure

```
src/
  api/          Raw HTTP calls — thin wrappers around fetch(), inject Bearer token
  services/     Business logic layer with mock fallback (API-first, mock on network error)
  hooks/        React Query hooks (useEmployeesQuery, usePayrollQuery, useAuditQuery, etc.)
  context/      AuthContext — token storage, login/logout/register/changePassword
  pages/        One per route: Dashboard, Login, Employees, Departments, Payroll, Leave, etc.
  components/   Sidebar, TopBar, ProtectedRoute, modals, forms
  types/        TypeScript types (employee, department, leave, payroll, audit, auth, api)
  constants/    Status labels (employeeStatus, departmentStatus)
  data/         Mock seed data (employees, departments, leaves, payroll)
  tests/        Vitest test definitions (*.test.ts, *.test.tsx, setupTests.ts)
  styles/       design.css — glassmorphism design system, light/dark theme
  config.ts     VITE_API_URL constant
```

## Architecture

```
Page/Component → Query Hook (useEmployeesList) → Service (employeeService) → API (request.ts)
                                                      ↓
                                                 Mock fallback (on network error)
```

- **API layer** (`src/api/`) — raw fetch calls, Bearer token injection, 401/403 handling
- **Service layer** (`src/services/`) — transforms API data to frontend models, provides mock fallback when API is unreachable
- **Query hooks** (`src/hooks/`) — wraps services with `@tanstack/react-query` for caching, mutations, cache invalidation
- **Pages** — call query hooks, never call services or API directly

## React Query Configuration

Configured in `src/main.tsx`:

| Setting                | Value          | Effect                                                         |
| ---------------------- | -------------- | -------------------------------------------------------------- |
| `staleTime`            | 30_000 (30s)   | Data served from cache within 30s, refetch in background after |
| `gcTime`               | 300_000 (5min) | Cache survives 5min after component unmounts                   |
| `retry`                | 1              | One retry on failure before showing error                      |
| `refetchOnWindowFocus` | false          | No automatic refetch on tab focus                              |

### Query Key Convention

```
['resource', 'list', filters]   — useEmployeesList({ status: 'active' })
['resource', id]                — useEmployeeDetail(42)
['resource', 'admin']           — useEmployeesListForAdmin()
```

### Mutations auto-invalidate

Every create/update/delete mutation calls `invalidateQueries` on success, which triggers a background refetch of the list. Components using those queries will re-render with fresh data automatically.

## Available Query Hooks

**`src/hooks/useEmployeesQuery.ts`**

- `useEmployeesList(filters?)` → `{ data, isLoading, error }`
- `useEmployeeDetail(id)` → `{ data, isLoading, error }`
- `useCreateEmployee()` → `{ mutateAsync, isPending }`
- `useUpdateEmployee()` → `{ mutateAsync, isPending }` (args: `{ id, data }`)
- `useDeleteEmployee()` → `{ mutateAsync, isPending }` (has optimistic update + rollback)

**`src/hooks/useDepartmentsQuery.ts`**

- `useDepartmentsList(filters?)`, `useDepartmentDetail(id)`, `useCreateDepartment()`, `useUpdateDepartment()`, `useDeleteDepartment()`

**`src/hooks/useAuthQuery.ts`**

- `useAuthUsersList()`, `useEmployeesListForAdmin()`
- `useActivateUser()`, `useRejectUser()`, `useUpdateUserRole()`

**`src/hooks/usePayrollQuery.ts`**

- `usePayrollRuns()`

**`src/hooks/useAuditQuery.ts`**

- `useAuditLogs(limit, outcome)`

## Mock Fallback

Services in `src/services/` try the real API first. If the network fails (not an ApiError), they fall back to in-memory mock arrays from `src/data/`. This allows the app to work offline or without the backend for basic CRUD. React Query caches mock data, making fallback feel fast.

## Data Caching & Navigation

Thanks to React Query's `staleTime: 30s`:

- Navigating from `/employees` → `/departments` → back to `/employees` shows cached data instantly
- After 30s, stale data still shows immediately while React Query refetches in background
- Mutations (create/update/delete) invalidate list caches, triggering automatic refresh

## Code Splitting

All page components are lazy-loaded via `React.lazy()` in `src/App.tsx`. Each page is a separate JS chunk loaded on first navigation. The `Suspense` wrapper around `<Routes>` handles the loading state (null fallback since data loading is handled by React Query).

## Sidebar Prefetching

Hovering over Employees or Departments links in the sidebar triggers `queryClient.prefetchQuery()` to fetch data before the user clicks. The data is cached with `staleTime: 30s`, so the page renders instantly.

## Auth System

- Token stored in `localStorage` under key `access_token`
- `AuthContext` (`src/context/AuthContext.tsx`) manages login/logout/register/changePassword
- JWT decoded client-side (contains `sub`, `exp`, `must_change_pwd`)
- Role is fetched separately via `GET /auth/me`
- `ProtectedRoute` component redirects to `/login` if not authenticated
- `usePermissions` hook derives UI permissions from role (`canCreate`, `canUpdate`, `canDelete`, `canManageUsers`)

### Role-based UI

| Action                       | Employee | Manager | Admin |
| ---------------------------- | :------: | :-----: | :---: |
| Create employees/departments |    ✅    |   ✅    |  ✅   |
| Update employees/departments |    ❌    |   ✅    |  ✅   |
| Delete employees/departments |    ❌    |   ❌    |  ✅   |
| Manage auth users            |    ❌    |   ❌    |  ✅   |

## Adding a New Page

1. Create page component in `src/pages/`
2. Add `const Page = lazy(() => import('./pages/Page'))` in `src/App.tsx`
3. Add `<Route>` inside `<Routes>` with `<ProtectedRoute>` wrapper
4. If the page needs API data:
   - Add API function in `src/api/` (or use existing)
   - Add service function in `src/services/` (or use existing)
   - Create query hook in `src/hooks/` (or use existing)
   - Use the hook in the page component
   - Add TypeScript types in `src/types/` if needed
   - Test with mock data first, then verify with backend running
   - Run `npm run typecheck && npm run lint` before committing

## Testing

- Vitest test runner (configured in `vite.config.ts`)
- `@testing-library/react` for component tests
- Full test suite available in `src/tests/` covering API, services, hooks, and pages (e.g., `Login.test.tsx`, `employeeService.test.ts`)
- Use `npm run test` to run tests, `npm run test:watch` for watch mode, and `npm run coverage` for test coverage

## Adding a New Query Hook

Follow the existing pattern in `src/hooks/useEmployeesQuery.ts`:

```typescript
const RESOURCE_KEY = "resource";

export function useResourceList(filters?: Filters) {
  return useQuery({
    queryKey: [RESOURCE_KEY, "list", filters ?? {}],
    queryFn: () => service.listResources(filters),
  });
}

export function useCreateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => service.createResource(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RESOURCE_KEY, "list"] }),
  });
}
```

## Seeded Test Accounts

| Email            | Password      | Role     |
| ---------------- | ------------- | -------- |
| admin@ems.com    | Admin@1234    | admin    |
| manager@ems.com  | Manager@1234  | manager  |
| employee@ems.com | Employee@1234 | employee |
