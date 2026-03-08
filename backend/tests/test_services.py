"""
Service-Level Unit Tests

Tests for core services and utilities that don't require a full app context:
- geo_utils.point_in_polygon
- PrivacyEngine
- TelemetryHub (in-memory operations)
"""

import pytest
from datetime import datetime, timezone

from app.core.geo_utils import point_in_polygon
from app.services.privacy_engine import (
    PrivacyEngine,
    PrivacyPolicy,
    ConsentStatus,
    AnonymizationLevel,
)
from app.services.telemetry_hub import TelemetryHub
from app.models.telemetry import VehicleTelemetry, GPSLocation


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

TOKYO_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [139.74, 35.66],
            [139.78, 35.66],
            [139.78, 35.70],
            [139.74, 35.70],
            [139.74, 35.66],
        ]
    ],
}

OUTSIDE_POINT = (35.50, 139.50)
INSIDE_POINT = (35.68, 139.76)


def _make_telemetry(
    vehicle_id: str = "vehicle-001",
    occupancy: int = 3,
    lat: float = 35.6812,
    lng: float = 139.7671,
) -> VehicleTelemetry:
    return VehicleTelemetry(
        vehicle_id=vehicle_id,
        timestamp=datetime.now(timezone.utc),
        occupancy_count=occupancy,
        inference_latency_ms=9.6,
        location=GPSLocation(latitude=lat, longitude=lng),
        frame_hash="abc123",
        consent_status="granted",
        route_id="route-tokyo-ginza",
        speed_kmh=35.0,
        heading_degrees=90.0,
    )


# ===================================================================
# Fix 1 — geo_utils.point_in_polygon
# ===================================================================


class TestPointInPolygon:
    """Verify the shared ray-casting implementation."""

    def test_point_inside(self):
        assert point_in_polygon(*INSIDE_POINT, TOKYO_POLYGON) is True

    def test_point_outside(self):
        assert point_in_polygon(*OUTSIDE_POINT, TOKYO_POLYGON) is False

    def test_invalid_polygon_type(self):
        bad = {"type": "LineString", "coordinates": []}
        assert point_in_polygon(35.68, 139.76, bad) is False

    def test_empty_coordinates(self):
        bad = {"type": "Polygon", "coordinates": []}
        assert point_in_polygon(35.68, 139.76, bad) is False

    def test_empty_ring(self):
        bad = {"type": "Polygon", "coordinates": [[]]}
        assert point_in_polygon(35.68, 139.76, bad) is False


# ===================================================================
# Fix 3 — PrivacyEngine
# ===================================================================


class TestPrivacyEngine:
    """Verify GDPR-compliant privacy engine logic."""

    def _engine(self, **kwargs) -> PrivacyEngine:
        policy = PrivacyPolicy(**kwargs)
        return PrivacyEngine(policy)

    def test_consent_default_pending(self):
        engine = self._engine()
        assert engine.get_consent("v-1") == ConsentStatus.PENDING

    def test_consent_set_and_get(self):
        engine = self._engine()
        engine.set_consent("v-1", ConsentStatus.GRANTED)
        assert engine.get_consent("v-1") == ConsentStatus.GRANTED

    def test_process_telemetry_granted(self):
        engine = self._engine()
        engine.set_consent("v-1", ConsentStatus.GRANTED)
        data = {"vehicle_id": "v-1", "occupancy_count": 4}
        result = engine.process_telemetry(data)
        assert result is not None

    def test_process_telemetry_rejected_without_consent(self):
        engine = self._engine(require_consent_for_storage=True)
        data = {"vehicle_id": "v-1", "occupancy_count": 4}
        result = engine.process_telemetry(data)
        assert result is None

    def test_pii_redaction(self):
        engine = self._engine(anonymization_level=AnonymizationLevel.PARTIAL)
        engine.set_consent("v-1", ConsentStatus.GRANTED)
        data = {
            "vehicle_id": "v-1",
            "driver_id": "DRV-12345",
            "email": "john@example.com",
        }
        result = engine.process_telemetry(data)
        assert result is not None
        # driver_id is first field-redacted to "[REDACTED]", then the
        # regex scanner further matches the string; just verify it is
        # no longer the original value.
        assert result.get("driver_id") != "DRV-12345"

    def test_audit_log_populated(self):
        engine = self._engine()
        engine.set_consent("v-1", ConsentStatus.GRANTED)
        data = {"vehicle_id": "v-1", "occupancy_count": 2}
        engine.process_telemetry(data)

        log = engine.get_audit_log(vehicle_id="v-1")
        assert len(log) >= 1

    def test_dsar_report(self):
        engine = self._engine()
        engine.set_consent("v-1", ConsentStatus.GRANTED)
        data = {"vehicle_id": "v-1"}
        engine.process_telemetry(data)

        report = engine.generate_data_subject_report("v-1")
        assert report["vehicle_id"] == "v-1"
        assert report["consent_status"] == "granted"

    def test_privacy_stats(self):
        engine = self._engine()
        engine.set_consent("v-1", ConsentStatus.GRANTED)
        stats = engine.get_privacy_stats()
        assert stats["total_vehicles_tracked"] == 1


# ===================================================================
# Fix 5 — TelemetryHub
# ===================================================================


class TestTelemetryHub:
    """Verify TelemetryHub in-memory operations."""

    @pytest.mark.asyncio
    async def test_process_and_retrieve(self):
        hub = TelemetryHub()
        t = _make_telemetry("v-001")
        await hub.process_telemetry(t)

        vehicle = hub.get_vehicle("v-001")
        assert vehicle is not None
        assert vehicle.vehicle_id == "v-001"
        assert vehicle.occupancy_count == 3

    @pytest.mark.asyncio
    async def test_get_vehicle_not_found(self):
        hub = TelemetryHub()
        assert hub.get_vehicle("nonexistent") is None

    @pytest.mark.asyncio
    async def test_get_all_vehicles_no_duplicates(self):
        """Ensure get_all_vehicles returns each vehicle exactly once."""
        hub = TelemetryHub()
        for i in range(5):
            await hub.process_telemetry(_make_telemetry(f"v-{i:03d}"))

        vehicles = hub.get_all_vehicles()
        ids = [v.vehicle_id for v in vehicles]
        assert len(ids) == 5
        assert len(set(ids)) == 5  # no duplicates

    @pytest.mark.asyncio
    async def test_fleet_summary(self):
        hub = TelemetryHub()
        await hub.process_telemetry(_make_telemetry("v-001", occupancy=2))
        await hub.process_telemetry(_make_telemetry("v-002", occupancy=5))

        summary = hub.get_fleet_summary()
        assert summary.total_vehicles == 2
        assert summary.total_passengers == 7

    @pytest.mark.asyncio
    async def test_history_bounded(self):
        hub = TelemetryHub()
        hub._history_max_size = 5  # shrink for test
        for i in range(10):
            await hub.process_telemetry(_make_telemetry(f"v-{i:03d}"))

        assert len(hub._history) <= 5
