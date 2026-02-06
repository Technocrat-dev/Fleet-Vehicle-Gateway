"""
Privacy Engine - GDPR-Compliant Data Processing

Provides privacy-preserving data processing for fleet telemetry:
- PII detection and anonymization
- Consent-based data filtering
- Data retention policy enforcement
- Frame hash verification for data integrity
"""

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Any, Set
from enum import Enum


class ConsentStatus(Enum):
    """GDPR consent status values."""

    GRANTED = "granted"
    PENDING = "pending"
    WITHDRAWN = "withdrawn"
    EXPIRED = "expired"


class AnonymizationLevel(Enum):
    """Data anonymization levels."""

    NONE = "none"  # Raw data (consent granted)
    PARTIAL = "partial"  # PII redacted but data usable
    FULL = "full"  # All identifying info removed
    AGGREGATED = "aggregated"  # Only statistical data


@dataclass
class PrivacyPolicy:
    """Privacy policy configuration."""

    retention_days: int = 30
    anonymization_level: AnonymizationLevel = AnonymizationLevel.PARTIAL
    require_consent_for_storage: bool = True
    require_consent_for_analytics: bool = False
    allow_aggregated_without_consent: bool = True
    pii_fields: Set[str] = None

    def __post_init__(self):
        if self.pii_fields is None:
            self.pii_fields = {
                "driver_id",
                "driver_name",
                "phone",
                "email",
                "license_plate",
                "vin",
                "passenger_faces",
            }


@dataclass
class PrivacyAuditLog:
    """Audit log entry for privacy operations."""

    timestamp: datetime
    operation: str
    vehicle_id: str
    consent_status: str
    anonymization_applied: str
    data_retained: bool
    reason: str


