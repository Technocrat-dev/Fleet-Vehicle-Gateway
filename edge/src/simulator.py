"""
Enhanced Fleet Vehicle Simulator with Real AI Support

Generates realistic telemetry data for fleet vehicles.
Can use either:
- Real AI inference (YOLOv11 + OpenVINO) when available
- Simulated inference for demo/development mode
"""

import asyncio
import random
import hashlib
import math
import os
from datetime import datetime, timezone
from typing import List, Dict, Optional, Callable, Union
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from telemetry import VehicleTelemetry, GPSLocation, generate_frame_hash

# Try importing AI inference module
try:
    from ai_inference import YOLOv11PoseEstimator, InferenceResult
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    print("ℹ️  AI inference module not available. Using simulation mode.")


# Tokyo area routes (realistic coordinates)
TOKYO_ROUTES = [
    {
        "id": "route-shibuya-shinjuku",
        "name": "Shibuya → Shinjuku",
        "waypoints": [
            (35.6580, 139.7016),  # Shibuya Station
            (35.6619, 139.6982),  # Harajuku
            (35.6684, 139.6993),  # Yoyogi
            (35.6896, 139.7006),  # Shinjuku Station
        ]
    },
    {
        "id": "route-tokyo-ginza",
        "name": "Tokyo Station → Ginza",
        "waypoints": [
            (35.6812, 139.7671),  # Tokyo Station
            (35.6762, 139.7649),  # Yurakucho
            (35.6717, 139.7649),  # Ginza
            (35.6654, 139.7621),  # Higashi-Ginza
        ]
    },
    {
        "id": "route-ikebukuro-loop",
        "name": "Ikebukuro Loop",
        "waypoints": [
            (35.7295, 139.7109),  # Ikebukuro Station
            (35.7350, 139.7150),  # North
            (35.7320, 139.7200),  # East
            (35.7250, 139.7150),  # South
            (35.7295, 139.7109),  # Back to station
        ]
    },
    {
        "id": "route-odaiba",
        "name": "Odaiba Waterfront",
        "waypoints": [
            (35.6267, 139.7750),  # Odaiba Seaside Park
            (35.6250, 139.7800),  # Palette Town
            (35.6220, 139.7850),  # Tokyo Big Sight
            (35.6267, 139.7750),  # Return
        ]
    },
    {
        "id": "route-roppongi-azabu",
        "name": "Roppongi → Azabu",
        "waypoints": [
            (35.6628, 139.7315),  # Roppongi Hills
            (35.6580, 139.7350),  # Azabu-Juban
            (35.6520, 139.7380),  # Hiroo
            (35.6480, 139.7300),  # Minami-Azabu
        ]
    },
    {
        "id": "route-ueno-asakusa",
        "name": "Ueno → Asakusa",
        "waypoints": [
            (35.7141, 139.7774),  # Ueno Station
            (35.7150, 139.7850),  # Ueno Park
            (35.7100, 139.7950),  # Asakusa
            (35.7117, 139.7966),  # Senso-ji Temple
        ]
    },
    {
        "id": "route-akihabara",
        "name": "Akihabara Circuit",
        "waypoints": [
            (35.6984, 139.7731),  # Akihabara Station
            (35.7010, 139.7750),  # Electric Town
            (35.7000, 139.7780),  # East
            (35.6960, 139.7760),  # South
            (35.6984, 139.7731),  # Return
        ]
    },
    {
        "id": "route-shinagawa",
        "name": "Shinagawa Business District",
        "waypoints": [
            (35.6284, 139.7387),  # Shinagawa Station
            (35.6250, 139.7400),  # Konan Exit
            (35.6220, 139.7450),  # Waterfront
            (35.6284, 139.7387),  # Return
        ]
    },
]


@dataclass
class VehicleState:
    """Internal state for a simulated vehicle."""
    vehicle_id: str
    route_index: int
    waypoint_index: int
    progress: float  # 0.0 to 1.0 between waypoints
    speed_kmh: float
    occupancy: int
    heading: float
    last_occupancy_change: datetime
    consent_status: str


