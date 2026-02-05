"""
Kafka Producer for Edge Gateway

Sends vehicle telemetry to Kafka/Redpanda for cloud ingestion.
Includes batching, retry logic, and error handling.
"""

import json
import asyncio
from typing import Optional, List, Callable
from datetime import datetime
import os

try:
    from confluent_kafka import Producer
    from confluent_kafka.admin import AdminClient, NewTopic
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False
    print("⚠️  confluent-kafka not installed. Using mock producer.")

from telemetry import VehicleTelemetry


class KafkaProducerConfig:
    """Configuration for Kafka producer."""
    
    def __init__(
        self,
        bootstrap_servers: str = "localhost:9092",
        topic: str = "fleet-telemetry",
        batch_size: int = 10,
        linger_ms: int = 100,
        acks: str = "all",
        retries: int = 3,
    ):
        self.bootstrap_servers = bootstrap_servers
        self.topic = topic
        self.batch_size = batch_size
        self.linger_ms = linger_ms
        self.acks = acks
        self.retries = retries
    
    @classmethod
    def from_env(cls) -> "KafkaProducerConfig":
        """Load configuration from environment variables."""
        return cls(
            bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
            topic=os.getenv("KAFKA_TOPIC_TELEMETRY", "fleet-telemetry"),
        )


class MockProducer:
    """Mock Kafka producer for development without Kafka."""
    
    def __init__(self, config: KafkaProducerConfig):
        self.config = config
        self.messages_sent = 0
    
    def produce(self, topic: str, key: str, value: str, callback: Callable = None):
        self.messages_sent += 1
        if callback:
            callback(None, None)  # Simulate success
    
    def poll(self, timeout: float = 0):
        pass
    
    def flush(self, timeout: float = 10):
        pass


class TelemetryProducer:
    """
    Produces vehicle telemetry messages to Kafka.
    
    Features:
    - Async-friendly batching
    - Delivery confirmation
    - Error handling with retries
    - Metrics collection
    """
    
    def __init__(self, config: Optional[KafkaProducerConfig] = None):
        self.config = config or KafkaProducerConfig.from_env()
        self.producer = self._create_producer()
        self.messages_sent = 0
        self.messages_failed = 0
        self.last_error: Optional[str] = None
    
    def _create_producer(self):
        """Create Kafka producer with configuration."""
        if not KAFKA_AVAILABLE:
            return MockProducer(self.config)
        
        producer_config = {
            "bootstrap.servers": self.config.bootstrap_servers,
            "linger.ms": self.config.linger_ms,
            "batch.size": self.config.batch_size * 1024,  # KB
            "acks": self.config.acks,
            "retries": self.config.retries,
            "retry.backoff.ms": 100,
            "compression.type": "snappy",
        }
        
        return Producer(producer_config)
    
    def _delivery_callback(self, err, msg):
        """Callback for message delivery confirmation."""
        if err:
            self.messages_failed += 1
            self.last_error = str(err)
            print(f"❌ Delivery failed: {err}")
        else:
            self.messages_sent += 1
    
    def send(self, telemetry: VehicleTelemetry) -> bool:
        """
        Send a single telemetry message to Kafka.
        
        Returns True if message was queued successfully.
        """
        try:
            key = telemetry.vehicle_id.encode("utf-8")
            value = telemetry.to_json().encode("utf-8")
            
            self.producer.produce(
                topic=self.config.topic,
                key=key,
                value=value,
                callback=self._delivery_callback,
            )
            
            # Trigger delivery callbacks
            self.producer.poll(0)
            return True
            
        except Exception as e:
            self.messages_failed += 1
            self.last_error = str(e)
            print(f"❌ Failed to send: {e}")
            return False
    
    def send_batch(self, telemetry_list: List[VehicleTelemetry]) -> int:
        """
        Send a batch of telemetry messages.
        
        Returns the number of messages successfully queued.
        """
        success_count = 0
        for telemetry in telemetry_list:
            if self.send(telemetry):
                success_count += 1
        
        return success_count
    
    def flush(self, timeout: float = 10.0):
        """Wait for all messages to be delivered."""
        self.producer.flush(timeout)
    
    def get_stats(self) -> dict:
        """Get producer statistics."""
        return {
            "messages_sent": self.messages_sent,
            "messages_failed": self.messages_failed,
            "last_error": self.last_error,
            "topic": self.config.topic,
            "bootstrap_servers": self.config.bootstrap_servers,
        }
    
    def close(self):
        """Close the producer."""
        self.flush()


def ensure_topic_exists(
    bootstrap_servers: str,
    topic: str,
    num_partitions: int = 3,
    replication_factor: int = 1,
):
    """
    Create topic if it doesn't exist.
    
    Call this before starting the producer.
    """
    if not KAFKA_AVAILABLE:
        print(f"ℹ️  Mock mode: Skipping topic creation for '{topic}'")
        return
    
    admin = AdminClient({"bootstrap.servers": bootstrap_servers})
    
    # Check if topic exists
    metadata = admin.list_topics(timeout=10)
    if topic in metadata.topics:
        print(f"ℹ️  Topic '{topic}' already exists")
        return
    
    # Create topic
    new_topic = NewTopic(
        topic,
        num_partitions=num_partitions,
        replication_factor=replication_factor,
    )
    
    futures = admin.create_topics([new_topic])
    
    for topic_name, future in futures.items():
        try:
            future.result()
            print(f"✅ Created topic: {topic_name}")
        except Exception as e:
            print(f"❌ Failed to create topic {topic_name}: {e}")


# Example usage and testing
if __name__ == "__main__":
    from simulator import FleetSimulator
    import time
    
    # Initialize
    config = KafkaProducerConfig()
    producer = TelemetryProducer(config)
    simulator = FleetSimulator(vehicle_count=10)
    
    print("🚀 Starting Kafka Producer Test")
    print(f"   Bootstrap: {config.bootstrap_servers}")
    print(f"   Topic: {config.topic}")
    print()
    
    # Generate and send telemetry
    for i in range(5):
        batch = simulator.generate_batch()
        sent = producer.send_batch(batch)
        print(f"📤 Batch {i+1}: Sent {sent}/{len(batch)} messages")
        time.sleep(1)
    
    # Flush and print stats
    producer.flush()
    stats = producer.get_stats()
    print(f"\n📊 Final Stats: {stats}")
