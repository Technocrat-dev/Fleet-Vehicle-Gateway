"""
Geofencing API - Endpoints for managing geofences and alerts.

All endpoints require authentication.
Users can manage their own geofences and alerts.
Admins can see all geofences (for future admin dashboard).
"""

import json
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Request, Query, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, get_db
from app.models.db_models import User, Geofence, Alert
from app.core.permissions import require_user

router = APIRouter()


# Pydantic schemas
class GeofenceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    polygon: dict  # GeoJSON format
    alert_on_enter: bool = True
    alert_on_exit: bool = True
    color: str = Field(default="#3B82F6", pattern="^#[0-9A-Fa-f]{6}$")


class GeofenceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    polygon: Optional[dict] = None
    alert_on_enter: Optional[bool] = None
    alert_on_exit: Optional[bool] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    is_active: Optional[bool] = None


class GeofenceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    polygon: dict
    alert_on_enter: bool
    alert_on_exit: bool
    color: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AlertResponse(BaseModel):
    id: int
    alert_type: str
    title: str
    message: str
    severity: str
    vehicle_id: Optional[str]
    geofence_id: Optional[int]
    is_read: bool
    is_acknowledged: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Helper function to check point in polygon
def point_in_polygon(lat: float, lng: float, polygon: dict) -> bool:
    """
    Check if a point is inside a GeoJSON polygon using ray casting algorithm.
    """
    if polygon.get("type") != "Polygon":
        return False

    coordinates = polygon.get("coordinates", [[]])
    if not coordinates or not coordinates[0]:
        return False

    ring = coordinates[0]  # Outer ring
    n = len(ring)
    inside = False

    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]  # lng, lat in GeoJSON
        xj, yj = ring[j][0], ring[j][1]

        if ((yi > lat) != (yj > lat)) and (
            lng < (xj - xi) * (lat - yi) / (yj - yi) + xi
        ):
            inside = not inside
        j = i

    return inside


# Geofence CRUD endpoints
@router.post("/geofences", response_model=GeofenceResponse)
async def create_geofence(
    data: GeofenceCreate,
    current_user: User = Depends(require_user),  # Any authenticated user
    db: AsyncSession = Depends(get_db),
):
    """Create a new geofence."""
    # Validate polygon format
    if data.polygon.get("type") != "Polygon":
        raise HTTPException(
            status_code=400, detail="Invalid polygon format. Must be GeoJSON Polygon."
        )

    if not data.polygon.get("coordinates"):
        raise HTTPException(status_code=400, detail="Polygon must have coordinates.")

    geofence = Geofence(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        polygon=json.dumps(data.polygon),
        alert_on_enter=data.alert_on_enter,
        alert_on_exit=data.alert_on_exit,
        color=data.color,
    )

    db.add(geofence)
    await db.commit()
    await db.refresh(geofence)

    return GeofenceResponse(
        id=geofence.id,
        name=geofence.name,
        description=geofence.description,
        polygon=json.loads(geofence.polygon),
        alert_on_enter=geofence.alert_on_enter,
        alert_on_exit=geofence.alert_on_exit,
        color=geofence.color,
        is_active=geofence.is_active,
        created_at=geofence.created_at,
        updated_at=geofence.updated_at,
    )


