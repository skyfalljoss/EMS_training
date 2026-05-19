from motor.motor_asyncio import AsyncIOMotorClient

from app.core.settings import settings

_client: AsyncIOMotorClient | None = None


async def connect_db():
    global _client
    _client = AsyncIOMotorClient(settings.MONGO_URL, tz_aware=True)


async def get_client():
    global _client
    if _client is None:
        await connect_db()
    return _client


def get_database():
    global _client
    if _client is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    return _client[settings.DB_NAME]


async def close_db():
    global _client
    if _client:
        _client.close()
        _client = None

async def ensure_indexes():
    db = get_database()

    # auth_users
    await db.auth_users.create_index([("id", 1)], unique=True, name="uq_auth_user_id", background=True)
    await db.auth_users.create_index([("email", 1)], unique=True, name="uq_auth_user_email", background=True)
    await db.auth_users.create_index([("employee_id", 1)], name="idx_auth_employee_id", background=True)

    # employees
    await db.employees.create_index([("id", 1)], unique=True, name="uq_employee_id", background=True)
    await db.employees.create_index([("email", 1)], unique=True, name="uq_employee_email", background=True)
    await db.employees.create_index([("department_id", 1)], name="idx_employee_department_id", background=True)
    await db.employees.create_index(
        [("department_id", 1), ("role", 1)],
        name="idx_employee_dept_role",
        background=True,
    )

    # departments
    await db.departments.create_index([("id", 1)], unique=True, name="uq_department_id", background=True)
    await db.departments.create_index([("code", 1)], unique=True, name="uq_department_code", background=True)
    await db.departments.create_index([("status", 1)], name="idx_department_status", background=True)

    # audit_logs
    await db.audit_logs.create_index(
        [("user_id", 1), ("timestamp", -1)],
        name="idx_audit_user_timestamp",
        background=True,
    )
    await db.audit_logs.create_index(
        [("timestamp", -1)],
        name="idx_audit_timestamp",
        background=True,
    )
    await db.audit_logs.create_index(
        [("department_name", 1), ("outcome", 1), ("timestamp", -1)],
        name="idx_audit_dept_outcome_timestamp",
        background=True,
    )
    await db.audit_logs.create_index(
        [("timestamp", 1)],
        name="ttl_audit_timestamp",
        expireAfterSeconds=90 * 86400,
        background=True,
    )



