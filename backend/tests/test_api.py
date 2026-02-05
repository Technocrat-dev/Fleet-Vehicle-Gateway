"""
Vehicles API Tests

Unit tests for the vehicles API endpoints.
"""

import pytest
from httpx import AsyncClient

from app.models.db_models import User


class TestVehiclesAPI:
    """Test vehicles API endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_vehicles_authenticated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test listing vehicles with authentication."""
        response = await client.get("/api/vehicles", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "vehicles" in data
        assert "total" in data
        assert "timestamp" in data
    
    @pytest.mark.asyncio
    async def test_list_vehicles_unauthenticated(self, client: AsyncClient):
        """Test listing vehicles without authentication fails."""
        response = await client.get("/api/vehicles")
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_list_vehicles_active_only(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test filtering to active vehicles only."""
        response = await client.get(
            "/api/vehicles",
            params={"active_only": True},
            headers=auth_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        # All returned vehicles should be active
        for vehicle in data["vehicles"]:
            assert vehicle.get("is_active", True) is True
    
    @pytest.mark.asyncio
    async def test_get_fleet_summary(self, client: AsyncClient, auth_headers: dict):
        """Test getting fleet summary."""
        response = await client.get("/api/vehicles/summary", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "total_vehicles" in data
        assert "total_passengers" in data
    
    @pytest.mark.asyncio
    async def test_get_vehicle_not_found(self, client: AsyncClient, auth_headers: dict):
        """Test getting non-existent vehicle."""
        response = await client.get(
            "/api/vehicles/NONEXISTENT",
            headers=auth_headers,
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_get_vehicle_history_not_found(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test getting history for non-existent vehicle."""
        response = await client.get(
            "/api/vehicles/NONEXISTENT/history",
            headers=auth_headers,
        )
        
        assert response.status_code == 404


class TestAnalyticsAPI:
    """Test analytics API endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_occupancy_trends(self, client: AsyncClient, auth_headers: dict):
        """Test getting occupancy trends."""
        response = await client.get("/api/analytics/occupancy", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "query_time_ms" in data
        assert "count" in data
    
    @pytest.mark.asyncio
    async def test_get_latency_metrics(self, client: AsyncClient, auth_headers: dict):
        """Test getting latency metrics."""
        response = await client.get("/api/analytics/latency", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "stats" in data
        assert "min_ms" in data["stats"]
        assert "max_ms" in data["stats"]
        assert "avg_ms" in data["stats"]
    
    @pytest.mark.asyncio
    async def test_get_route_analytics(self, client: AsyncClient, auth_headers: dict):
        """Test getting route analytics."""
        response = await client.get("/api/analytics/routes", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "query_time_ms" in data
    
    @pytest.mark.asyncio
    async def test_get_consent_stats(self, client: AsyncClient, auth_headers: dict):
        """Test getting consent statistics."""
        response = await client.get("/api/analytics/consent", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "consent_breakdown" in data
        assert "compliance_rate_percent" in data
        assert "total_vehicles" in data
    
    @pytest.mark.asyncio
    async def test_analytics_requires_auth(self, client: AsyncClient):
        """Test analytics endpoints require authentication."""
        endpoints = [
            "/api/analytics/occupancy",
            "/api/analytics/latency",
            "/api/analytics/routes",
            "/api/analytics/consent",
        ]
        
        for endpoint in endpoints:
            response = await client.get(endpoint)
            assert response.status_code == 401, f"{endpoint} should require auth"
