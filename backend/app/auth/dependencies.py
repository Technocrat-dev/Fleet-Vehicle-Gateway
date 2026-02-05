"""
Authentication Dependencies

FastAPI dependencies for authentication and authorization.
"""

from typing import Optional
from datetime import datetime

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.models.db_models import User, APIKey
from app.auth.security import decode_token, hash_token


logger = get_logger(__name__)

# Bearer token scheme
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get the current authenticated user from JWT token.
    
    Raises HTTPException 401 if not authenticated.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is deactivated",
        )
    
    logger.debug("user_authenticated", user_id=user.id, email=user.email)
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Get the current user if authenticated, None otherwise.
    
    Use this for endpoints that work both authenticated and unauthenticated.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def get_current_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Require current user to be a superuser.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser privileges required",
        )
    return current_user


async def verify_api_key(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Optional[APIKey]:
    """
    Verify API key from X-API-Key header.
    
    Returns None if no API key provided, raises 401 if invalid.
    """
    api_key = request.headers.get("X-API-Key")
    
    if not api_key:
        return None
    
    key_hash = hash_token(api_key)
    
    result = await db.execute(
        select(APIKey).where(
            APIKey.key_hash == key_hash,
            APIKey.is_active == True,
        )
    )
    api_key_obj = result.scalar_one_or_none()
    
    if not api_key_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    
    # Check expiration
    if api_key_obj.expires_at and api_key_obj.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key expired",
        )
    
    # Update last used
    api_key_obj.last_used_at = datetime.utcnow()
    await db.commit()
    
    logger.debug("api_key_authenticated", key_name=api_key_obj.name, user_id=api_key_obj.user_id)
    return api_key_obj


async def get_auth_user_or_api_key(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Authenticate via either JWT token or API key.
    
    Tries JWT first, then falls back to API key.
    """
    # Try JWT auth
    if credentials:
        try:
            return await get_current_user(credentials, db)
        except HTTPException:
            pass
    
    # Try API key
    if request:
        api_key = await verify_api_key(request, db)
        if api_key:
            # Get user associated with API key
            result = await db.execute(select(User).where(User.id == api_key.user_id))
            user = result.scalar_one_or_none()
            if user and user.is_active:
                return user
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_scopes(*required_scopes: str):
    """
    Factory for scope-checking dependency.
    
    Usage:
        @router.post("/admin", dependencies=[Depends(require_scopes("admin"))])
    """
    async def check_scopes(
        api_key: Optional[APIKey] = Depends(verify_api_key),
        user: User = Depends(get_current_user),
    ):
        # Superusers have all scopes
        if user.is_superuser:
            return user
        
        # Check API key scopes if using API key
        if api_key:
            key_scopes = set(api_key.scopes.split(","))
            for scope in required_scopes:
                if scope not in key_scopes:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Missing required scope: {scope}",
                    )
        
        return user
    
    return check_scopes
