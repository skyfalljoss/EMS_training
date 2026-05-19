# Dashboard Backend Suggestions

This file documents backend improvements needed to properly support the dashboard frontend. Currently the frontend aggregates data client-side from existing endpoints (`/employees`, `/departments`, `/audit/logs`). These are the recommended backend changes.

## 1. Audit Logging — Currently Never Written

### Problem

The audit log infrastructure exists (`AuditLogEntry` model, `AuditRepository`, `AuditController`, `GET /audit/logs`) but **no controller writes to it**. Every create/update/delete is silent. The "Recent Activity" dashboard section will always be empty.

### Solution: Reusable Audit Helper

Create `app/controllers/_audit_helper.py`:

```python
from typing import Optional
from app.models.audit_log import AuditLogEntry
from app.repositories.audit_repository import AuditRepository

async def log_audit(
    repo: AuditRepository,
    current_user: Optional[dict],
    action: str,
    resource_type: str,
    resource_id: Optional[int] = None,
    outcome: str = "success",
    detail: Optional[str] = None,
) -> int:
    entry = AuditLogEntry(
        user_id=current_user.get("id") if current_user else None,
        user_email=current_user.get("email") if current_user else None,
        user_role=current_user.get("auth_role") if current_user else None,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        outcome=outcome,
        detail=detail,
    )
    return await repo.insert(entry.model_dump())
```

### Wire Into All Controllers

Each controller needs `AuditRepository` injected via constructor (already available through DI):

**`EmployeeController`:**
- `create()` → `log_audit(repo, user, "create", "employee", doc["id"], detail=f"Created employee {payload.name}")`
- `update()` → `log_audit(repo, user, "update", "employee", employee_id, detail=f"Updated fields: {list(updates.keys())}")`
- `delete()` → `log_audit(repo, user, "delete", "employee", employee_id, detail=f"Deleted employee {existing['name']}")`

**`DepartmentController`:**
- `create()` → `log_audit(repo, user, "create", "department", data["id"], detail=f"Created department {data['name']}")`
- `update()` → `log_audit(repo, user, "update", "department", dept_id, ...)`
- `delete()` → `log_audit(repo, user, "delete", "department", dept_id, ...)`

**`AuthController`:**
- `create_auth_user()` → `log_audit(repo, user, "create", "auth_user", doc["id"], ...)`
- `login()` — on success: `log_audit(repo, None, "login", "auth_session", detail="Login success")`; on failure: `log_audit(..., outcome="failure", detail="Invalid credentials")`

### DI Wiring Update

In `app/dependencies/repositories.py` — `AuditRepository` is already available as a provider.
In each controller's DI provider function, add `AuditRepository`:
```python
def get_employee_controller(
    repo: EmployeeRepository = Depends(get_employee_repository),
    dept_repo: DepartmentRepository = Depends(get_department_repository),
    audit_repo: AuditRepository = Depends(get_audit_repository),
) -> EmployeeController:
    return EmployeeController(repo=repo, dept_repo=dept_repo, audit_repo=audit_repo)
```

## 2. Seed Audit Log Data

### Problem

On fresh startup, `audit_logs` collection is empty. The dashboard has no activity to show.

### Solution: Sample Audit Log Data

Create `app/data/sample_audit_logs.py`:

```python
from datetime import datetime, timezone, timedelta

_NOW = datetime(2026, 5, 15, tzinfo=timezone.utc)

SAMPLE_AUDIT_LOGS = [
    {"user_id": 1, "user_email": "admin@ems.com", "user_role": "admin",
     "action": "create", "resource_type": "employee", "resource_id": "1",
     "outcome": "success", "detail": "Created employee John Doe",
     "timestamp": _NOW - timedelta(days=30)},
    {"user_id": 1, "user_email": "admin@ems.com", "user_role": "admin",
     "action": "create", "resource_type": "department", "resource_id": "1",
     "outcome": "success", "detail": "Created department IT",
     "timestamp": _NOW - timedelta(days=30)},
    # ... 8-10 more entries with staggered timestamps covering:
    # create/update/delete for employees, departments, login events
]
```

In `seed.py`, add audit log seeding after other collections:
```python
if await audit_repo.count() == 0:
    await audit_repo.db["audit_logs"].create_index("timestamp", -1)
    for entry in SAMPLE_AUDIT_LOGS:
        entry["id"] = await audit_repo.next_id()
    await audit_repo.db["audit_logs"].insert_many(SAMPLE_AUDIT_LOGS)
```

## 3. MongoDB Indexes

Add these indexes for query performance:

| Collection | Index | Purpose |
|------------|-------|---------|
| `audit_logs` | `{timestamp: -1}` | Dashboard recent activity (sort desc) |
| `audit_logs` | `{user_id: 1, timestamp: -1}` | Role-scoped lookups |
| `audit_logs` | `{action: 1, resource_type: 1}` | Filtered queries |

## 4. New Dashboard Stats Endpoint

Create a dedicated aggregation endpoint for the dashboard so the frontend can get all data in one call.

