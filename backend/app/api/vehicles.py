"""
Vehicles API - REST endpoints for fleet management.

All endpoints require authentication.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Query, Depends

from app.models.telemetry import (
    VehicleStatus,
    VehicleListResponse,
    FleetSummary,
)
from app.auth.dependencies import get_current_user
from app.models.db_models import User

router = APIRouter()


@router.get("/vehicles", response_model=VehicleListResponse)
async def list_vehicles(
    request: Request,
    active_only: bool = Query(False, description="Only return active vehicles"),
    current_user: User = Depends(get_current_user),
):
    """
    List all tracked vehicles with their current status.

    Returns real-time data from all vehicles in the fleet.
    Requires authentication.
    """
    hub = request.app.state.telemetry_hub
    vehicles = hub.get_all_vehicles()

    if active_only:
        vehicles = [v for v in vehicles if v.is_active]

    return VehicleListResponse(
        vehicles=vehicles,
        total=len(vehicles),
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/vehicles/summary", response_model=FleetSummary)
async def get_fleet_summary(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Get aggregated fleet statistics.

    Includes total passengers, average occupancy, average latency, etc.
    Requires authentication.
    """
    hub = request.app.state.telemetry_hub
    return hub.get_fleet_summary()


@router.get("/vehicles/{vehicle_id}", response_model=VehicleStatus)
async def get_vehicle(
    request: Request,
    vehicle_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed status for a specific vehicle.

    Requires authentication.
    """
    hub = request.app.state.telemetry_hub
    vehicle = hub.get_vehicle(vehicle_id)

    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle '{vehicle_id}' not found")

    return vehicle


@router.get("/vehicles/{vehicle_id}/history")
async def get_vehicle_history(
    request: Request,
    vehicle_id: str,
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
):
    """
    Get telemetry history for a specific vehicle.

    Returns the last N telemetry events from this vehicle.
    Requires authentication.
    """
    hub = request.app.state.telemetry_hub

    # Check vehicle exists
    if not hub.get_vehicle(vehicle_id):
        raise HTTPException(status_code=404, detail=f"Vehicle '{vehicle_id}' not found")

    history = hub.get_vehicle_history(vehicle_id, limit)

    return {
        "vehicle_id": vehicle_id,
        "history": [t.model_dump() for t in history],
        "count": len(history),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
