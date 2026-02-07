"""
WebSocket API - Real-time telemetry streaming.
"""

import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json

router = APIRouter()


@router.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """
    WebSocket endpoint for real-time telemetry streaming.

    Clients receive live updates as vehicles report telemetry.
    Each message is a JSON object with vehicle telemetry data.

    Example message:
    {
        "vehicle_id": "vehicle-001",
        "timestamp": "2026-02-05T09:00:00Z",
        "occupancy_count": 4,
        "inference_latency_ms": 9.6,
        "location": {"latitude": 35.6812, "longitude": 139.7671},
        ...
    }
    """
    await websocket.accept()

    # Get hub from app state
    hub = websocket.app.state.telemetry_hub
    hub.register_client(websocket)

    print(f"🔌 WebSocket client connected (total: {len(hub.websocket_clients)})")

    try:
        # Send initial fleet state
        vehicles = hub.get_all_vehicles()
        initial_data = {
            "type": "initial_state",
            "vehicles": [v.model_dump() for v in vehicles],
            "count": len(vehicles),
        }
        await websocket.send_text(json.dumps(initial_data, default=str))

        # Keep connection alive, let hub broadcast updates
        while True:
            # Wait for client messages (ping/pong, commands, etc.)
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(), timeout=30.0  # 30 second timeout
                )

                # Handle client commands
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                elif message.get("type") == "subscribe_vehicle":
                    # Could implement per-vehicle subscriptions
                    pass

            except asyncio.TimeoutError:
                # Send heartbeat
                await websocket.send_text(json.dumps({"type": "heartbeat"}))
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
    finally:
        hub.unregister_client(websocket)
        print(
            f"🔌 WebSocket client disconnected (remaining: {len(hub.websocket_clients)})"
        )


@router.websocket("/ws/summary")
async def websocket_summary(websocket: WebSocket):
    """
    WebSocket endpoint for fleet summary updates.

    Sends aggregated fleet statistics every second.
    Lighter-weight than full telemetry stream.
    """
    await websocket.accept()
    hub = websocket.app.state.telemetry_hub

    print("📊 Summary WebSocket connected")

    try:
        while True:
            summary = hub.get_fleet_summary()
            await websocket.send_text(summary.model_dump_json())
            await asyncio.sleep(1.0)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"❌ Summary WebSocket error: {e}")
    finally:
        print("📊 Summary WebSocket disconnected")


# Alert WebSocket clients registry
_alert_clients: set = set()


@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    WebSocket endpoint for real-time alert notifications.

    Clients receive geofence alerts as they occur.
    Each message is a JSON object with alert data.

    Example message:
    {
        "type": "alert",
        "alert_type": "geofence_enter",
        "title": "Vehicle Entered Zone",
        "message": "Vehicle vehicle-001 has entered geofence 'Tokyo Station'",
        "severity": "info",
        "vehicle_id": "vehicle-001",
        "geofence_id": 1,
        "created_at": "2026-02-07T10:00:00Z"
    }
    """
    await websocket.accept()
    _alert_clients.add(websocket)

    print(f"🔔 Alert WebSocket client connected (total: {len(_alert_clients)})")

    # Register callback with geofence service
    from app.services.geofence_service import geofence_service

    async def alert_callback(alert: dict):
        """Send alert to this WebSocket client."""
        try:
            message = {"type": "alert", **alert}
            await websocket.send_text(json.dumps(message, default=str))
        except Exception:
            pass

    geofence_service.register_alert_callback(alert_callback)

    try:
        # Keep connection alive
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)

                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))

            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "heartbeat"}))
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"❌ Alert WebSocket error: {e}")
    finally:
        _alert_clients.discard(websocket)
        # Remove callback
        if alert_callback in geofence_service._alert_callbacks:
            geofence_service._alert_callbacks.remove(alert_callback)
        print(f"🔔 Alert WebSocket disconnected (remaining: {len(_alert_clients)})")