### New Permission

Add to `app/core/permissions.py`:

```python
class Permission(str, Enum):
    # ... existing ...
    DASHBOARD_READ = "dashboard:read"

ROLE_PERMISSIONS = {
    AuthRole.ADMIN:    {Permission.DASHBOARD_READ, ...all existing...},
    AuthRole.MANAGER:  {Permission.DASHBOARD_READ, ...},
    AuthRole.EMPLOYEE: {Permission.DASHBOARD_READ, ...},
}
```

### New Files

**`app/repositories/dashboard_repository.py`:**

```python
class DashboardRepository:
    COLLECTION = "employees"
    
    def __init__(self):
        self._db = None

    @property
    def db(self):
        if self._db is None:
            self._db = get_database()
        return self._db

    async def aggregate_stats(self, user_role: str, employee_id: Optional[int] = None) -> dict:
        match = {}
        if user_role == "manager" and employee_id:
            emp = await self.db["employees"].find_one({"id": employee_id})
            if emp:
                match["department_id"] = emp["department_id"]
        elif user_role == "employee" and employee_id:
            match["id"] = employee_id

        pipeline = [
            {"$match": match},
            {"$facet": {
                "totals": [{"$count": "total"}],
                "by_status": [
                    {"$group": {"_id": "$status", "count": {"$sum": 1}}}
                ],
                "by_department": [
                    {"$group": {"_id": "$department_id", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}},
                ],
                "by_role": [
                    {"$group": {"_id": "$role", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}},
                ],
                "monthly_hires": [
                    {"$match": {"start_date": {"$ne": None}}},
                    {"$group": {
                        "_id": {"$dateToString": {"format": "%Y-%m", "date": "$start_date"}},
                        "count": {"$sum": 1},
                    }},
                    {"$sort": {"_id": 1}},
                    {"$limit": 12},
                ],
            }},
        ]
        results = await self.db[self.COLLECTION].aggregate(pipeline).to_list(None)
        result = results[0] if results else {}

        # Compute new_hire_30d
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        # ... filter by start_date >= thirty_days_ago ...

        # Get recent audit logs
        audit_pipeline = []
        if user_role == "admin":
            audit_pipeline = [{"$sort": {"timestamp": -1}}, {"$limit": 5}]
        elif user_role == "manager" and employee_id:
            # Get department users, filter logs
            ...
        elif user_role == "employee" and employee_id:
            audit_pipeline = [{"$match": {"user_id": employee_id}}, {"$sort": {"timestamp": -1}}, {"$limit": 5}]

        recent_activity = []
        if audit_pipeline:
            cursor = self.db["audit_logs"].aggregate(audit_pipeline)
            recent_activity = [doc async for doc in cursor]

        return {
            "total_employees": result.get("totals", [{}])[0].get("total", 0) if result.get("totals") else 0,
            "active_count": next((s["count"] for s in result.get("by_status", []) if s["_id"] == "active"), 0),
            "on_leave_count": next((s["count"] for s in result.get("by_status", []) if s["_id"] == "on_leave"), 0),
            "new_hires_30d": ...,
            "department_headcount": result.get("by_department", []),
            "role_distribution": result.get("by_role", []),
            "monthly_hires": result.get("monthly_hires", []),
            "recent_activity": recent_activity,
        }
```

**`app/controllers/dashboard_controller.py`:**
```python
class DashboardController:
    def __init__(self, repo: DashboardRepository, employee_repo: EmployeeRepository):
        self.repo = repo
        self.employee_repo = employee_repo

    async def get_stats(self, current_user: dict) -> dict:
        role = current_user.get("auth_role")
        employee_id = current_user.get("employee_id")
        return await self.repo.aggregate_stats(role, employee_id)
```

**`app/api/routes/dashboard.py`:**
```python
router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(require_password_not_expired)],
)

@router.get("/stats")
async def get_dashboard_stats(
    controller: DashboardController = Depends(get_dashboard_controller),
    current_user: dict = Depends(require_permissions(Permission.DASHBOARD_READ)),
):
    return await controller.get_stats(current_user)
```

**`app/dependencies/dashboard.py`:**
```python
def get_dashboard_repository() -> DashboardRepository:
    return DashboardRepository()

def get_dashboard_controller(
    repo: DashboardRepository = Depends(get_dashboard_repository),
    employee_repo: EmployeeRepository = Depends(get_employee_repository),
) -> DashboardController:
    return DashboardController(repo=repo, employee_repo=employee_repo)
```

Register route in `app/main.py`:
```python
from app.api.routes.dashboard import router as dashboard_router
app.include_router(dashboard_router)
```

## Implementation Order

1. Create `_audit_helper.py` + wire audit logs into all controllers
2. Create `sample_audit_logs.py` + update `seed.py`
3. Run tests to verify nothing breaks
4. Create dashboard stats endpoint (controller + repo + route + DI)
5. Update frontend `dashboardService.js` to try `/dashboard/stats` first, fall back to client-side aggregation
