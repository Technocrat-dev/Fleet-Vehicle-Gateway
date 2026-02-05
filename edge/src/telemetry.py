"""
Telemetry data models for fleet vehicles.
Represents the data structure for vehicle telemetry events.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional
import json
import hashlib


@dataclass
class GPSLocation:
    """GPS coordinates for a vehicle."""
    latitude: float
    longitude: float
    
    def to_dict(self) -> dict:
        return {"latitude": self.latitude, "longitude": self.longitude}


@dataclass
class VehicleTelemetry:
    """
    Telemetry data from a single vehicle at a point in time.
    
    This represents the data packet sent from edge devices to the cloud.
    Designed for GDPR compliance with privacy-preserving fields.
    """
    vehicle_id: str
    timestamp: datetime
    occupancy_count: int  # Number of detected passengers (0-8)
    inference_latency_ms: float  # ML inference time
    location: GPSLocation
    frame_hash: str  # SHA-256 hash for integrity verification
    consent_status: str = "granted"  # GDPR consent: granted/withdrawn/pending
    route_id: Optional[str] = None
    speed_kmh: Optional[float] = None
    heading_degrees: Optional[float] = None  # 0-360, north = 0
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "vehicle_id": self.vehicle_id,
            "timestamp": self.timestamp.isoformat(),
            "occupancy_count": self.occupancy_count,
            "inference_latency_ms": round(self.inference_latency_ms, 2),
            "location": self.location.to_dict(),
            "frame_hash": self.frame_hash,
            "consent_status": self.consent_status,
            "route_id": self.route_id,
            "speed_kmh": round(self.speed_kmh, 1) if self.speed_kmh else None,
            "heading_degrees": round(self.heading_degrees, 1) if self.heading_degrees else None,
        }
    
    def to_json(self) -> str:
        """Serialize to JSON string."""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_dict(cls, data: dict) -> "VehicleTelemetry":
        """Deserialize from dictionary."""
        return cls(
            vehicle_id=data["vehicle_id"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            occupancy_count=data["occupancy_count"],
            inference_latency_ms=data["inference_latency_ms"],
            location=GPSLocation(
                latitude=data["location"]["latitude"],
                longitude=data["location"]["longitude"]
            ),
            frame_hash=data["frame_hash"],
            consent_status=data.get("consent_status", "granted"),
            route_id=data.get("route_id"),
            speed_kmh=data.get("speed_kmh"),
            heading_degrees=data.get("heading_degrees"),
        )
    
    @classmethod
    def from_json(cls, json_str: str) -> "VehicleTelemetry":
        """Deserialize from JSON string."""
        return cls.from_dict(json.loads(json_str))


@dataclass
class FleetSummary:
    """Aggregated summary of fleet status."""
    total_vehicles: int
    active_vehicles: int
    total_passengers: int
    average_occupancy: float
    average_latency_ms: float
    timestamp: datetime
    
    def to_dict(self) -> dict:
        return {
            "total_vehicles": self.total_vehicles,
            "active_vehicles": self.active_vehicles,
            "total_passengers": self.total_passengers,
            "average_occupancy": round(self.average_occupancy, 2),
            "average_latency_ms": round(self.average_latency_ms, 2),
            "timestamp": self.timestamp.isoformat(),
        }


def generate_frame_hash(data: bytes) -> str:
    """Generate SHA-256 hash for frame integrity verification."""
    return hashlib.sha256(data).hexdigest()
