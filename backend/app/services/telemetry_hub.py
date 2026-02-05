"""
Telemetry Hub - Central service for managing vehicle telemetry.

Maintains current state of all vehicles and broadcasts updates to WebSocket clients.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Set, Optional
from dataclasses import dataclass

from app.models.telemetry import VehicleTelemetry, VehicleStatus, FleetSummary


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
    """

    def __init__(self, inactive_threshold_seconds: int = 30):
        self.vehicles: Dict[str, VehicleState] = {}
        self.websocket_clients: Set = set()
        self.messages_processed: int = 0
        self.inactive_threshold = timedelta(seconds=inactive_threshold_seconds)
        self._history: List[VehicleTelemetry] = []
        self._history_max_size = 10000  # Keep last 10k messages
        self._lock = asyncio.Lock()

    async def process_telemetry(self, telemetry: VehicleTelemetry):
        """
        Process incoming telemetry from a vehicle.
        Updates state and broadcasts to WebSocket clients.
        """
        async with self._lock:
            vehicle_id = telemetry.vehicle_id

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
        return {
            "vehicle_count": summary.total_vehicles,
            "active_vehicles": summary.active_vehicles,
            "total_passengers": summary.total_passengers,
            "messages_processed": self.messages_processed,
            "websocket_connections": len(self.websocket_clients),
            "avg_latency_ms": summary.average_latency_ms,
            "history_size": len(self._history),
        }

    def is_healthy(self) -> bool:
        """Check if the hub is operational."""
        # Consider healthy if we have received any messages
        # or if we just started (no messages yet is ok initially)
        return True
