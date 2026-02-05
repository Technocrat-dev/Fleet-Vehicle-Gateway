"""
Authentication Tests

Unit tests for the auth endpoints.
"""

import pytest
from httpx import AsyncClient

from app.models.db_models import User


class TestRegistration:
    """Test user registration."""
    
    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient):
        """Test successful user registration."""
        response = await client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "securepassword123",
                "full_name": "New User",
            },
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient, test_user: User):
        """Test registration with existing email fails."""
        response = await client.post(
            "/auth/register",
            json={
                "email": test_user.email,
                "password": "anotherpassword",
            },
        )
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_register_weak_password(self, client: AsyncClient):
        """Test registration with weak password fails."""
        response = await client.post(
            "/auth/register",
            json={
                "email": "weak@example.com",
                "password": "short",  # Too short
            },
        )
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client: AsyncClient):
        """Test registration with invalid email fails."""
        response = await client.post(
            "/auth/register",
            json={
                "email": "not-an-email",
                "password": "validpassword123",
            },
        )
        
        assert response.status_code == 422


class TestLogin:
    """Test user login."""
    
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_user: User):
        """Test successful login."""
        response = await client.post(
            "/auth/login",
            json={
                "email": test_user.email,
                "password": "testpassword123",
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
    
    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient, test_user: User):
        """Test login with wrong password fails."""
        response = await client.post(
            "/auth/login",
            json={
                "email": test_user.email,
                "password": "wrongpassword",
            },
        )
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent user fails."""
        response = await client.post(
            "/auth/login",
            json={
                "email": "nobody@example.com",
                "password": "somepassword",
            },
        )
        
        assert response.status_code == 401


class TestTokenRefresh:
    """Test token refresh functionality."""
    
    @pytest.mark.asyncio
    async def test_refresh_token_success(self, client: AsyncClient, test_user: User):
        """Test token refresh with valid refresh token."""
        # First login to get tokens
        login_response = await client.post(
            "/auth/login",
            json={
                "email": test_user.email,
                "password": "testpassword123",
            },
        )
        tokens = login_response.json()
        
        # Refresh the token
        response = await client.post(
            "/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
    
    @pytest.mark.asyncio
    async def test_refresh_invalid_token(self, client: AsyncClient):
        """Test refresh with invalid token fails."""
        response = await client.post(
            "/auth/refresh",
            json={"refresh_token": "invalid-token"},
        )
        
        assert response.status_code == 401


class TestProfile:
    """Test user profile endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_profile_authenticated(
        self, client: AsyncClient, test_user: User, auth_headers: dict
    ):
        """Test getting profile with valid token."""
        response = await client.get("/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["full_name"] == test_user.full_name
    
    @pytest.mark.asyncio
    async def test_get_profile_unauthenticated(self, client: AsyncClient):
        """Test profile endpoint requires authentication."""
        response = await client.get("/auth/me")
        
        assert response.status_code == 401


class TestOAuthProviders:
    """Test OAuth provider endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_providers(self, client: AsyncClient):
        """Test getting list of OAuth providers."""
        response = await client.get("/auth/providers")
        
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        assert isinstance(data["providers"], list)