@router.get("/geofences", response_model=List[GeofenceResponse])
async def list_geofences(
    active_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all geofences for the current user."""
    query = select(Geofence).where(Geofence.user_id == current_user.id)

    if active_only:
        query = query.where(Geofence.is_active)

    query = query.order_by(Geofence.created_at.desc())
    result = await db.execute(query)
    geofences = result.scalars().all()

    return [
        GeofenceResponse(
            id=g.id,
            name=g.name,
            description=g.description,
            polygon=json.loads(g.polygon),
            alert_on_enter=g.alert_on_enter,
            alert_on_exit=g.alert_on_exit,
            color=g.color,
            is_active=g.is_active,
            created_at=g.created_at,
            updated_at=g.updated_at,
        )
        for g in geofences
    ]


@router.get("/geofences/{geofence_id}", response_model=GeofenceResponse)
async def get_geofence(
    geofence_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific geofence."""
    result = await db.execute(
        select(Geofence).where(
            Geofence.id == geofence_id,
            Geofence.user_id == current_user.id,
        )
    )
    geofence = result.scalar_one_or_none()

    if not geofence:
        raise HTTPException(status_code=404, detail="Geofence not found")

    return GeofenceResponse(
        id=geofence.id,
        name=geofence.name,
        description=geofence.description,
        polygon=json.loads(geofence.polygon),
        alert_on_enter=geofence.alert_on_enter,
        alert_on_exit=geofence.alert_on_exit,
        color=geofence.color,
        is_active=geofence.is_active,
        created_at=geofence.created_at,
        updated_at=geofence.updated_at,
    )


@router.put("/geofences/{geofence_id}", response_model=GeofenceResponse)
async def update_geofence(
    geofence_id: int,
    data: GeofenceUpdate,
    current_user: User = Depends(require_user),  # Users can update their own
    db: AsyncSession = Depends(get_db),
):
    """Update a geofence."""
    result = await db.execute(
        select(Geofence).where(
            Geofence.id == geofence_id,
            Geofence.user_id == current_user.id,
        )
    )
    geofence = result.scalar_one_or_none()

    if not geofence:
        raise HTTPException(status_code=404, detail="Geofence not found")

    # Update fields
    if data.name is not None:
        geofence.name = data.name
    if data.description is not None:
        geofence.description = data.description
    if data.polygon is not None:
        if data.polygon.get("type") != "Polygon":
            raise HTTPException(status_code=400, detail="Invalid polygon format")
        geofence.polygon = json.dumps(data.polygon)
    if data.alert_on_enter is not None:
        geofence.alert_on_enter = data.alert_on_enter
    if data.alert_on_exit is not None:
        geofence.alert_on_exit = data.alert_on_exit
    if data.color is not None:
        geofence.color = data.color
    if data.is_active is not None:
        geofence.is_active = data.is_active

    await db.commit()
    await db.refresh(geofence)

    return GeofenceResponse(
        id=geofence.id,
        name=geofence.name,
        description=geofence.description,
        polygon=json.loads(geofence.polygon),
        alert_on_enter=geofence.alert_on_enter,
        alert_on_exit=geofence.alert_on_exit,
        color=geofence.color,
        is_active=geofence.is_active,
        created_at=geofence.created_at,
        updated_at=geofence.updated_at,
    )


@router.delete("/geofences/{geofence_id}")
async def delete_geofence(
    geofence_id: int,
    current_user: User = Depends(require_user),  # Users can delete their own
    db: AsyncSession = Depends(get_db),
):
    """Delete a geofence."""
    result = await db.execute(
        select(Geofence).where(
            Geofence.id == geofence_id,
            Geofence.user_id == current_user.id,
        )
    )
    geofence = result.scalar_one_or_none()

    if not geofence:
        raise HTTPException(status_code=404, detail="Geofence not found")

    await db.delete(geofence)
    await db.commit()

    return {"detail": "Geofence deleted successfully"}


# Alert endpoints
@router.get("/alerts", response_model=List[AlertResponse])
async def list_alerts(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List alerts for the current user."""
    query = select(Alert).where(Alert.user_id == current_user.id)

    if unread_only:
        query = query.where(~Alert.is_read)

    query = query.order_by(Alert.created_at.desc()).limit(limit)
    result = await db.execute(query)
    alerts = result.scalars().all()

    return [
        AlertResponse(
            id=a.id,
            alert_type=a.alert_type,
            title=a.title,
            message=a.message,
            severity=a.severity,
            vehicle_id=a.vehicle_id,
            geofence_id=a.geofence_id,
            is_read=a.is_read,
            is_acknowledged=a.is_acknowledged,
            created_at=a.created_at,
        )
        for a in alerts
    ]


@router.get("/alerts/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get count of unread alerts."""
    from sqlalchemy import func

    result = await db.execute(
        select(func.count(Alert.id)).where(
            Alert.user_id == current_user.id,
            ~Alert.is_read,
        )
    )
    count = result.scalar() or 0

    return {"unread_count": count}


@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark an alert as read."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.user_id == current_user.id,
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True
    await db.commit()

    return {"detail": "Alert marked as read"}


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Acknowledge an alert."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.user_id == current_user.id,
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True
    alert.is_acknowledged = True
    alert.acknowledged_at = datetime.now(timezone.utc)
    await db.commit()

    return {"detail": "Alert acknowledged"}


@router.post("/alerts/read-all")
async def mark_all_alerts_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all alerts as read."""
    from sqlalchemy import update

    await db.execute(
        update(Alert)
        .where(Alert.user_id == current_user.id, ~Alert.is_read)
        .values(is_read=True)
    )
    await db.commit()

    return {"detail": "All alerts marked as read"}


@router.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an alert."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.user_id == current_user.id,
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    await db.delete(alert)
    await db.commit()

    return {"detail": "Alert deleted"}


# Geofence checking endpoint (can be called by telemetry processor)
@router.post("/geofences/check")
async def check_geofences(
    request: Request,
    vehicle_id: str = Query(...),
    latitude: float = Query(...),
    longitude: float = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Check if a vehicle is inside any geofences.
    Returns list of geofences containing the point.
    """
    result = await db.execute(
        select(Geofence).where(
            Geofence.user_id == current_user.id,
            Geofence.is_active,
        )
    )
    geofences = result.scalars().all()

    inside_geofences = []
    for geofence in geofences:
        polygon = json.loads(geofence.polygon)
        if point_in_polygon(latitude, longitude, polygon):
            inside_geofences.append(
                {
                    "id": geofence.id,
                    "name": geofence.name,
                    "alert_on_enter": geofence.alert_on_enter,
                    "alert_on_exit": geofence.alert_on_exit,
                }
            )

    return {
        "vehicle_id": vehicle_id,
        "latitude": latitude,
        "longitude": longitude,
        "inside_geofences": inside_geofences,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