class FleetSimulator:
    """
    Simulates a fleet of vehicles generating telemetry data.
    
    Features:
    - 50 vehicles following realistic Tokyo routes
    - Varying occupancy (passengers getting on/off)
    - Realistic GPS movement
    - Real AI inference when available, simulated otherwise
    - Privacy consent status tracking
    
    Modes:
    - AI Mode: Uses YOLOv11 + OpenVINO for real inference
    - Simulation Mode: Generates realistic fake data
    """
    
    def __init__(
        self,
        vehicle_count: int = 50,
        update_interval_ms: int = 1000,
        base_latency_ms: float = 9.6,
        use_real_ai: bool = True,
        ai_model_variant: str = "medium",
    ):
        """
        Initialize the fleet simulator.
        
        Args:
            vehicle_count: Number of vehicles to simulate
            update_interval_ms: Update interval in milliseconds
            base_latency_ms: Base inference latency for simulation mode
            use_real_ai: Whether to use real AI inference (if available)
            ai_model_variant: YOLO model variant ('nano', 'small', 'medium', 'large')
        """
        self.vehicle_count = vehicle_count
        self.update_interval_ms = update_interval_ms
        self.base_latency_ms = base_latency_ms
        self.vehicles: Dict[str, VehicleState] = {}
        self.running = False
        
        # AI inference setup
        self.use_real_ai = use_real_ai and AI_AVAILABLE
        self.ai_estimator: Optional[YOLOv11PoseEstimator] = None
        
        if self.use_real_ai:
            try:
                self.ai_estimator = YOLOv11PoseEstimator(
                    model_variant=ai_model_variant,
                    use_openvino=True,
                )
                if self.ai_estimator.is_initialized:
                    print(f"🤖 AI Mode: YOLOv11{ai_model_variant[0]}-pose + OpenVINO")
                    self.ai_estimator.warmup()
                else:
                    print("⚠️  AI model failed to initialize. Falling back to simulation.")
                    self.use_real_ai = False
            except Exception as e:
                print(f"⚠️  AI initialization error: {e}. Using simulation mode.")
                self.use_real_ai = False
        
        if not self.use_real_ai:
            print("🎮 Simulation Mode: Generating synthetic telemetry")
        
        self._initialize_vehicles()
    
    def _initialize_vehicles(self):
        """Create initial state for all vehicles."""
        for i in range(self.vehicle_count):
            vehicle_id = f"vehicle-{i+1:03d}"
            route = random.choice(TOKYO_ROUTES)
            route_idx = TOKYO_ROUTES.index(route)
            
            self.vehicles[vehicle_id] = VehicleState(
                vehicle_id=vehicle_id,
                route_index=route_idx,
                waypoint_index=0,
                progress=random.random(),  # Start at random position
                speed_kmh=random.uniform(20, 50),
                occupancy=random.randint(0, 8),
                heading=random.uniform(0, 360),
                last_occupancy_change=datetime.now(timezone.utc),
                consent_status="granted" if random.random() > 0.02 else "pending",
            )
    
    def _interpolate_position(
        self, 
        start: tuple, 
        end: tuple, 
        progress: float
    ) -> GPSLocation:
        """Interpolate GPS position between two waypoints."""
        lat = start[0] + (end[0] - start[0]) * progress
        lng = start[1] + (end[1] - start[1]) * progress
        return GPSLocation(latitude=lat, longitude=lng)
    
    def _calculate_heading(self, start: tuple, end: tuple) -> float:
        """Calculate heading in degrees (0 = North, 90 = East)."""
        delta_lng = end[1] - start[1]
        delta_lat = end[0] - start[0]
        heading = math.degrees(math.atan2(delta_lng, delta_lat))
        return (heading + 360) % 360
    
    def _generate_dummy_frame(self, occupancy: int) -> np.ndarray:
        """Generate a dummy frame for AI inference testing."""
        # Create a frame with some random patterns
        frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        return frame
    
    def _update_vehicle(self, state: VehicleState) -> VehicleTelemetry:
        """Update a single vehicle's state and generate telemetry."""
        route = TOKYO_ROUTES[state.route_index]
        waypoints = route["waypoints"]
        
        # Move vehicle along route
        speed_factor = state.speed_kmh / 3600  # km/h to km/s
        distance_per_update = speed_factor * (self.update_interval_ms / 1000)
        state.progress += distance_per_update * 10  # Scale for demo
        
        # Check if reached next waypoint
        if state.progress >= 1.0:
            state.progress = 0.0
            state.waypoint_index = (state.waypoint_index + 1) % (len(waypoints) - 1)
            
            # Chance to change route at waypoint
            if random.random() < 0.1:
                state.route_index = random.randint(0, len(TOKYO_ROUTES) - 1)
                state.waypoint_index = 0
        
        # Get current position
        current_wp = waypoints[state.waypoint_index]
        next_wp_idx = min(state.waypoint_index + 1, len(waypoints) - 1)
        next_wp = waypoints[next_wp_idx]
        
        location = self._interpolate_position(current_wp, next_wp, state.progress)
        state.heading = self._calculate_heading(current_wp, next_wp)
        
        # Vary speed slightly
        state.speed_kmh = max(10, min(60, state.speed_kmh + random.uniform(-5, 5)))
        
        # Run inference (real or simulated)
        if self.use_real_ai and self.ai_estimator:
            # Generate dummy frame and run real inference
            dummy_frame = self._generate_dummy_frame(state.occupancy)
            result = self.ai_estimator.detect(dummy_frame, state.vehicle_id)
            
            occupancy = result.occupancy_count
            latency = result.inference_latency_ms
            frame_hash = result.frame_hash
        else:
            # Simulated inference
            # Randomly change occupancy (passengers on/off)
            time_since_change = (datetime.now(timezone.utc) - state.last_occupancy_change).seconds
            if time_since_change > 10 and random.random() < 0.1:
                change = random.randint(-2, 2)
                state.occupancy = max(0, min(8, state.occupancy + change))
                state.last_occupancy_change = datetime.now(timezone.utc)
            
            occupancy = state.occupancy
            latency = self.base_latency_ms + random.uniform(-2, 3)
            frame_data = f"{state.vehicle_id}:{datetime.now(timezone.utc).isoformat()}:{occupancy}"
            frame_hash = generate_frame_hash(frame_data.encode())
        
        return VehicleTelemetry(
            vehicle_id=state.vehicle_id,
            timestamp=datetime.now(timezone.utc),
            occupancy_count=occupancy,
            inference_latency_ms=latency,
            location=location,
            frame_hash=frame_hash,
            consent_status=state.consent_status,
            route_id=route["id"],
            speed_kmh=state.speed_kmh,
            heading_degrees=state.heading,
        )
    
    def generate_batch(self) -> List[VehicleTelemetry]:
        """Generate telemetry for all vehicles (one update cycle)."""
        return [
            self._update_vehicle(state) 
            for state in self.vehicles.values()
        ]
    
    async def run(
        self, 
        callback: Callable[[VehicleTelemetry], None],
        duration_seconds: Optional[int] = None
    ):
        """
        Run the simulator continuously, calling callback for each telemetry event.
        
        Args:
            callback: Function to call with each telemetry event
            duration_seconds: Optional limit on simulation duration
        """
        self.running = True
        start_time = datetime.now(timezone.utc)
        
        mode_str = "AI" if self.use_real_ai else "Simulation"
        print(f"🚗 Starting fleet simulator ({mode_str} mode)")
        print(f"   Vehicles: {self.vehicle_count}")
        print(f"   Routes: {len(TOKYO_ROUTES)} Tokyo routes")
        print(f"   Update interval: {self.update_interval_ms}ms")
        
        cycle = 0
        while self.running:
            cycle += 1
            batch = self.generate_batch()
            
            for telemetry in batch:
                callback(telemetry)
            
            # Log progress every 10 cycles
            if cycle % 10 == 0:
                total_passengers = sum(t.occupancy_count for t in batch)
                avg_latency = sum(t.inference_latency_ms for t in batch) / len(batch)
                print(
                    f"📊 Cycle {cycle}: "
                    f"{len(batch)} vehicles, "
                    f"{total_passengers} passengers, "
                    f"avg latency {avg_latency:.1f}ms"
                )
            
            # Check duration limit
            if duration_seconds:
                elapsed = (datetime.now(timezone.utc) - start_time).seconds
                if elapsed >= duration_seconds:
                    print(f"⏹️  Simulation complete after {elapsed}s")
                    break
            
            await asyncio.sleep(self.update_interval_ms / 1000)
        
        self.running = False
    
    def stop(self):
        """Stop the simulator."""
        self.running = False
    
    def get_stats(self) -> dict:
        """Get simulator statistics."""
        stats = {
            "vehicle_count": self.vehicle_count,
            "mode": "ai" if self.use_real_ai else "simulation",
            "running": self.running,
        }
        
        if self.ai_estimator:
            stats["ai_stats"] = self.ai_estimator.get_stats()
        
        return stats


