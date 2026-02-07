"""
Geofence Service - Real-time geofence monitoring and alert generation.

Checks vehicle positions against active geofences and creates Alert records
when vehicles enter or exit geofence boundaries.
"""

import json
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, List, Any
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.models.db_models import Geofence, Alert


@dataclass
class VehicleGeofenceState:
    """Tracks a vehicle's position relative to geofences."""
    vehicle_id: str
    inside_geofences: set  # Set of geofence IDs the vehicle is currently inside
    last_check: datetime
    last_alerts: Dict[int, datetime]  # geofence_id -> last alert time


class GeofenceService:
    """
    Service for monitoring vehicle positions against geofences.
    
    Features:
    - Tracks which geofences each vehicle is inside
    - Detects enter/exit events when vehicles cross boundaries
    - Creates Alert records for boundary crossings
    - Implements cooldown to prevent alert spam
    """
    
    # Cooldown period between alerts for same vehicle/geofence
    ALERT_COOLDOWN_SECONDS = 300  # 5 minutes
    
    def __init__(self):
        self.vehicle_states: Dict[str, VehicleGeofenceState] = {}
        self._lock = asyncio.Lock()
        self._alert_callbacks: List = []  # Callbacks to notify on new alerts
    
    def register_alert_callback(self, callback):
        """Register a callback to be called when new alerts are created."""
        self._alert_callbacks.append(callback)
    
    async def check_vehicle(
        self,
        vehicle_id: str,
        latitude: float,
        longitude: float,
    ) -> List[Dict[str, Any]]:
        """
        Check a vehicle's position against all active geofences.
        
        Args:
            vehicle_id: Vehicle identifier
            latitude: Current latitude
            longitude: Current longitude
            
        Returns:
            List of alert events generated (enter/exit)
        """
        async with self._lock:
            # Get or create vehicle state
            if vehicle_id not in self.vehicle_states:
                self.vehicle_states[vehicle_id] = VehicleGeofenceState(
                    vehicle_id=vehicle_id,
                    inside_geofences=set(),
                    last_check=datetime.now(timezone.utc),
                    last_alerts={},
                )
            
            state = self.vehicle_states[vehicle_id]
            now = datetime.now(timezone.utc)
            alerts_generated = []
            
            # Get all active geofences from database
            async with async_session_maker() as db:
                result = await db.execute(
                    select(Geofence).where(Geofence.is_active)
                )
                geofences = result.scalars().all()
                
                # Check each geofence
                currently_inside = set()
                
                for geofence in geofences:
                    polygon = json.loads(geofence.polygon)
                    is_inside = self._point_in_polygon(latitude, longitude, polygon)
                    
                    if is_inside:
                        currently_inside.add(geofence.id)
                    
                    # Detect enter event
                    was_inside = geofence.id in state.inside_geofences
                    
                    if is_inside and not was_inside:
                        # Vehicle entered geofence
                        if geofence.alert_on_enter and self._can_alert(state, geofence.id, now):
                            alert = await self._create_alert(
                                db=db,
                                user_id=geofence.user_id,
                                geofence=geofence,
                                vehicle_id=vehicle_id,
                                event_type="enter",
                            )
                            if alert:
                                alerts_generated.append(alert)
                                state.last_alerts[geofence.id] = now
                    
                    elif not is_inside and was_inside:
                        # Vehicle exited geofence
                        if geofence.alert_on_exit and self._can_alert(state, geofence.id, now):
                            alert = await self._create_alert(
                                db=db,
                                user_id=geofence.user_id,
                                geofence=geofence,
                                vehicle_id=vehicle_id,
                                event_type="exit",
                            )
                            if alert:
                                alerts_generated.append(alert)
                                state.last_alerts[geofence.id] = now
                
                # Update vehicle state
                state.inside_geofences = currently_inside
                state.last_check = now
                
                # Commit any alerts
                if alerts_generated:
                    await db.commit()
            
            # Notify callbacks
            for alert in alerts_generated:
                for callback in self._alert_callbacks:
                    try:
                        await callback(alert)
                    except Exception as e:
                        print(f"Alert callback error: {e}")
            
            return alerts_generated
    
    def _can_alert(self, state: VehicleGeofenceState, geofence_id: int, now: datetime) -> bool:
        """Check if enough time has passed since the last alert for this geofence."""
        last_alert = state.last_alerts.get(geofence_id)
        if last_alert is None:
            return True
        
        cooldown = timedelta(seconds=self.ALERT_COOLDOWN_SECONDS)
        return (now - last_alert) > cooldown
    
    async def _create_alert(
        self,
        db: AsyncSession,
        user_id: int,
        geofence: Geofence,
        vehicle_id: str,
        event_type: str,
    ) -> Optional[Dict[str, Any]]:
        """Create an alert record in the database."""
        alert_type = f"geofence_{event_type}"
        title = f"Vehicle {event_type.title()}ed Zone"
        message = f"Vehicle {vehicle_id} has {event_type}ed geofence '{geofence.name}'"
        
        alert = Alert(
            user_id=user_id,
            alert_type=alert_type,
            title=title,
            message=message,
            severity="info",
            vehicle_id=vehicle_id,
            geofence_id=geofence.id,
            extra_data=json.dumps({
                "geofence_name": geofence.name,
                "event_type": event_type,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }),
        )
        
        db.add(alert)
        
        print(f"🔔 Alert: {vehicle_id} {event_type}ed '{geofence.name}'")
        
        return {
            "id": None,  # Will be set after commit
            "alert_type": alert_type,
            "title": title,
            "message": message,
            "severity": "info",
            "vehicle_id": vehicle_id,
            "geofence_id": geofence.id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    
    @staticmethod
    def _point_in_polygon(lat: float, lng: float, polygon: dict) -> bool:
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
    
    def get_stats(self) -> Dict[str, Any]:
        """Get service statistics."""
        return {
            "vehicles_tracked": len(self.vehicle_states),
            "alert_cooldown_seconds": self.ALERT_COOLDOWN_SECONDS,
        }


# Global service instance
geofence_service = GeofenceService()
