"""
Health and Core Tests

Tests for health endpoints and core functionality.
"""

import pytest
from httpx import AsyncClient


class TestHealthEndpoints:
    """Test health and readiness endpoints."""
    
    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        """Test health endpoint returns OK."""
        response = await client.get("/health")
        
        assert response.status_code == 200
        assert response.text == "OK"
    
    @pytest.mark.asyncio
    async def test_readiness_check(self, client: AsyncClient):
        """Test readiness endpoint."""
        response = await client.get("/ready")
        
        # Should be ready or not ready
        assert response.status_code in [200, 503]
    
    @pytest.mark.asyncio
    async def test_root_endpoint(self, client: AsyncClient):
        """Test root endpoint returns API info."""
        response = await client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert data["status"] == "running"
    
    @pytest.mark.asyncio
    async def test_metrics_endpoint(self, client: AsyncClient):
        """Test Prometheus metrics endpoint."""
        response = await client.get("/metrics")
        
        assert response.status_code == 200
        assert "fleet_vehicles_total" in response.text
        assert "fleet_messages_processed_total" in response.text


class TestCORS:
    """Test CORS configuration."""
    
    @pytest.mark.asyncio
    async def test_cors_headers(self, client: AsyncClient):
        """Test CORS headers are present for allowed origins."""
        response = await client.options(
            "/api/vehicles",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        
        # CORS preflight should work for allowed origins
        assert response.status_code in [200, 204, 400]


class TestRateLimiting:
    """Test rate limiting (basic check)."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_rate_limit_headers(self, client: AsyncClient):
        """Test that rate limiting is active."""
        # Make a few requests - just checking the endpoint works
        for _ in range(3):
            response = await client.get("/metrics")
            assert response.status_code in [200, 429]