# Backward-compatible factory function
def create_simulator(
    vehicle_count: int = 50,
    use_real_ai: bool = None,
) -> FleetSimulator:
    """
    Create a fleet simulator with auto-detected AI capability.
    
    Args:
        vehicle_count: Number of vehicles
        use_real_ai: Force AI mode (None = auto-detect)
        
    Returns:
        Configured FleetSimulator instance
    """
    if use_real_ai is None:
        use_real_ai = AI_AVAILABLE
    
    return FleetSimulator(
        vehicle_count=vehicle_count,
        use_real_ai=use_real_ai,
    )


# Main entry point for standalone testing
if __name__ == "__main__":
    import sys
    
    def print_telemetry(telemetry: VehicleTelemetry):
        print(
            f"  {telemetry.vehicle_id}: "
            f"occupancy={telemetry.occupancy_count}, "
            f"lat={telemetry.location.latitude:.4f}, "
            f"lng={telemetry.location.longitude:.4f}, "
            f"latency={telemetry.inference_latency_ms:.1f}ms"
        )
    
    # Check for AI mode flag
    use_ai = "--ai" in sys.argv or "-a" in sys.argv
    
    print("=" * 60)
    print("Fleet Simulator Test")
    print("=" * 60)
    
    simulator = FleetSimulator(
        vehicle_count=10,  # Use 10 for quick test
        use_real_ai=use_ai,
    )
    
    print(f"\n📈 Simulator stats: {simulator.get_stats()}")
    
    print("\n📍 Testing single batch generation:")
    batch = simulator.generate_batch()
    for t in batch[:5]:  # Print first 5
        print_telemetry(t)
    
    print(f"\n🔄 Testing async simulation (5 seconds):")
    asyncio.run(simulator.run(print_telemetry, duration_seconds=5))
    
    print(f"\n📈 Final stats: {simulator.get_stats()}")
