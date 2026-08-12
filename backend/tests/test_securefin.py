import os
import time
import uuid
import requests
import pyotp

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


def test_securefin_critical_api_flow():
    s = requests.Session()
    email = f"test-{uuid.uuid4().hex[:10]}@securefin.app"
    password = "TestUser!2026Strong"
    r = s.post(f"{BASE_URL}/api/auth/register", json={"name": "TEST User", "email": email, "password": password, "confirm_password": password, "demo_data": True})
    assert r.status_code == 200 and r.json()["email"] == email
    assert "access_token" in s.cookies and "refresh_token" in s.cookies
    assert s.get(f"{BASE_URL}/api/auth/me").json()["email"] == email
    for resource in ("transactions", "investments", "subscriptions", "budgets"):
        data = s.get(f"{BASE_URL}/api/{resource}").json()
        assert len(data) >= 3
        assert all(x["user_id"] == r.json()["id"] for x in data)
    created = s.post(f"{BASE_URL}/api/transactions", json={"type":"expense","amount":123.0,"category":"TEST","description":"TEST CRUD","date":"2026-02-20"})
    assert created.status_code == 200 and created.json()["is_demo"] is False
    rid = created.json()["id"]
    assert s.put(f"{BASE_URL}/api/transactions/{rid}", json={"amount":456.0}).json()["amount"] == 456.0
    assert s.get(f"{BASE_URL}/api/transactions", params={"search":"TEST CRUD"}).json()[0]["id"] == rid
    assert s.delete(f"{BASE_URL}/api/transactions/{rid}").status_code == 200
    assert s.get(f"{BASE_URL}/api/transactions").json() and all(x["id"] != rid for x in s.get(f"{BASE_URL}/api/transactions").json())
    assert s.get(f"{BASE_URL}/api/dashboard").status_code == 200
    assert s.get(f"{BASE_URL}/api/analytics").json()["monthly"]
    setup = s.post(f"{BASE_URL}/api/auth/2fa/setup").json()
    assert s.post(f"{BASE_URL}/api/auth/2fa/verify", json={"code": pyotp.TOTP(setup["secret"]).now()}).status_code == 200
    s.post(f"{BASE_URL}/api/auth/logout")
    challenge = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    assert challenge.status_code == 428
    assert s.post(f"{BASE_URL}/api/auth/login", params={"two_factor_code": pyotp.TOTP(setup["secret"]).now()}, json={"email": email, "password": password}).status_code == 200
    reset = s.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": email}).json()
    assert reset["delivery"] == "console" and reset["development_token"]
    assert s.post(f"{BASE_URL}/api/auth/reset-password", json={"token": reset["development_token"], "password": "ResetUser!2026Strong"}).status_code == 200


def test_unauthenticated_protection_and_invalid_resource():
    s = requests.Session()
    assert s.get(f"{BASE_URL}/api/dashboard").status_code == 401
    assert s.get(f"{BASE_URL}/api/not-a-resource").status_code == 401