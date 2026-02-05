"""
Authentication Schemas

Pydantic models for authentication requests and responses.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

# ============================================
# Request Schemas
# ============================================


class UserCreate(BaseModel):
    """User registration request."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: Optional[str] = Field(None, max_length=100)


class UserLogin(BaseModel):
    """User login request."""

    email: EmailStr
    password: str


class TokenRefresh(BaseModel):
    """Token refresh request."""

    refresh_token: str


class APIKeyCreate(BaseModel):
    """API key creation request."""

    name: str = Field(..., min_length=1, max_length=100)
    scopes: str = Field(
        default="read", description="Comma-separated scopes: read,write,admin"
    )


# ============================================
# Response Schemas
# ============================================


class UserResponse(BaseModel):
    """User information response."""

    id: int
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    oauth_provider: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Authentication token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class AccessTokenResponse(BaseModel):
    """Access token only response (for refresh)."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class APIKeyResponse(BaseModel):
    """API key creation response."""

    key: str  # Only shown once!
    name: str
    scopes: str
    created_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class APIKeyInfo(BaseModel):
    """API key info (without the actual key)."""

    id: int
    name: str
    scopes: str
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============================================
# OAuth Schemas
# ============================================


class OAuthUserInfo(BaseModel):
    """User info from OAuth provider."""

    provider: str
    oauth_id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class OAuthCallbackResponse(BaseModel):
    """OAuth callback response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    is_new_user: bool
