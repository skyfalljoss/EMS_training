from fastapi.testclient import TestClient

VALID_USER = {
    "email": "employee@ems.com",
    "password": "Employee@1234",
    "auth_role": "employee",
}


def get_auth_token(api: TestClient, email: str, password: str) -> str:
    response = api.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]

def test_me_endpoint_requires_auth(api: TestClient):
    response = api.get("/auth/me")
    assert response.status_code == 401

def test_me_endpoint_with_invalid_token(api: TestClient):
    response = api.get("/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert response.status_code == 401

def test_me_endpoint_with_auth(api: TestClient):
    token = get_auth_token(api, VALID_USER["email"], VALID_USER["password"])
    response = api.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == VALID_USER["email"]
    assert "employee_id" in response.json()
    assert "auth_role" in response.json()
    assert "hashed_password" not in response.json()


