"""
Simulator Service - Runs the fleet simulator for demo mode.

When Kafka is not available, this service generates simulated telemetry
and feeds it directly to the TelemetryHub.
"""

import asyncio
import sys
import os

# Add edge src to path for importing simulator
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "edge", "src"))

from app.core.config import settings
from app.models.telemetry import VehicleTelemetry, GPSLocation


# Inline simulator to avoid import issues
import random
import hashlib
import math
from datetime import datetime
from typing import List, Dict
from dataclasses import dataclass


TOKYO_ROUTES = [
    {"id": "route-shibuya-shinjuku", "waypoints": [(35.6580, 139.7016), (35.6619, 139.6982), (35.6684, 139.6993), (35.6896, 139.7006)]},
    {"id": "route-tokyo-ginza", "waypoints": [(35.6812, 139.7671), (35.6762, 139.7649), (35.6717, 139.7649), (35.6654, 139.7621)]},
    {"id": "route-ikebukuro-loop", "waypoints": [(35.7295, 139.7109), (35.7350, 139.7150), (35.7320, 139.7200), (35.7250, 139.7150)]},
    {"id": "route-odaiba", "waypoints": [(35.6267, 139.7750), (35.6250, 139.7800), (35.6220, 139.7850), (35.6267, 139.7750)]},
    {"id": "route-roppongi-azabu", "waypoints": [(35.6628, 139.7315), (35.6580, 139.7350), (35.6520, 139.7380), (35.6480, 139.7300)]},
    {"id": "route-ueno-asakusa", "waypoints": [(35.7141, 139.7774), (35.7150, 139.7850), (35.7100, 139.7950), (35.7117, 139.7966)]},
    {"id": "route-akihabara", "waypoints": [(35.6984, 139.7731), (35.7010, 139.7750), (35.7000, 139.7780), (35.6960, 139.7760)]},
    {"id": "route-shinagawa", "waypoints": [(35.6284, 139.7387), (35.6250, 139.7400), (35.6220, 139.7450), (35.6284, 139.7387)]},
]


@dataclass
class SimVehicleState:
    vehicle_id: str
    route_index: int
    waypoint_index: int
    progress: float
    speed_kmh: float
    occupancy: int
    heading: float
    consent_status: str


class InlineSimulator:
    """Lightweight inline simulator for the backend."""
    
    def __init__(self, vehicle_count: int = 50):
        self.vehicle_count = vehicle_count
        self.vehicles: Dict[str, SimVehicleState] = {}
        self._init_vehicles()
    
    def _init_vehicles(self):
        for i in range(self.vehicle_count):
            vehicle_id = f"vehicle-{i+1:03d}"
            route_idx = random.randint(0, len(TOKYO_ROUTES) - 1)
            self.vehicles[vehicle_id] = SimVehicleState(
                vehicle_id=vehicle_id,
                route_index=route_idx,
                waypoint_index=0,
                progress=random.random(),
                speed_kmh=random.uniform(20, 50),
                occupancy=random.randint(0, 8),
                heading=random.uniform(0, 360),
                consent_status="granted" if random.random() > 0.02 else "pending",
            )
    
    def _interpolate(self, start: tuple, end: tuple, progress: float) -> tuple:
        lat = start[0] + (end[0] - start[0]) * progress
        lng = start[1] + (end[1] - start[1]) * progress
        return (lat, lng)
    
    def generate_telemetry(self, state: SimVehicleState) -> VehicleTelemetry:
        route = TOKYO_ROUTES[state.route_index]
        waypoints = route["waypoints"]
        
        # Move along route
        state.progress += (state.speed_kmh / 3600) * 10
        if state.progress >= 1.0:
            state.progress = 0.0
            state.waypoint_index = (state.waypoint_index + 1) % (len(waypoints) - 1)
            if random.random() < 0.1:
                state.route_index = random.randint(0, len(TOKYO_ROUTES) - 1)
                state.waypoint_index = 0
        
        # Get position
        current_wp = waypoints[state.waypoint_index]
        next_wp = waypoints[min(state.waypoint_index + 1, len(waypoints) - 1)]
        lat, lng = self._interpolate(current_wp, next_wp, state.progress)
        
        # Update occupancy occasionally
        if random.random() < 0.05:
            state.occupancy = max(0, min(8, state.occupancy + random.randint(-2, 2)))
        
        # Vary speed
        state.speed_kmh = max(10, min(60, state.speed_kmh + random.uniform(-3, 3)))
        
        # Calculate heading
        delta_lng = next_wp[1] - current_wp[1]
        delta_lat = next_wp[0] - current_wp[0]
        state.heading = (math.degrees(math.atan2(delta_lng, delta_lat)) + 360) % 360
        
        # Generate frame hash
        frame_data = f"{state.vehicle_id}:{datetime.now().isoformat()}:{state.occupancy}"
        frame_hash = hashlib.sha256(frame_data.encode()).hexdigest()
        
        return VehicleTelemetry(
            vehicle_id=state.vehicle_id,
            timestamp=datetime.now(),
            occupancy_count=state.occupancy,
            inference_latency_ms=9.6 + random.uniform(-2, 3),
            location=GPSLocation(latitude=lat, longitude=lng),
            frame_hash=frame_hash,
            consent_status=state.consent_status,
            route_id=route["id"],
            speed_kmh=state.speed_kmh,
            heading_degrees=state.heading,
        )
    
    def generate_batch(self) -> List[VehicleTelemetry]:
        return [self.generate_telemetry(s) for s in self.vehicles.values()]


async def start_simulator(telemetry_hub):
    """
    Start the simulator and feed telemetry to the hub.
    
    This is the main entry point for demo mode.
    """
    simulator = InlineSimulator(vehicle_count=settings.SIMULATOR_VEHICLE_COUNT)
    interval_seconds = settings.SIMULATOR_UPDATE_INTERVAL_MS / 1000
    
    print(f"🎮 Simulator started: {settings.SIMULATOR_VEHICLE_COUNT} vehicles")
    print(f"⏱️  Update interval: {settings.SIMULATOR_UPDATE_INTERVAL_MS}ms")
    
    cycle = 0
    while True:
        cycle += 1
        batch = simulator.generate_batch()
        
        for telemetry in batch:
            await telemetry_hub.process_telemetry(telemetry)
        
        if cycle % 10 == 0:
            stats = telemetry_hub.get_stats()
            print(
                f"📊 Cycle {cycle}: "
                f"{stats['vehicle_count']} vehicles, "
                f"{stats['total_passengers']} passengers, "
                f"{stats['websocket_connections']} WS clients"
            )
        
        await asyncio.sleep(interval_seconds)
