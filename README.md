# Fleet Vehicle Data Gateway

A production-ready edge-to-cloud data pipeline for fleet vehicle monitoring, demonstrating real-time analytics, privacy-preserving ML, and cloud-native architecture.

## 🏗️ Architecture

```
Edge Gateway (Vehicle) → Kafka Streaming → GCP Cloud → Dashboard
     │                         │               │            │
  YOLOv11                  Redpanda       BigQuery     Next.js
  OpenVINO                              Cloud Storage  WebSocket
  Privacy Engine
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- GCP Account (optional, for cloud features)

### Local Development

```bash
# Start infrastructure (Redpanda, Backend, Simulator)
docker-compose up -d

# Access dashboard
open http://localhost:3000

# Access API docs
open http://localhost:8000/docs
```

## 📁 Project Structure

```
fleet-vehicle-gateway/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # REST & WebSocket endpoints
│   │   ├── core/           # Configuration
│   │   ├── services/       # Business logic (Kafka, GCP)
│   │   └── models/         # Pydantic schemas
│   └── Dockerfile
├── edge/                    # Edge gateway & simulator
│   └── src/
│       ├── simulator.py    # Fleet data simulator
│       ├── telemetry.py    # Telemetry models
│       └── kafka_producer.py
├── frontend/               # Next.js dashboard
├── streaming/              # Kafka/Redpanda configs
├── deploy/                 # Deployment configs
└── docker-compose.yml
```

## 🎯 Features

- **Real-time Fleet Monitoring**: WebSocket-powered dashboard showing 50 vehicles
- **Interactive Map**: Vehicle locations with live updates
- **Edge AI Simulation**: YOLOv11 pose estimation for occupancy detection
- **Kafka Streaming**: Redpanda for high-throughput event ingestion
- **GCP Integration**: BigQuery analytics, Cloud Storage archival
- **Privacy-First**: GDPR-compliant data anonymization
- **Production Ready**: Docker, CI/CD, Prometheus metrics

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Edge AI | YOLOv11 + OpenVINO (simulated) |
| Streaming | Redpanda (Kafka-compatible) |
| Backend | FastAPI + Python 3.11 |
| Frontend | Next.js 14 + TypeScript |
| Cloud | GCP BigQuery + Cloud Storage |
| DevOps | Docker, GitHub Actions |

## 📊 API Endpoints

- `GET /api/vehicles` - List all vehicles
- `GET /api/vehicles/{id}` - Vehicle details
- `GET /api/analytics/occupancy` - Occupancy trends
- `WS /ws/telemetry` - Real-time telemetry stream
- `GET /metrics` - Prometheus metrics
- `GET /health` - Health check

## 🚗 Demo Mode

The simulator generates realistic telemetry for 50 vehicles:
- Random occupancy (0-8 passengers)
- GPS movement along Tokyo routes
- Varying inference latency (~9-12ms)
- Privacy consent status

## 📄 License

MIT License
