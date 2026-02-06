"""
Privacy API - GDPR Compliance Endpoints

Provides REST API endpoints for privacy management:
- Privacy statistics and audit logs
- Data subject access requests (DSAR)
- Consent management
"""

from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Query, HTTPException

from app.core.dependencies import get_telemetry_hub

router = APIRouter(prefix="/privacy", tags=["privacy"])


@router.get("/stats")
async def get_privacy_stats():
    """
    Get privacy engine statistics.

    Returns:
        Privacy metrics including consent breakdown and audit log size
    """
    hub = get_telemetry_hub()

    if not hub.privacy_enabled:
        return {"privacy_enabled": False, "message": "Privacy engine is not enabled"}

    stats = hub.get_stats()
    return {
        "privacy_enabled": True,
        "privacy_stats": stats.get("privacy_stats", {}),
        "messages_filtered": stats.get("messages_filtered", 0),
    }


@router.get("/audit-log")
async def get_audit_log(
    vehicle_id: Optional[str] = Query(None, description="Filter by vehicle ID"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum entries to return"),
):
    """
    Get privacy audit log entries.

    Args:
        vehicle_id: Optional filter by vehicle
        limit: Maximum number of entries

    Returns:
        List of audit log entries with timestamps and operations
    """
    hub = get_telemetry_hub()

    if not hub.privacy_enabled:
        raise HTTPException(status_code=503, detail="Privacy engine is not enabled")

    entries = hub.get_privacy_audit_log(vehicle_id=vehicle_id, limit=limit)

    return {
        "count": len(entries),
        "entries": [
            {
                "timestamp": entry.timestamp.isoformat(),
                "operation": entry.operation,
                "vehicle_id": entry.vehicle_id,
                "consent_status": entry.consent_status,
                "anonymization_applied": entry.anonymization_applied,
                "data_retained": entry.data_retained,
                "reason": entry.reason,
            }
            for entry in entries
        ],
    }


@router.get("/dsar/{vehicle_id}")
async def get_data_subject_report(vehicle_id: str):
    """
    Generate GDPR Data Subject Access Request (DSAR) report.

    This endpoint implements the GDPR right of access (Article 15),
    providing all data and processing activities for a specific vehicle.

    Args:
        vehicle_id: The vehicle identifier to generate report for

    Returns:
        Complete DSAR report including consent status and processing history
    """
    hub = get_telemetry_hub()

    if not hub.privacy_enabled:
        raise HTTPException(status_code=503, detail="Privacy engine is not enabled")

    report = hub.get_data_subject_report(vehicle_id)

    if "error" in report:
        raise HTTPException(status_code=500, detail=report["error"])

    return report


@router.get("/consent/{vehicle_id}")
async def get_consent_status(vehicle_id: str):
    """
    Get consent status for a specific vehicle.

    Args:
        vehicle_id: Vehicle identifier

    Returns:
        Current consent status
    """
    hub = get_telemetry_hub()

    if not hub.privacy_enabled or not hub.privacy_engine:
        raise HTTPException(status_code=503, detail="Privacy engine is not enabled")

    consent = hub.privacy_engine.get_consent(vehicle_id)

    return {
        "vehicle_id": vehicle_id,
        "consent_status": consent.value,
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/retention-policy")
async def get_retention_policy():
    """
    Get current data retention policy configuration.

    Returns:
        Retention policy settings
    """
    hub = get_telemetry_hub()

    if not hub.privacy_enabled or not hub.privacy_engine:
        return {"privacy_enabled": False, "message": "Privacy engine is not enabled"}

    policy = hub.privacy_engine.policy

    return {
        "retention_days": policy.retention_days,
        "anonymization_level": policy.anonymization_level.value,
        "require_consent_for_storage": policy.require_consent_for_storage,
        "require_consent_for_analytics": policy.require_consent_for_analytics,
        "allow_aggregated_without_consent": policy.allow_aggregated_without_consent,
        "pii_fields": list(policy.pii_fields),
    }
