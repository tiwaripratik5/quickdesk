import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.services.auth_service import get_current_user
from app.models.user import User, UserRole

client = TestClient(app)


def test_agent_endpoint_rejected_without_token():
    # Attempting to fetch agent tickets without token -> 401 Unauthorized
    response = client.get("/api/agent/tickets")
    assert response.status_code == 401


def test_agent_endpoint_rejected_for_employee_role():
    # Mocking current_user dependency to return an employee
    mock_employee = User(
        id="mock-emp-id",
        email="emp@test.com",
        name="Mock Employee",
        role=UserRole.employee,
    )
    app.dependency_overrides[get_current_user] = lambda: mock_employee

    try:
        # Employee tries to hit Agent-only dashboard route -> 403 Forbidden
        response = client.get("/api/agent/tickets")
        assert response.status_code == 403
        assert "Agent role required" in response.json().get("detail", "")
    finally:
        app.dependency_overrides.clear()


def test_metrics_rejected_for_employee():
    mock_employee = User(
        id="mock-emp-id",
        email="emp@test.com",
        name="Mock Employee",
        role=UserRole.employee,
    )
    app.dependency_overrides[get_current_user] = lambda: mock_employee

    try:
        response = client.get("/api/metrics")
        assert response.status_code == 403
        assert "Agent role required" in response.json().get("detail", "")
    finally:
        app.dependency_overrides.clear()
