"""
Users API - Endpoints for user profile and role management.

All endpoints require authentication.
"""

from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, get_db
from app.models.db_models import User, UserRole
from app.core.permissions import require_admin

router = APIRouter()


# Pydantic schemas
class UserProfile(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class RoleUpdate(BaseModel):
    role: str


class UserListResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# User profile endpoints
@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Get the current user's profile."""
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        role=current_user.role,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        created_at=current_user.created_at,
        last_login=current_user.last_login,
    )


@router.put("/me", response_model=UserProfile)
async def update_current_user_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile."""
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url

    await db.commit()
    await db.refresh(current_user)

    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        role=current_user.role,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        created_at=current_user.created_at,
        last_login=current_user.last_login,
    )


# Admin-only endpoints
@router.get("/", response_model=List[UserListResponse])
async def list_users(
    current_user: User = Depends(require_admin),  # Admin only
    db: AsyncSession = Depends(get_db),
):
    """List all users. Admin only."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()

    return [
        UserListResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
        )
        for u in users
    ]


@router.put("/{user_id}/role", response_model=UserListResponse)
async def update_user_role(
    user_id: int,
    data: RoleUpdate,
    current_user: User = Depends(require_admin),  # Admin only
    db: AsyncSession = Depends(get_db),
):
    """Update a user's role. Admin only."""
    # Validate role
    valid_roles = [r.value for r in UserRole]
    if data.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
        )

    # Can't modify own role
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own role")

    # Find user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Can't modify superuser
    if user.is_superuser:
        raise HTTPException(status_code=400, detail="Cannot modify superuser role")

    user.role = data.role
    await db.commit()
    await db.refresh(user)

    return UserListResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.put("/{user_id}/activate")
async def activate_user(
    user_id: int,
    current_user: User = Depends(require_admin),  # Admin only
    db: AsyncSession = Depends(get_db),
):
    """Activate a user. Admin only."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own status")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    await db.commit()

    return {"detail": f"User {user.email} activated"}


@router.put("/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_admin),  # Admin only
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a user. Admin only."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_superuser:
        raise HTTPException(status_code=400, detail="Cannot deactivate superuser")

    user.is_active = False
    await db.commit()

    return {"detail": f"User {user.email} deactivated"}
