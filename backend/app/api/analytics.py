"""
Analytics API - Endpoints for fleet analytics and trends.

All endpoints require authentication.
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Request, Query, Depends
import time

from app.models.telemetry import AnalyticsResponse
from app.auth.dependencies import get_current_user
from app.models.db_models import User

router = APIRouter()


@router.get("/analytics/occupancy")
async def get_occupancy_trends(
    request: Request,
    limit: int = Query(100, ge=1, le=1000, description="Number of data points"),
    vehicle_id: Optional[str] = Query(None, description="Filter by vehicle"),
    current_user: User = Depends(get_current_user),
):
    """
    Get occupancy trends over time.

    Returns recent occupancy data points for charting.
    Requires authentication.
    """
    start_time = time.time()
    hub = request.app.state.telemetry_hub

    if vehicle_id:
        history = hub.get_vehicle_history(vehicle_id, limit)
    else:
        history = hub.get_recent_history(limit)

    data = [
        {
            "timestamp": t.timestamp.isoformat(),
            "vehicle_id": t.vehicle_id,
            "occupancy_count": t.occupancy_count,
        }
        for t in history
    ]

    query_time = (time.time() - start_time) * 1000

    return AnalyticsResponse(
        data=data,
        query_time_ms=query_time,
        count=len(data),
    )


@router.get("/analytics/latency")
async def get_latency_metrics(
    request: Request,
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
):
    """
    Get inference latency metrics.

    Demonstrates the 9.6ms average latency from OpenVINO optimization.
    Requires authentication.
    """
    start_time = time.time()
    hub = request.app.state.telemetry_hub

    history = hub.get_recent_history(limit)

    data = [
        {
            "timestamp": t.timestamp.isoformat(),
            "vehicle_id": t.vehicle_id,
            "latency_ms": t.inference_latency_ms,
        }
        for t in history
    ]

    # Calculate statistics
    if data:
        latencies = [d["latency_ms"] for d in data]
        stats = {
            "min_ms": min(latencies),
            "max_ms": max(latencies),
            "avg_ms": sum(latencies) / len(latencies),
            "p95_ms": sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0,
        }
    else:
        stats = {"min_ms": 0, "max_ms": 0, "avg_ms": 0, "p95_ms": 0}

    query_time = (time.time() - start_time) * 1000

    return {
        "data": data,
        "stats": stats,
        "query_time_ms": query_time,
        "count": len(data),
    }


@router.get("/analytics/routes")
async def get_route_analytics(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Get analytics grouped by route.

    Shows vehicle distribution across Tokyo routes.
    Requires authentication.
    """
    start_time = time.time()
    hub = request.app.state.telemetry_hub

    vehicles = hub.get_all_vehicles()

    # Group by route
    route_stats = {}
    for v in vehicles:
        route_id = v.route_id or "unknown"
        if route_id not in route_stats:
            route_stats[route_id] = {
                "route_id": route_id,
                "vehicle_count": 0,
                "total_passengers": 0,
                "avg_speed_kmh": 0,
                "speeds": [],
            }
        route_stats[route_id]["vehicle_count"] += 1
        route_stats[route_id]["total_passengers"] += v.occupancy_count
        if v.speed_kmh:
            route_stats[route_id]["speeds"].append(v.speed_kmh)

    # Calculate averages
    data = []
    for route_id, stats in route_stats.items():
        if stats["speeds"]:
            stats["avg_speed_kmh"] = sum(stats["speeds"]) / len(stats["speeds"])
        del stats["speeds"]
        data.append(stats)

    query_time = (time.time() - start_time) * 1000

    return {
        "data": sorted(data, key=lambda x: x["vehicle_count"], reverse=True),
        "query_time_ms": query_time,
        "count": len(data),
    }


@router.get("/analytics/consent")
async def get_consent_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Get GDPR consent status statistics.

    Shows privacy compliance across the fleet.
    Requires authentication.
    """
    hub = request.app.state.telemetry_hub
    vehicles = hub.get_all_vehicles()

    consent_counts = {"granted": 0, "pending": 0, "withdrawn": 0}
    for v in vehicles:
        status = v.consent_status if v.consent_status in consent_counts else "pending"
        consent_counts[status] += 1

    total = sum(consent_counts.values())
    compliance_rate = consent_counts["granted"] / total * 100 if total > 0 else 0

    return {
        "consent_breakdown": consent_counts,
        "compliance_rate_percent": round(compliance_rate, 1),
        "total_vehicles": total,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
