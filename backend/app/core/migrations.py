"""
Database Migrations

Simple migration scripts that run on application startup.
These ensure the database schema and data are in the expected state.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.core.logging import get_logger
from app.models.db_models import UserRole

logger = get_logger(__name__)


async def run_migrations():
    """Run all database migrations on startup."""
    logger.info("Running database migrations...")
    
    async with async_session_maker() as db:
        await migrate_user_roles(db)
        await db.commit()
    
    logger.info("Database migrations completed")


async def migrate_user_roles(db: AsyncSession):
    """
    Migration: Ensure all users have a valid role.
    
    This fixes users created before the role system was implemented,
    or users with NULL role values.
    """
    # Count users with NULL or empty role
    result = await db.execute(
        text("SELECT COUNT(*) FROM users WHERE role IS NULL OR role = ''")
    )
    count = result.scalar()
    
    if count > 0:
        logger.info(f"Found {count} users with NULL/empty role, setting to 'user'")
        
        # Update all users with NULL or empty role to 'user'
        await db.execute(
            text(f"UPDATE users SET role = :role WHERE role IS NULL OR role = ''"),
            {"role": UserRole.USER.value}
        )
        
        logger.info(f"Updated {count} users to role='user'")
    else:
        logger.info("All users have valid roles")
