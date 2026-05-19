import re

def fix_employee():
    with open('frontend/src/services/employeeService.ts', 'r') as f:
        content = f.read()

    # Remove mock import
    content = re.sub(r"import mockEmployees from '../data/employees'\n", "", content)
    # Remove _mockData
    content = re.sub(r"let _nextId = 100\nconst _mockData.*?\]\n", "", content, flags=re.DOTALL)
    
    # Replace listEmployees
    content = re.sub(
        r"export async function listEmployees\(.*?\).*?\{.*?try \{(.*?)\} catch \(err\) \{.*?return list\.map\(toFrontend\)\n  \}\n\}",
        lambda m: "export async function listEmployees(\n  filters: EmployeeFilters = {},\n): Promise<EmployeeView[]> {\n" + m.group(1) + "}",
        content,
        flags=re.DOTALL
    )

    # getEmployee
    content = re.sub(
        r"export async function getEmployee\(.*?\).*?\{.*?try \{(.*?)\} catch \(err\) \{.*?return emp \? toFrontend\(emp\) : null\n  \}\n\}",
        lambda m: "export async function getEmployee(\n  id: number | string,\n): Promise<EmployeeView | null> {\n" + m.group(1) + "}",
        content,
        flags=re.DOTALL
    )

    # createEmployee
    content = re.sub(
        r"export async function createEmployee\(.*?\).*?\{.*?try \{(.*?)\} catch \(err\) \{.*?_mockData\.push\(emp\)\n.*?return toFrontend\(emp\)\n  \}\n\}",
        lambda m: "export async function createEmployee(\n  data: Partial<EmployeePayload> & { department?: string },\n): Promise<EmployeeView> {\n" + m.group(1) + "}",
        content,
        flags=re.DOTALL
    )

    # updateEmployee
    content = re.sub(
        r"export async function updateEmployee\(.*?\).*?\{.*?try \{(.*?)\} catch \(err\) \{.*?_mockData\[idx\] = updated\n.*?return toFrontend\(updated\)\n  \}\n\}",
        lambda m: "export async function updateEmployee(\n  id: number | string,\n  data: Partial<EmployeePayload> & { department?: string },\n): Promise<EmployeeView> {\n" + m.group(1) + "}",
        content,
        flags=re.DOTALL
    )

    # deleteEmployee
    content = re.sub(
        r"export async function deleteEmployee\(.*?\).*?\{.*?try \{(.*?)\} catch \(err\) \{.*?_mockData\.splice\(idx, 1\)\n  \}\n\}",
        lambda m: "export async function deleteEmployee(id: number | string): Promise<void> {\n" + m.group(1) + "}",
        content,
        flags=re.DOTALL
    )

    with open('frontend/src/services/employeeService.ts', 'w') as f:
        f.write(content)

def fix_dept():
    with open('frontend/src/services/departmentService.ts', 'r') as f:
        content = f.read()

    # Remove mock import
    content = re.sub(r"import mockDepartments from '../data/departments'\n", "", content)
    # Remove _mockData
    content = re.sub(r"let _nextId = 100\nconst _mockData.*?\]\n", "", content, flags=re.DOTALL)
    
    # Replace listDepartments
    content = re.sub(
        r"export async function listDepartments\(.*?\).*?\{.*?try \{(.*?)\} catch \(err\) \{.*?return list\.map\(toFrontend\)\n  \}\n\}",
        lambda m: "export async function listDepartments(\n  filters: DepartmentFilters = {},\n): Promise<DepartmentView[]> {\n" + m.group(1) + "}",
        content,
        flags=re.DOTALL
    )

    # getDepartment
    content = re.sub(
        r"export async function getDepartment\(.*?\).*?\{.*?try \{(.*?)\} catch \(err\) \{.*?return dept \? toFrontend\(dept\) : null\n  \}\n\}",
        lambda m: "export async function getDepartment(\n  id: number | string,\n): Promise<DepartmentView | null> {\n" + m.group(1) + "}",
        content,
        flags=re.DOTALL
    )

    # createDepartment
    content = re.sub(
        r"export async function createDepartment\(.*?\).*?\{.*?try \{(.*?)\} catch \(err\) \{.*?_mockData\.push\(dept\)\n.*?return toFrontend\(dept\)\n  \}\n\}",
        lambda m: "export async function createDepartment(\n  data: Partial<DepartmentPayload>,\n): Promise<DepartmentView> {\n" + m.group(1) + "}",
        content,
        flags=re.DOTALL
    )

    # updateDepartment
    content = re.sub(
        r"export async function updateDepartment\(.*?\).*?\{.*?try \{(.*?)\} catch \(err\) \{.*?_mockData\[idx\] = updated\n.*?return toFrontend\(updated\)\n  \}\n\}",
        lambda m: "export async function updateDepartment(\n  id: number | string,\n  data: Partial<DepartmentPayload>,\n): Promise<DepartmentView> {\n" + m.group(1) + "}",
        content,
        flags=re.DOTALL
    )

    # deleteDepartment
    content = re.sub(
        r"export async function deleteDepartment\(.*?\).*?\{.*?try \{(.*?)\} catch \(err\) \{.*?_mockData\.splice\(idx, 1\)\n  \}\n\}",
        lambda m: "export async function deleteDepartment(id: number | string): Promise<void> {\n" + m.group(1) + "}",
        content,
        flags=re.DOTALL
    )
    
    # And there's one more method: _fetchEmployeeCounts that needs its try/catch modified or not. We'll leave _fetchEmployeeCounts as is since we just want to remove mock fallbacks, and the fallback there is empty {}.

    with open('frontend/src/services/departmentService.ts', 'w') as f:
        f.write(content)

fix_employee()
fix_dept()
