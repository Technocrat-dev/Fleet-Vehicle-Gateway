"""
Role-based access control permissions for the Fleet Vehicle Gateway.
"""

from typing import List
from fastapi import Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.models.db_models import User, UserRole

# Role hierarchy - higher roles include permissions of lower roles
ROLE_HIERARCHY = {
    UserRole.ADMIN.value: [UserRole.ADMIN.value, UserRole.USER.value],
    UserRole.USER.value: [UserRole.USER.value],
}


class RoleChecker:
    """
    Dependency class for checking user roles.

    Usage:
        # Require admin role
        @router.get("/admin-only")
        async def admin_route(user: User = Depends(require_admin)):
            pass

        # Any authenticated user
        @router.get("/user-route")
        async def user_route(user: User = Depends(require_user)):
            pass
    """

    def __init__(self, allowed_roles: List[UserRole], use_hierarchy: bool = True):
        """
        Initialize RoleChecker.

        Args:
            allowed_roles: List of roles that are allowed to access the endpoint
            use_hierarchy: If True, higher roles include permissions of lower roles
        """
        self.allowed_roles = [
            r.value if isinstance(r, UserRole) else r for r in allowed_roles
        ]
        self.use_hierarchy = use_hierarchy

    async def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        """Check if current user has required role."""
        # Superusers always have access
        if current_user.is_superuser:
            return current_user

        user_role = current_user.role

        if self.use_hierarchy:
            # Check if user's role allows access to any of the allowed roles
            user_allowed_roles = ROLE_HIERARCHY.get(user_role, [user_role])
            has_access = any(role in user_allowed_roles for role in self.allowed_roles)
        else:
            # Direct role matching
            has_access = user_role in self.allowed_roles

        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {', '.join(self.allowed_roles)}",
            )

        return current_user


def require_role(
    allowed_roles: List[UserRole], use_hierarchy: bool = True
) -> RoleChecker:
    """
    Factory function to create a RoleChecker dependency.

    Args:
        allowed_roles: List of roles that are allowed to access the endpoint
        use_hierarchy: If True, higher roles include permissions of lower roles

    Returns:
        RoleChecker instance

    Examples:
        # Only admins
        require_admin = require_role([UserRole.ADMIN])

        # Any authenticated user (admin or regular user)
        require_user = require_role([UserRole.USER])
    """
    return RoleChecker(allowed_roles, use_hierarchy)


# Convenience dependencies
require_admin = require_role([UserRole.ADMIN])
require_user = require_role([UserRole.USER])  # Any authenticated user


def check_resource_ownership(resource_user_id: int, current_user: User) -> bool:
    """
    Check if the current user owns the resource or is an admin.

    Args:
        resource_user_id: ID of the user who owns the resource
        current_user: The currently authenticated user

    Returns:
        True if user has access, raises HTTPException otherwise
    """
    if current_user.is_superuser or current_user.role == UserRole.ADMIN.value:
        return True

    if current_user.id != resource_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this resource",
        )

    return True
