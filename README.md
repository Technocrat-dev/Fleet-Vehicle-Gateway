# Fleet Vehicle Data Gateway

A production-grade demonstration of an edge-to-cloud data pipeline for fleet vehicle monitoring. Features real-time WebSocket streaming, OAuth authentication, and cloud-native architecture — powered by **simulated fleet telemetry**.

> **📌 This is a technical demo** showcasing software engineering skills. Vehicle data is simulated, not from real vehicles.

## 🏗️ Architecture

```
Edge Simulator → [Optional: Kafka] → FastAPI Backend → Dashboard
      │                  │                 │              │
 Simulated AI        Redpanda         PostgreSQL      Next.js
 50 Vehicles        (Optional)        WebSocket      Real-time
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+

### Local Development

```bash
# Start backend + database
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
│   │   ├── auth/           # OAuth + JWT authentication
│   │   ├── core/           # Configuration, permissions
│   │   ├── services/       # Telemetry, privacy engine
│   │   └── models/         # SQLAlchemy + Pydantic
│   └── Dockerfile
├── edge/                    # Edge gateway & simulator
│   └── src/
│       ├── simulator.py    # Fleet data simulator (50 vehicles)
│       ├── ai_inference.py # YOLOv11 inference (optional)
│       └── kafka_producer.py
├── frontend/               # Next.js dashboard
├── streaming/              # Kafka/Redpanda configs
└── docker-compose.yml
```

## 🎯 Features

### ✅ Fully Implemented
- **Real-time Fleet Monitoring**: WebSocket-powered dashboard with 50 simulated vehicles
- **Interactive Map**: Leaflet-based map with live vehicle positions
- **OAuth Authentication**: Google + GitHub + Email/Password with JWT
- **Role-Based Access**: Admin and User roles with permission hierarchy
- **Geofencing**: Create polygonal zones with enter/exit alerts
- **Privacy Engine**: GDPR-compliant data anonymization
- **Prometheus Metrics**: `/metrics` endpoint for monitoring
- **Docker Deployment**: Full-stack containerization

### 🟡 Simulated/Demo
- **Vehicle Telemetry**: Synthetic GPS, occupancy, and speed data
- **AI Inference**: Simulated ~9.6ms latency (real YOLOv11 requires model setup)
- **Tokyo Routes**: Vehicles follow pre-defined paths in Tokyo

### ⚪ Optional (Disabled by Default)
- **Kafka Streaming**: Redpanda available via `--profile kafka`

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Edge Simulation | Python + YOLOv11 (simulated) |
| Streaming | Redpanda (Kafka-compatible, optional) |
| Backend | FastAPI + Python 3.11 |
| Database | PostgreSQL + SQLAlchemy |
| Frontend | Next.js 14 + TypeScript |
| Auth | OAuth 2.0 + JWT |
| DevOps | Docker, GitHub Actions, Railway/Vercel |

## 📊 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /auth/register` | User registration (first user = admin) |
| `POST /auth/login` | Email/password login |
| `GET /auth/google/login` | Google OAuth |
| `GET /api/vehicles` | List all vehicles |
| `GET /api/vehicles/{id}` | Vehicle details |
| `GET /api/analytics/occupancy` | Occupancy trends |
| `GET /api/geofences` | List user's geofences |
| `WS /ws/telemetry` | Real-time telemetry stream |
| `GET /metrics` | Prometheus metrics |
| `GET /health` | Health check |

## 🚗 Demo Mode

The simulator generates realistic telemetry for **50 vehicles**:
- 🗺️ GPS movement along Tokyo routes (Shibuya, Shinjuku, Ginza)
- 👥 Random occupancy changes (0-8 passengers)
- ⚡ Simulated AI inference latency (~9-12ms)
- 🔒 Privacy consent status simulation

## 🔐 Authentication

- **First registered user** automatically becomes **Admin**
- Subsequent users are regular **Users**
- Admins can manage user roles
- All authenticated users can create their own geofences

## 📄 License

MIT License
