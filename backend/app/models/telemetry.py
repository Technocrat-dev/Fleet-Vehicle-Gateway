"""
Pydantic models for vehicle telemetry data.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class GPSLocation(BaseModel):
    """GPS coordinates."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class VehicleTelemetry(BaseModel):
    """Single telemetry event from a vehicle."""
    vehicle_id: str
    timestamp: datetime
    occupancy_count: int = Field(..., ge=0, le=10)
    inference_latency_ms: float = Field(..., ge=0)
    location: GPSLocation
    frame_hash: str
    consent_status: str = "granted"
    route_id: Optional[str] = None
    speed_kmh: Optional[float] = None
    heading_degrees: Optional[float] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "vehicle_id": "vehicle-001",
                "timestamp": "2026-02-05T09:00:00Z",
                "occupancy_count": 4,
                "inference_latency_ms": 9.6,
                "location": {"latitude": 35.6812, "longitude": 139.7671},
                "frame_hash": "a7f8e3c1...",
                "consent_status": "granted",
                "route_id": "route-tokyo-ginza",
                "speed_kmh": 35.5,
                "heading_degrees": 90.0
            }
        }


class VehicleStatus(BaseModel):
    """Current status of a vehicle."""
    vehicle_id: str
    last_seen: datetime
    occupancy_count: int
    location: GPSLocation
    inference_latency_ms: float
    consent_status: str
    route_id: Optional[str] = None
    speed_kmh: Optional[float] = None
    is_active: bool = True


class VehicleListResponse(BaseModel):
    """Response for listing vehicles."""
    vehicles: List[VehicleStatus]
    total: int
    timestamp: datetime


class FleetSummary(BaseModel):
    """Aggregated fleet statistics."""
    total_vehicles: int
    active_vehicles: int
    total_passengers: int
    average_occupancy: float
    average_latency_ms: float
    consent_granted_count: int
    timestamp: datetime


class OccupancyTrend(BaseModel):
    """Occupancy data point for trends."""
    timestamp: datetime
    vehicle_id: str
    occupancy_count: int


class LatencyMetric(BaseModel):
    """Latency data point."""
    timestamp: datetime
    vehicle_id: str
    latency_ms: float


class AnalyticsResponse(BaseModel):
    """Response for analytics queries."""
    data: List[dict]
    query_time_ms: float
    count: int
