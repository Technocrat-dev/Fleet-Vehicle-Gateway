"""
Authentication Router

Endpoints for user registration, login, OAuth, and token management.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.db_models import User, RefreshToken, APIKey
from app.auth.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
    generate_api_key,
)
from app.auth.schemas import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    AccessTokenResponse,
    TokenRefresh,
    APIKeyCreate,
    APIKeyResponse,
    APIKeyInfo,
    OAuthCallbackResponse,
)
from app.auth.dependencies import get_current_user
from app.auth.oauth import (
    oauth,
    get_google_user_info,
    get_github_user_info,
    get_enabled_providers,
    is_google_enabled,
    is_github_enabled,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============================================
# Local Authentication
# ============================================


@router.post(
    "/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user with email and password.

    Returns access and refresh tokens on success.
    """
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info("user_registered", user_id=user.id, email=user.email)

    # Generate tokens
    return await _create_token_response(user, db)


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """
    Login with email and password.

    Returns access and refresh tokens on success.
    """
    # Get user
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    logger.info("user_logged_in", user_id=user.id, email=user.email)

    return await _create_token_response(user, db)


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(
    data: TokenRefresh,
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh an access token using a refresh token.
    """
    # Decode refresh token
    payload = decode_token(data.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Check if token is in database and not revoked
    token_hash = hash_token(data.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.is_revoked.is_(False),
        )
    )
    token_record = result.scalar_one_or_none()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or revoked",
        )

    # Check expiration
    if token_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Get user
    result = await db.execute(select(User).where(User.id == token_record.user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )

    # Update last used
    token_record.last_used_at = datetime.now(timezone.utc)
    await db.commit()

    # Generate new access token
    access_token = create_access_token(user.id)

    return AccessTokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout")
async def logout(
    data: TokenRefresh,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Logout by revoking the refresh token.
    """
    token_hash = hash_token(data.refresh_token)

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == current_user.id,
        )
    )
    token_record = result.scalar_one_or_none()

    if token_record:
        token_record.is_revoked = True
        await db.commit()

    logger.info("user_logged_out", user_id=current_user.id)

    return {"message": "Successfully logged out"}


# ============================================
# OAuth Social Login
# ============================================


@router.get("/providers")
async def get_oauth_providers():
    """Get list of enabled OAuth providers."""
    return {"providers": get_enabled_providers()}


@router.get("/google/login")
async def google_login(request: Request):
    """Initiate Google OAuth login."""
    if not is_google_enabled():
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured",
        )

    redirect_uri = f"{settings.OAUTH_REDIRECT_URL}/google"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback/google")
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback."""
    if not is_google_enabled():
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured",
        )

    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        logger.error("google_oauth_error", error=str(e))
        # Redirect to frontend with error
        return RedirectResponse(
            url="http://localhost:3000/auth/login?error=google_auth_failed"
        )

    user_info = await get_google_user_info(token)
    oauth_response = await _handle_oauth_user(user_info, db)

    # Redirect to frontend with tokens
    redirect_url = (
        f"http://localhost:3000/auth/callback"
        f"?access_token={oauth_response.access_token}"
        f"&refresh_token={oauth_response.refresh_token}"
    )
    return RedirectResponse(url=redirect_url)


@router.get("/github/login")
async def github_login(request: Request):
    """Initiate GitHub OAuth login."""
    if not is_github_enabled():
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="GitHub OAuth not configured",
        )

    redirect_uri = f"{settings.OAUTH_REDIRECT_URL}/github"
    return await oauth.github.authorize_redirect(request, redirect_uri)


@router.get("/callback/github")
async def github_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle GitHub OAuth callback."""
    if not is_github_enabled():
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="GitHub OAuth not configured",
        )

    try:
        token = await oauth.github.authorize_access_token(request)
    except Exception as e:
        logger.error("github_oauth_error", error=str(e))
        # Redirect to frontend with error
        return RedirectResponse(
            url="http://localhost:3000/auth/login?error=github_auth_failed"
        )

    user_info = await get_github_user_info(request, token)
    oauth_response = await _handle_oauth_user(user_info, db)

    # Redirect to frontend with tokens
    redirect_url = (
        f"http://localhost:3000/auth/callback"
        f"?access_token={oauth_response.access_token}"
        f"&refresh_token={oauth_response.refresh_token}"
    )
    return RedirectResponse(url=redirect_url)


# ============================================
# User Profile
# ============================================


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Get current user's profile."""
    return current_user


# ============================================
# API Keys
# ============================================


@router.post(
    "/api-keys", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED
)
async def create_api_key(
    data: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new API key.

    The key is only shown once in the response!
    """
    api_key, key_hash = generate_api_key()

    api_key_obj = APIKey(
        user_id=current_user.id,
        key_hash=key_hash,
        name=data.name,
        scopes=data.scopes,
    )
    db.add(api_key_obj)
    await db.commit()
    await db.refresh(api_key_obj)

    logger.info("api_key_created", user_id=current_user.id, key_name=data.name)

    return APIKeyResponse(
        key=api_key,  # Only returned once
        name=api_key_obj.name,
        scopes=api_key_obj.scopes,
        created_at=api_key_obj.created_at,
        expires_at=api_key_obj.expires_at,
    )


@router.get("/api-keys", response_model=list[APIKeyInfo])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's API keys (without the actual keys)."""
    result = await db.execute(select(APIKey).where(APIKey.user_id == current_user.id))
    return result.scalars().all()


@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an API key."""
    result = await db.execute(
        select(APIKey).where(
            APIKey.id == key_id,
            APIKey.user_id == current_user.id,
        )
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    await db.delete(api_key)
    await db.commit()

    logger.info("api_key_deleted", user_id=current_user.id, key_id=key_id)

    return {"message": "API key deleted"}


# ============================================
# Helper Functions
# ============================================


async def _create_token_response(user: User, db: AsyncSession) -> TokenResponse:
    """Create token response with access and refresh tokens."""
    access_token = create_access_token(user.id)
    refresh_token, token_hash = create_refresh_token(user.id)

    # Store refresh token in database
    token_record = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(token_record)
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


async def _handle_oauth_user(user_info, db: AsyncSession) -> OAuthCallbackResponse:
    """Handle OAuth user - create or update user record."""
    is_new_user = False

    # Check for existing user by OAuth ID
    result = await db.execute(
        select(User).where(
            User.oauth_provider == user_info.provider,
            User.oauth_id == user_info.oauth_id,
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        # Check for existing user by email
        result = await db.execute(select(User).where(User.email == user_info.email))
        user = result.scalar_one_or_none()

        if user:
            # Link OAuth to existing account
            user.oauth_provider = user_info.provider
            user.oauth_id = user_info.oauth_id
            if user_info.avatar_url:
                user.avatar_url = user_info.avatar_url
        else:
            # Create new user
            is_new_user = True
            user = User(
                email=user_info.email,
                full_name=user_info.full_name,
                oauth_provider=user_info.provider,
                oauth_id=user_info.oauth_id,
                avatar_url=user_info.avatar_url,
            )
            db.add(user)

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    logger.info(
        "oauth_login",
        user_id=user.id,
        provider=user_info.provider,
        is_new_user=is_new_user,
    )

    # Generate tokens
    token_response = await _create_token_response(user, db)

    return OAuthCallbackResponse(
        access_token=token_response.access_token,
        refresh_token=token_response.refresh_token,
        expires_in=token_response.expires_in,
        user=UserResponse.model_validate(user),
        is_new_user=is_new_user,
    )
