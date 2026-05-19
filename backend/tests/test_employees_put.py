"""Characterization tests for PUT /employees."""


def test_update_employee_response_contains_updatedAt(api, auth_headers, unique_email):
    created = api.post(
        "/employees",
        json={
            "name": "UpdatedAt Test",
            "email": unique_email("updatedat"),
            "role": "Engineer",
            "department_id": 1,
        },
        headers=auth_headers,
    ).json()
    emp_id = created["id"]

    response = api.put(f"/employees/{emp_id}", json={"role": "Lead"}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert "updatedAt" in body
    assert body["updatedAt"] is not None


def test_update_employee_updatedAt_changes_on_second_update(api, auth_headers, unique_email):
    created = api.post(
        "/employees",
        json={
            "name": "UpdatedAt Change",
            "email": unique_email("updatedatchg"),
            "role": "Engineer",
            "department_id": 1,
        },
        headers=auth_headers,
    ).json()
    emp_id = created["id"]

    resp1 = api.put(f"/employees/{emp_id}", json={"role": "Senior"}, headers=auth_headers)
    assert resp1.status_code == 200
    first_updated = resp1.json()["updatedAt"]

    resp2 = api.put(f"/employees/{emp_id}", json={"role": "Lead"}, headers=auth_headers)
    assert resp2.status_code == 200
    second_updated = resp2.json()["updatedAt"]

    assert first_updated != second_updated
