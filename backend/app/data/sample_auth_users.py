from app.core.permissions import AuthRole

SAMPLE_AUTH_USERS = [
    {
        "employee_id": 1,
        "email": "admin@ems.com",
        "password": "Admin@1234",
        "auth_role": AuthRole.ADMIN,
        "is_active": True,
        "must_change_password": True,
    },
    {
        "employee_id": 2,
        "email": "manager@ems.com",
        "password": "Manager@1234",
        "auth_role": AuthRole.MANAGER,
        "is_active": True,
        "must_change_password": True,
    },
    {
        "employee_id": 3,
        "email": "employee@ems.com",
        "password": "Employee@1234",
        "auth_role": AuthRole.EMPLOYEE,
        "is_active": True,
        "must_change_password": True,
    },
]
