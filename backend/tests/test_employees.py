"""Integration tests for the /employees endpoints.

These tests use the FastAPI TestClient. They rely on the app's startup hook
to seed the sample employees on first run.
"""


def test_root(api, auth_headers):
    response = api.get("/", headers=auth_headers)
    assert response.status_code == 200
    assert "Welcome" in response.json()["message"]


def test_list_employees_returns_seed_data(api, auth_headers):
    response = api.get("/employees", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= 5
    assert {"id", "name", "email", "role", "department_id"} <= set(body[0].keys())


def test_get_employee_by_id(api, auth_headers):
    response = api.get("/employees/1", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == 1


def test_get_employee_not_found(api, auth_headers):
    response = api.get("/employees/9999", headers=auth_headers)
    assert response.status_code == 404


def test_create_employee_success(api, auth_headers, unique_email):
    payload = {
        "name": "Alice Wonder",
        "email": unique_email("alice"),
        "role": "QA",
        "department_id": 1,
    }
    response = api.post("/employees", json=payload, headers=auth_headers)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Alice Wonder"
    assert body["id"] >= 6  # 5 seeded + new


def test_create_employee_duplicate_email(api, auth_headers):
    payload = {
        "name": "Duplicate John",
        "email": "john@test.com",  # already seeded
        "role": "Engineer",
        "department_id": 1,
    }
    response = api.post("/employees", json=payload, headers=auth_headers)
    assert response.status_code == 400


def test_create_employee_invalid_email(api, auth_headers):
    payload = {
        "name": "Bad Email",
        "email": "not-an-email",
        "role": "Engineer",
        "department_id": 1,
    }
    response = api.post("/employees", json=payload, headers=auth_headers)
    assert response.status_code == 422  # Pydantic validation


def test_create_employee_empty_name(api, auth_headers, unique_email):
    payload = {"name": "", "email": unique_email("empty"), "role": "R", "department_id": 1}
    response = api.post("/employees", json=payload, headers=auth_headers)
    assert response.status_code == 422


def test_update_employee(api, auth_headers, unique_email):
    # Create one to update
    created = api.post(
        "/employees",
        json={"name": "Update Me", "email": unique_email("update"), "role": "R", "department_id": 1},
        headers=auth_headers,
    ).json()
    new_id = created["id"]

    response = api.put(f"/employees/{new_id}", json={"role": "Lead Engineer"}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["role"] == "Lead Engineer"
    assert response.json()["name"] == "Update Me"  # untouched


def test_update_employee_not_found(api, auth_headers):
    response = api.put("/employees/9999", json={"role": "X"}, headers=auth_headers)
    assert response.status_code == 404


def test_delete_employee(api, auth_headers, unique_email):
    created = api.post(
        "/employees",
        json={"name": "Delete Me", "email": unique_email("delete"), "role": "R", "department_id": 1},
        headers=auth_headers,
    ).json()
    new_id = created["id"]

    response = api.delete(f"/employees/{new_id}", headers=auth_headers)
    assert response.status_code == 200
    assert "deleted" in response.json()["message"].lower()

    # Verify gone
    assert api.get(f"/employees/{new_id}", headers=auth_headers).status_code == 404


def test_delete_employee_not_found(api, auth_headers):
    response = api.delete("/employees/9999", headers=auth_headers)
    assert response.status_code == 404


def test_filter_by_department_id(api, auth_headers):
    response = api.get("/employees", params={"department_id": 1}, headers=auth_headers)
    assert response.status_code == 200
    assert all(e["department_id"] == 1 for e in response.json())


def test_filter_by_role(api, auth_headers):
    response = api.get("/employees", params={"role": "Engineer"}, headers=auth_headers)
    assert response.status_code == 200
    assert all(e["role"] == "Engineer" for e in response.json())


def test_create_employee_invalid_department_id(api, auth_headers, unique_email):
    payload = {
        "name": "Bad Dept",
        "email": unique_email("baddept"),
        "role": "Engineer",
        "department_id": 9999,
    }
    response = api.post("/employees", json=payload, headers=auth_headers)
    assert response.status_code == 400


def test_search_by_name(api, auth_headers):
    response = api.get("/employees", params={"name": "john"}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body) >= 1
    assert any("john" in e["name"].lower() for e in body)
