from app.controllers.auth_controller import AuthController
from app.controllers.employee_controller import EmployeeController
from app.data.sample_auth_users import SAMPLE_AUTH_USERS
from app.data.sample_departments import SAMPLE_DEPARTMENTS
from app.data.sample_employees import SAMPLE_EMPLOYEES
from app.repositories.auth_repository import AuthRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.employee_repository import EmployeeRepository


async def seed_if_empty() -> None:
    dept_repo = DepartmentRepository()
    emp_repo = EmployeeRepository()
    auth_repo = AuthRepository()

    if await dept_repo.count() == 0:
        await dept_repo.insert_many(list(SAMPLE_DEPARTMENTS))
        max_dept_id = max(d["id"] for d in SAMPLE_DEPARTMENTS)
        await dept_repo.set_counter(max_dept_id)

    if await emp_repo.count() == 0:
        await emp_repo.insert_many([dict(e) for e in SAMPLE_EMPLOYEES])
        max_emp_id = max(e["id"] for e in SAMPLE_EMPLOYEES)
        await emp_repo.set_counter(max_emp_id)

    if await auth_repo.count() == 0:
        emp_ctrl = EmployeeController(repo=emp_repo, dept_repo=dept_repo, auth_repo=auth_repo)
        auth_ctrl = AuthController(repo=auth_repo, employee_controller=emp_ctrl)
        for au in SAMPLE_AUTH_USERS:
            await auth_ctrl.create_auth_user(
                au["employee_id"], au["email"],
                au["password"], au["auth_role"],
                must_change_password=au.get("must_change_password", True),
            )
