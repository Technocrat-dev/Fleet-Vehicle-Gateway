"""
Kafka Consumer Service

Consumes telemetry messages from Kafka and processes them through the TelemetryHub.
"""

import asyncio
import json
from typing import Optional
from datetime import datetime

from app.core.config import settings
from app.models.telemetry import VehicleTelemetry, GPSLocation

try:
    from confluent_kafka import Consumer, KafkaError
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False


class TelemetryConsumer:
    """
    Consumes vehicle telemetry from Kafka and forwards to TelemetryHub.
    """
    
    def __init__(self, telemetry_hub):
        self.hub = telemetry_hub
        self.running = False
        self.consumer = None
        self.messages_consumed = 0
        
        if KAFKA_AVAILABLE:
            self.consumer = Consumer({
                "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,
                "group.id": settings.KAFKA_CONSUMER_GROUP,
                "auto.offset.reset": "latest",
                "enable.auto.commit": True,
            })
    
    def _parse_message(self, msg_value: bytes) -> Optional[VehicleTelemetry]:
        """Parse Kafka message to VehicleTelemetry."""
        try:
            data = json.loads(msg_value.decode("utf-8"))
            return VehicleTelemetry(
                vehicle_id=data["vehicle_id"],
                timestamp=datetime.fromisoformat(data["timestamp"]),
                occupancy_count=data["occupancy_count"],
                inference_latency_ms=data["inference_latency_ms"],
                location=GPSLocation(
                    latitude=data["location"]["latitude"],
                    longitude=data["location"]["longitude"],
                ),
                frame_hash=data["frame_hash"],
                consent_status=data.get("consent_status", "granted"),
                route_id=data.get("route_id"),
                speed_kmh=data.get("speed_kmh"),
                heading_degrees=data.get("heading_degrees"),
            )
        except Exception as e:
            print(f"❌ Failed to parse message: {e}")
            return None
    
    async def run(self):
        """Main consumer loop."""
        if not KAFKA_AVAILABLE or not self.consumer:
            print("⚠️  Kafka consumer not available")
            return
        
        self.consumer.subscribe([settings.KAFKA_TOPIC_TELEMETRY])
        self.running = True
        
        print(f"📡 Kafka consumer subscribed to: {settings.KAFKA_TOPIC_TELEMETRY}")
        
        while self.running:
            # Poll for messages (non-blocking with small timeout)
            msg = self.consumer.poll(timeout=0.1)
            
            if msg is None:
                await asyncio.sleep(0.01)
                continue
            
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                print(f"❌ Kafka error: {msg.error()}")
                continue
            
            # Parse and process message
            telemetry = self._parse_message(msg.value())
            if telemetry:
                await self.hub.process_telemetry(telemetry)
                self.messages_consumed += 1
        
        self.consumer.close()
    
    def stop(self):
        """Stop the consumer."""
        self.running = False