class PrivacyEngine:
    """
    GDPR-Compliant Privacy Engine for Fleet Data.

    Responsibilities:
    - Enforce consent-based data processing
    - Anonymize PII in telemetry data
    - Track data retention policies
    - Audit all privacy operations
    - Verify data integrity via hashing
    """

    def __init__(self, policy: Optional[PrivacyPolicy] = None):
        """
        Initialize the privacy engine.

        Args:
            policy: Privacy policy configuration
        """
        self.policy = policy or PrivacyPolicy()
        self.audit_log: List[PrivacyAuditLog] = []
        self.consent_registry: Dict[str, ConsentStatus] = {}
        self.data_retention_tracker: Dict[str, datetime] = {}

        # PII patterns for detection
        self._pii_patterns = {
            "email": re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),
            "phone": re.compile(r"\+?[\d\s\-\(\)]{10,}"),
            "license_plate": re.compile(
                r"[A-Z0-9]{2,3}[-\s]?[A-Z0-9]{2,4}[-\s]?[A-Z0-9]{2,4}"
            ),
            "vin": re.compile(r"[A-HJ-NPR-Z0-9]{17}"),
            "ip_address": re.compile(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"),
        }

    def set_consent(self, vehicle_id: str, status: ConsentStatus):
        """
        Update consent status for a vehicle.

        Args:
            vehicle_id: Vehicle identifier
            status: New consent status
        """
        old_status = self.consent_registry.get(vehicle_id)
        self.consent_registry[vehicle_id] = status

        self._log_audit(
            operation="consent_update",
            vehicle_id=vehicle_id,
            consent_status=status.value,
            anonymization_applied="none",
            data_retained=True,
            reason=f"Consent changed from {old_status} to {status.value}",
        )

    def get_consent(self, vehicle_id: str) -> ConsentStatus:
        """Get current consent status for a vehicle."""
        return self.consent_registry.get(vehicle_id, ConsentStatus.PENDING)

    def process_telemetry(
        self,
        telemetry: Dict[str, Any],
        vehicle_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Process telemetry data according to privacy policy.

        Args:
            telemetry: Raw telemetry data
            vehicle_id: Optional vehicle ID override

        Returns:
            Processed telemetry data, or None if data should be discarded
        """
        vid = vehicle_id or telemetry.get("vehicle_id", "unknown")
        consent = self.get_consent(vid)

        # Check if data should be stored based on consent
        if self.policy.require_consent_for_storage:
            if consent not in (ConsentStatus.GRANTED,):
                # Log and discard
                self._log_audit(
                    operation="telemetry_rejected",
                    vehicle_id=vid,
                    consent_status=consent.value,
                    anonymization_applied="none",
                    data_retained=False,
                    reason="Consent not granted for storage",
                )
                return None

        # Apply anonymization based on consent level
        processed = self._anonymize_data(telemetry, consent)

        # Track retention
        self.data_retention_tracker[vid] = datetime.now(timezone.utc)

        # Log successful processing
        self._log_audit(
            operation="telemetry_processed",
            vehicle_id=vid,
            consent_status=consent.value,
            anonymization_applied=self.policy.anonymization_level.value,
            data_retained=True,
            reason="Data processed and stored",
        )

        return processed

    def _anonymize_data(
        self,
        data: Dict[str, Any],
        consent: ConsentStatus,
    ) -> Dict[str, Any]:
        """
        Anonymize data based on consent status and policy.

        Args:
            data: Raw data dictionary
            consent: Current consent status

        Returns:
            Anonymized data dictionary
        """
        result = data.copy()
        level = self.policy.anonymization_level

        # If consent granted and level is none, return as-is
        if consent == ConsentStatus.GRANTED and level == AnonymizationLevel.NONE:
            return result

        # Redact PII fields
        for field in self.policy.pii_fields:
            if field in result:
                result[field] = self._redact_value(result[field], field)

        # Scan string fields for PII patterns
        for key, value in result.items():
            if isinstance(value, str):
                result[key] = self._redact_pii_patterns(value)

        # Apply additional anonymization for higher levels
        if level == AnonymizationLevel.FULL:
            # Remove any potentially identifying metadata
            result.pop("frame_hash", None)
            result.pop("session_id", None)

            # Truncate GPS coordinates to reduce precision
            if "location" in result and isinstance(result["location"], dict):
                if "latitude" in result["location"]:
                    result["location"]["latitude"] = round(
                        result["location"]["latitude"], 2
                    )
                if "longitude" in result["location"]:
                    result["location"]["longitude"] = round(
                        result["location"]["longitude"], 2
                    )

        elif level == AnonymizationLevel.AGGREGATED:
            # Return only aggregate-safe fields
            result = {
                "timestamp": result.get("timestamp"),
                "occupancy_count": result.get("occupancy_count"),
                "route_id": result.get("route_id"),
                "region": self._derive_region(result.get("location")),
            }

        return result

    def _redact_value(self, value: Any, field_name: str) -> str:
        """Redact a PII value."""
        if value is None:
            return None

        value_str = str(value)
        if len(value_str) <= 4:
            return "[REDACTED]"

        # Partial redaction for certain fields
        if field_name in ("email", "phone"):
            return value_str[:2] + "***" + value_str[-2:]

        return "[REDACTED]"

    def _redact_pii_patterns(self, text: str) -> str:
        """Scan and redact PII patterns from text."""
        result = text

        for pattern_name, pattern in self._pii_patterns.items():
            result = pattern.sub(f"[{pattern_name.upper()}_REDACTED]", result)

        return result

    def _derive_region(self, location: Optional[Dict]) -> Optional[str]:
        """Derive approximate region from GPS coordinates."""
        if not location:
            return None

        lat = location.get("latitude", 0)
        lng = location.get("longitude", 0)

        # Round to 1 decimal place (~11km precision)
        return f"region_{round(lat, 1)}_{round(lng, 1)}"

    def verify_frame_hash(
        self,
        frame_data: bytes,
        expected_hash: str,
        vehicle_id: str,
    ) -> bool:
        """
        Verify frame data integrity using hash.

        Args:
            frame_data: Raw frame bytes
            expected_hash: Expected SHA256 hash
            vehicle_id: Vehicle identifier

        Returns:
            True if hash matches, False otherwise
        """
        computed_hash = hashlib.sha256(frame_data).hexdigest()
        is_valid = computed_hash == expected_hash

        if not is_valid:
            self._log_audit(
                operation="hash_verification_failed",
                vehicle_id=vehicle_id,
                consent_status="n/a",
                anonymization_applied="none",
                data_retained=False,
                reason=f"Hash mismatch: expected {expected_hash[:16]}..., got {computed_hash[:16]}...",
            )

        return is_valid

    def enforce_retention_policy(self) -> List[str]:
        """
        Enforce data retention policy by identifying expired data.

        Returns:
            List of vehicle IDs whose data should be purged
        """
        expired_vehicles = []
        cutoff = datetime.now(timezone.utc) - timedelta(days=self.policy.retention_days)

        for vehicle_id, last_update in list(self.data_retention_tracker.items()):
            if last_update < cutoff:
                expired_vehicles.append(vehicle_id)

                self._log_audit(
                    operation="retention_expiry",
                    vehicle_id=vehicle_id,
                    consent_status="n/a",
                    anonymization_applied="none",
                    data_retained=False,
                    reason=f"Data exceeded {self.policy.retention_days} day retention",
                )

        return expired_vehicles

    def _log_audit(
        self,
        operation: str,
        vehicle_id: str,
        consent_status: str,
        anonymization_applied: str,
        data_retained: bool,
        reason: str,
    ):
        """Add entry to audit log."""
        entry = PrivacyAuditLog(
            timestamp=datetime.now(timezone.utc),
            operation=operation,
            vehicle_id=vehicle_id,
            consent_status=consent_status,
            anonymization_applied=anonymization_applied,
            data_retained=data_retained,
            reason=reason,
        )
        self.audit_log.append(entry)

        # Keep audit log bounded
        if len(self.audit_log) > 10000:
            self.audit_log = self.audit_log[-10000:]

    def get_audit_log(
        self,
        vehicle_id: Optional[str] = None,
        operation: Optional[str] = None,
        limit: int = 100,
    ) -> List[PrivacyAuditLog]:
        """
        Get audit log entries.

        Args:
            vehicle_id: Filter by vehicle ID
            operation: Filter by operation type
            limit: Maximum entries to return

        Returns:
            Filtered audit log entries
        """
        entries = self.audit_log

        if vehicle_id:
            entries = [e for e in entries if e.vehicle_id == vehicle_id]

        if operation:
            entries = [e for e in entries if e.operation == operation]

        return entries[-limit:]

    def get_privacy_stats(self) -> Dict[str, Any]:
        """Get privacy engine statistics."""
        consent_counts = {}
        for status in ConsentStatus:
            consent_counts[status.value] = sum(
                1 for s in self.consent_registry.values() if s == status
            )

        return {
            "total_vehicles_tracked": len(self.consent_registry),
            "consent_breakdown": consent_counts,
            "audit_log_size": len(self.audit_log),
            "retention_policy_days": self.policy.retention_days,
            "anonymization_level": self.policy.anonymization_level.value,
        }

    def generate_data_subject_report(self, vehicle_id: str) -> Dict[str, Any]:
        """
        Generate GDPR data subject access report.

        Args:
            vehicle_id: Vehicle identifier

        Returns:
            Report of all data and processing activities for the vehicle
        """
        consent = self.get_consent(vehicle_id)
        audit_entries = self.get_audit_log(vehicle_id=vehicle_id, limit=1000)

        return {
            "vehicle_id": vehicle_id,
            "consent_status": consent.value,
            "last_data_update": self.data_retention_tracker.get(vehicle_id),
            "processing_activities": [
                {
                    "timestamp": e.timestamp.isoformat(),
                    "operation": e.operation,
                    "anonymization": e.anonymization_applied,
                    "retained": e.data_retained,
                }
                for e in audit_entries
            ],
            "report_generated_at": datetime.now(timezone.utc).isoformat(),
        }


# Convenience function for quick anonymization
def anonymize_telemetry(
    telemetry: Dict[str, Any],
    level: AnonymizationLevel = AnonymizationLevel.PARTIAL,
) -> Dict[str, Any]:
    """
    Quick anonymization of telemetry data.

    Args:
        telemetry: Raw telemetry dictionary
        level: Anonymization level

    Returns:
        Anonymized telemetry
    """
    policy = PrivacyPolicy(anonymization_level=level)
    engine = PrivacyEngine(policy)

    # Set consent as granted to process but still apply anonymization
    engine.set_consent(telemetry.get("vehicle_id", "unknown"), ConsentStatus.GRANTED)

    return engine.process_telemetry(telemetry)


# Test code
if __name__ == "__main__":
    print("=" * 60)
    print("Privacy Engine Test")
    print("=" * 60)

    # Create engine with default policy
    engine = PrivacyEngine()

    # Test data
    test_telemetry = {
        "vehicle_id": "vehicle-001",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "occupancy_count": 4,
        "location": {"latitude": 35.6812, "longitude": 139.7671},
        "driver_id": "DRV-12345",
        "driver_email": "john.doe@example.com",
        "phone": "+1-555-123-4567",
        "license_plate": "ABC-1234",
        "notes": "Contact driver at john.doe@example.com or 192.168.1.1",
    }

    print("\n📋 Original Data:")
    for k, v in test_telemetry.items():
        print(f"  {k}: {v}")

    # Grant consent
    engine.set_consent("vehicle-001", ConsentStatus.GRANTED)

    # Process with partial anonymization
    print("\n🔒 Processing with PARTIAL anonymization...")
    processed = engine.process_telemetry(test_telemetry)

    print("\n📋 Anonymized Data:")
    for k, v in processed.items():
        print(f"  {k}: {v}")

    # Test without consent
    print("\n⚠️  Testing without consent...")
    engine.set_consent("vehicle-002", ConsentStatus.PENDING)
    test_telemetry["vehicle_id"] = "vehicle-002"
    result = engine.process_telemetry(test_telemetry)
    print(f"  Result: {'Rejected (None)' if result is None else 'Processed'}")

    # Print stats
    print(f"\n📈 Statistics: {engine.get_privacy_stats()}")

    # Print audit log
    print("\n📜 Recent Audit Log:")
    for entry in engine.get_audit_log(limit=5):
        print(
            f"  [{entry.timestamp.strftime('%H:%M:%S')}] {entry.operation}: {entry.reason}"
        )
