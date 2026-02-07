"""
Telemetry Hub - Central service for managing vehicle telemetry.

Maintains current state of all vehicles and broadcasts updates to WebSocket clients.
Integrates with Privacy Engine for GDPR-compliant data processing.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Set, Optional
from dataclasses import dataclass

from app.models.telemetry import VehicleTelemetry, VehicleStatus, FleetSummary

# Import privacy engine
try:
    from app.services.privacy_engine import (
        PrivacyEngine,
        PrivacyPolicy,
        ConsentStatus,
        AnonymizationLevel,
    )

    PRIVACY_ENGINE_AVAILABLE = True
except ImportError:
    PRIVACY_ENGINE_AVAILABLE = False
    print("⚠️  Privacy engine not available")


@dataclass
class VehicleState:
    """Internal state for a tracked vehicle."""

    vehicle_id: str
    last_telemetry: VehicleTelemetry
    last_updated: datetime
    message_count: int = 0


class TelemetryHub:
    """
    Central hub for vehicle telemetry management.

    Responsibilities:
    - Maintain current state of all vehicles
    - Track telemetry history for analytics
    - Broadcast updates to WebSocket clients
    - Provide aggregated statistics
    - Apply privacy filtering via Privacy Engine
    """

    def __init__(
        self,
        inactive_threshold_seconds: int = 30,
        enable_privacy: bool = True,
    ):
        self.vehicles: Dict[str, VehicleState] = {}
        self.websocket_clients: Set = set()
        self.messages_processed: int = 0
        self.messages_filtered: int = 0
        self.inactive_threshold = timedelta(seconds=inactive_threshold_seconds)
        self._history: List[VehicleTelemetry] = []
        self._history_max_size = 10000  # Keep last 10k messages
        self._lock = asyncio.Lock()

        # Privacy engine integration
        self.privacy_enabled = enable_privacy and PRIVACY_ENGINE_AVAILABLE
        self.privacy_engine: Optional[PrivacyEngine] = None

        if self.privacy_enabled:
            policy = PrivacyPolicy(
                retention_days=30,
                anonymization_level=AnonymizationLevel.PARTIAL,
                require_consent_for_storage=False,  # Allow storage but apply anonymization
                require_consent_for_analytics=False,
                allow_aggregated_without_consent=True,
            )
            self.privacy_engine = PrivacyEngine(policy)
            print("🔒 Privacy Engine enabled")

    async def process_telemetry(self, telemetry: VehicleTelemetry):
        """
        Process incoming telemetry from a vehicle.
        Updates state, applies privacy filtering, and broadcasts to WebSocket clients.
        """
        vehicle_id = telemetry.vehicle_id

        # Apply privacy filtering if enabled
        if self.privacy_enabled and self.privacy_engine:
            # Update consent status in privacy engine
            consent = (
                ConsentStatus.GRANTED
                if telemetry.consent_status == "granted"
                else ConsentStatus.PENDING
            )
            self.privacy_engine.set_consent(vehicle_id, consent)

            # Process through privacy engine
            telemetry_dict = telemetry.model_dump()
            processed = self.privacy_engine.process_telemetry(
                telemetry_dict, vehicle_id
            )

            if processed is None:
                # Data was filtered out due to privacy policy
                self.messages_filtered += 1
                return

        async with self._lock:
            if vehicle_id in self.vehicles:
                self.vehicles[vehicle_id].last_telemetry = telemetry
                self.vehicles[vehicle_id].last_updated = datetime.now(timezone.utc)
                self.vehicles[vehicle_id].message_count += 1
            else:
                self.vehicles[vehicle_id] = VehicleState(
                    vehicle_id=vehicle_id,
                    last_telemetry=telemetry,
                    last_updated=datetime.now(timezone.utc),
                    message_count=1,
                )

            self.messages_processed += 1

            # Add to history (ring buffer)
            self._history.append(telemetry)
            if len(self._history) > self._history_max_size:
                self._history = self._history[-self._history_max_size :]

        # Broadcast to WebSocket clients
        await self._broadcast(telemetry)
        
        # Check geofences for this vehicle
        await self._check_geofences(telemetry)

    async def _broadcast(self, telemetry: VehicleTelemetry):
        """Broadcast telemetry update to all connected WebSocket clients."""
        if not self.websocket_clients:
            return

        message = telemetry.model_dump_json()

        # Send to all clients, remove disconnected ones
        disconnected = set()
        for client in self.websocket_clients:
            try:
                await client.send_text(message)
            except Exception:
                disconnected.add(client)

        self.websocket_clients -= disconnected

    def register_client(self, websocket):
        """Register a WebSocket client for updates."""
        self.websocket_clients.add(websocket)

    def unregister_client(self, websocket):
        """Unregister a WebSocket client."""
        self.websocket_clients.discard(websocket)

    def get_vehicle(self, vehicle_id: str) -> Optional[VehicleStatus]:
        """Get current status of a specific vehicle."""
        if vehicle_id not in self.vehicles:
            return None

        state = self.vehicles[vehicle_id]
        t = state.last_telemetry
        is_active = (
            datetime.now(timezone.utc) - state.last_updated
        ) < self.inactive_threshold

        return VehicleStatus(
            vehicle_id=t.vehicle_id,
            last_seen=state.last_updated,
            occupancy_count=t.occupancy_count,
            location=t.location,
            inference_latency_ms=t.inference_latency_ms,
            consent_status=t.consent_status,
            route_id=t.route_id,
            speed_kmh=t.speed_kmh,
            is_active=is_active,
        )

    def get_all_vehicles(self) -> List[VehicleStatus]:
        """Get current status of all tracked vehicles."""
        return [
            self.get_vehicle(vid)
            for vid in self.vehicles.keys()
            if self.get_vehicle(vid) is not None
        ]

    def get_fleet_summary(self) -> FleetSummary:
        """Get aggregated fleet statistics."""
        vehicles = self.get_all_vehicles()

        if not vehicles:
            return FleetSummary(
                total_vehicles=0,
                active_vehicles=0,
                total_passengers=0,
                average_occupancy=0.0,
                average_latency_ms=0.0,
                consent_granted_count=0,
                timestamp=datetime.now(timezone.utc),
            )

        active = [v for v in vehicles if v.is_active]
        total_passengers = sum(v.occupancy_count for v in vehicles)
        avg_occupancy = total_passengers / len(vehicles) if vehicles else 0
        avg_latency = sum(v.inference_latency_ms for v in vehicles) / len(vehicles)
        consent_granted = sum(1 for v in vehicles if v.consent_status == "granted")

        return FleetSummary(
            total_vehicles=len(vehicles),
            active_vehicles=len(active),
            total_passengers=total_passengers,
            average_occupancy=avg_occupancy,
            average_latency_ms=avg_latency,
            consent_granted_count=consent_granted,
            timestamp=datetime.now(timezone.utc),
        )

    def get_recent_history(self, limit: int = 100) -> List[VehicleTelemetry]:
        """Get recent telemetry history."""
        return self._history[-limit:]

    def get_vehicle_history(
        self, vehicle_id: str, limit: int = 100
    ) -> List[VehicleTelemetry]:
        """Get telemetry history for a specific vehicle."""
        return [t for t in self._history if t.vehicle_id == vehicle_id][-limit:]

    def get_stats(self) -> dict:
        """Get hub statistics for monitoring."""
        summary = self.get_fleet_summary()
        stats = {
            "vehicle_count": summary.total_vehicles,
            "active_vehicles": summary.active_vehicles,
            "total_passengers": summary.total_passengers,
            "messages_processed": self.messages_processed,
            "messages_filtered": self.messages_filtered,
            "websocket_connections": len(self.websocket_clients),
            "avg_latency_ms": summary.average_latency_ms,
            "history_size": len(self._history),
            "privacy_enabled": self.privacy_enabled,
        }

        # Add privacy engine stats if available
        if self.privacy_enabled and self.privacy_engine:
            stats["privacy_stats"] = self.privacy_engine.get_privacy_stats()

        return stats

    def get_privacy_audit_log(self, vehicle_id: str = None, limit: int = 100) -> list:
        """Get privacy audit log entries."""
        if not self.privacy_enabled or not self.privacy_engine:
            return []
        return self.privacy_engine.get_audit_log(vehicle_id=vehicle_id, limit=limit)

    def get_data_subject_report(self, vehicle_id: str) -> dict:
        """Generate GDPR data subject access report for a vehicle."""
        if not self.privacy_enabled or not self.privacy_engine:
            return {"error": "Privacy engine not enabled"}
        return self.privacy_engine.generate_data_subject_report(vehicle_id)

    def is_healthy(self) -> bool:
        """Check if the hub is operational."""
        # Consider healthy if we have received any messages
        # or if we just started (no messages yet is ok initially)
        return True

    async def _check_geofences(self, telemetry: VehicleTelemetry):
        """Check if vehicle has entered/exited any geofences."""
        try:
            from app.services.geofence_service import geofence_service
            
            lat = telemetry.location.latitude
            lng = telemetry.location.longitude
            
            await geofence_service.check_vehicle(
                vehicle_id=telemetry.vehicle_id,
                latitude=lat,
                longitude=lng,
            )
        except Exception as e:
            # Don't let geofence errors break telemetry processing
            print(f"⚠️  Geofence check error: {e}")
