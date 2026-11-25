import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_auth_rejection_without_token():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Attempt to call protected endpoint without auth header
        response = await client.post(
            "/api/v1/analytics/project-health",
            json={"organization_id": "org-1", "project_id": "proj-1", "tasks": []}
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

@pytest.mark.asyncio
async def test_auth_success_with_internal_key():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"X-Internal-Key": "ws_internal_sec_analytics_dev_key_2026"}
        response = await client.post(
            "/api/v1/analytics/project-health",
            headers=headers,
            json={"organization_id": "org-1", "project_id": "proj-1", "tasks": []}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["health_status"] == "EXCELLENT"
