# Fleet Vehicle Data Gateway

> **Production-grade demonstration of a real-time fleet monitoring system with edge-to-cloud data pipeline**

A modern, full-stack platform for vehicle fleet management featuring real-time telemetry streaming, geofencing with intelligent alerts, OAuth authentication, and privacy-compliant data processing. Built with FastAPI, Next.js, and PostgreSQL.

[![CI](https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway/actions/workflows/ci.yml/badge.svg)](https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Contributing](#contributing)

---

## Features

### Real-Time Fleet Monitoring
- **Live Vehicle Tracking**: Interactive Leaflet map with real-time position updates for 50 simulated vehicles
- **WebSocket Streaming**: Sub-second latency telemetry delivery via WebSocket connections
- **Vehicle Details**: Per-vehicle view with GPS coordinates, speed, occupancy, and AI inference metrics
- **Dark Mode**: Fully responsive UI with light/dark theme support

### Intelligent Geofencing
- **Polygon Drawing**: Interactive map-based geofence creation with unlimited vertices
- **Enter/Exit Alerts**: Automatic notifications when vehicles cross geofence boundaries
- **Alert Cooldown**: 5-minute cooldown prevents alert spam for the same vehicle
- **Multi-User Support**: Each user manages their own geofences with role-based access control

### Authentication & Authorization
- **Multiple Auth Methods**: 
  - Google OAuth 2.0
  - GitHub OAuth
  - Email/Password with JWT
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Full system access, user management
  - **User**: Dashboard access, personal geofences, alerts
- **First User Auto-Admin**: First registered user automatically becomes admin
- **Session Management**: Secure cookie-based sessions with automatic token refresh

### Analytics & Insights
- **Occupancy Trends**: Historical data visualization with Recharts
- **Fleet Statistics**: Real-time metrics for active vehicles, total distance, average speed
- **Alert Dashboard**: Centralized view of all geofence events with severity filtering

### Privacy & Compliance
- **GDPR-Compliant**: Built-in consent management and data anonymization
- **Privacy Engine**: Configurable rules for data redaction and anonymization
- **User Privacy Controls**: Per-user consent status tracking

### Production-Ready
- **CI/CD Pipeline**: Automated testing, linting, and deployment via GitHub Actions
- **Containerized**: Full Docker Compose orchestration for all services
- **Health Checks**: Kubernetes-ready liveness and readiness probes
- **Prometheus Metrics**: `/metrics` endpoint for monitoring
- **Structured Logging**: JSON logs with request tracing via `structlog`
- **Rate Limiting**: API rate limiting with `slowapi`

---

## Architecture

```mermaid
graph TB
    subgraph "Edge Layer"
        SIM[Edge Simulator<br/>50 Vehicles]
    end
    
    subgraph "Optional Streaming"
        KAFKA[Redpanda<br/>Kafka-Compatible]
    end
    
    subgraph "Backend Services"
        API[FastAPI Backend<br/>Python 3.11]
        DB[(PostgreSQL<br/>Database)]
        GEO[Geofence Service]
        PRIV[Privacy Engine]
        TELEM[Telemetry Hub<br/>WebSocket Manager]
    end
    
    subgraph "Frontend"
        DASH[Next.js Dashboard<br/>TypeScript + React]
        MAP[Leaflet Map<br/>Real-time Rendering]
    end
    
    SIM -->|HTTP/WebSocket| API
    SIM -.->|Optional| KAFKA
    KAFKA -.-> API
    API <--> DB
    API --> GEO
    API --> PRIV
    API --> TELEM
    TELEM -->|WebSocket| DASH
    API -->|REST API| DASH
    DASH --> MAP
    
    style SIM fill:#e1f5ff
    style API fill:#fff3e0
    style DB fill:#f3e5f5
    style DASH fill:#e8f5e9
    style KAFKA fill:#fff9c4
```

### Data Flow

1. **Edge Simulation**: Python simulator generates realistic telemetry for 50 vehicles (GPS, speed, occupancy)
2. **Ingestion**: FastAPI backend receives telemetry via HTTP or Kafka (optional)
3. **Processing**: 
   - Geofence Service checks vehicle positions against active zones
   - Privacy Engine applies anonymization rules
   - Telemetry Hub broadcasts to connected WebSocket clients
4. **Storage**: PostgreSQL stores vehicles, users, geofences, and alerts
5. **Real-time Delivery**: Next.js dashboard receives updates via WebSocket and renders on interactive map

---

## Tech Stack

### Backend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | FastAPI 0.109+ | High-performance async API framework |
| **Runtime** | Python 3.11 | Modern Python with async/await support |
| **Database** | PostgreSQL 16 | Relational database with PostGIS support |
| **ORM** | SQLAlchemy 2.0 | Async ORM for database operations |
| **Auth** | Authlib + python-jose | OAuth 2.0 and JWT token handling |
| **WebSocket** | websockets 12.0 | Real-time bidirectional communication |
| **Validation** | Pydantic 2.5 | Data validation and settings management |
| **Streaming** | Redpanda (optional) | Kafka-compatible event streaming |
| **Monitoring** | Prometheus | Metrics collection and alerting |

### Frontend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Next.js 14 | React framework with SSR/SSG |
| **Language** | TypeScript 5.3 | Type-safe JavaScript |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS framework |
| **Maps** | Leaflet 1.9 + React-Leaflet | Interactive map rendering |
| **Charts** | Recharts 2.10 | Data visualization |
| **Icons** | Lucide React | Customizable icon library |
| **UI Components** | Custom + CVA | Theme-aware design system |

### DevOps
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Containers** | Docker + Docker Compose | Service orchestration |
| **CI/CD** | GitHub Actions | Automated testing and deployment |
| **Backend Hosting** | Railway | Managed PostgreSQL + app hosting |
| **Frontend Hosting** | Vercel | Serverless Next.js deployment |
| **Linting** | Ruff (Python) + ESLint (TS) | Code quality enforcement |
| **Formatting** | Black (Python) + Prettier (TS) | Consistent code style |

---

## Quick Start

### Prerequisites

- **Docker** & **Docker Compose** (20.10+)
- **Python** 3.11+ (for local development)
- **Node.js** 20+ (for frontend development)
- **Git** 2.0+

### 1. Clone the Repository

```bash
git clone https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway.git
cd Fleet-Vehicle-Gateway
```

### 2. Set Up Environment Variables

Create `.env` file in the `backend/` directory:

```bash
cp backend/.env.example backend/.env
```

**Backend `.env`** (minimum required):
```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/fleet_gateway

# Security
SECRET_KEY=your-secret-key-here-min-32-chars

# OAuth (optional for local dev)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-secret

# Application
APP_ENV=development
DEBUG=true
SIMULATOR_VEHICLE_COUNT=50
```

**Frontend `.env.local`**:
```bash
cp frontend/.env.example frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Start Services with Docker Compose

```bash
# Start backend + database
docker-compose up -d

# View logs
docker-compose logs -f backend
```

The services will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Database**: localhost:5432

### 4. (Optional) Start Frontend in Dev Mode

For hot-reload during development:

```bash
cd frontend
npm install
npm run dev
```

### 5. Access the Dashboard

1. Open http://localhost:3000
2. Click **"Sign Up"** to create an account (first user becomes admin)
3. Explore the dashboard:
   - **Live Map**: See 50 vehicles moving in real-time
   - **Geofences**: Click "Geofences" → "Create Geofence" to draw a zone
   - **Alerts**: View notifications when vehicles enter/exit zones

---

## Deployment

### Production Deployment (Railway + Vercel)

This project uses a **split deployment** strategy:
- **Backend** → Railway (PostgreSQL + FastAPI)
- **Frontend** → Vercel (Next.js)

#### Backend on Railway

1. **Create Railway Project**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   cd backend
   railway up
   ```

2. **Add PostgreSQL Database**:
   - Go to Railway Dashboard → Add Service → PostgreSQL
   - Copy `DATABASE_URL` from Variables tab

3. **Set Environment Variables**:
   ```env
   DATABASE_URL=<from-railway-postgres>
   SECRET_KEY=<generate-with-openssl-rand-hex-32>
   GOOGLE_CLIENT_ID=<from-google-console>
   GOOGLE_CLIENT_SECRET=<from-google-console>
   OAUTH_REDIRECT_URL=https://<your-backend>.up.railway.app/auth/callback
   CORS_ORIGINS=["https://<your-frontend>.vercel.app"]
   APP_ENV=production
   DEBUG=false
   ```

4. **Deploy**:
   - Railway auto-deploys from `main` branch
   - Check logs: `railway logs`

#### Frontend on Vercel

1. **Connect GitHub Repo**:
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Set Root Directory: `frontend`

2. **Configure Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL=https://<your-backend>.up.railway.app
   ```

3. **Deploy**:
   - Vercel auto-deploys on push to `main`
   - Preview deployments for PRs

#### CI/CD Pipeline

The project includes GitHub Actions workflows:

- **CI** (`.github/workflows/ci.yml`): Runs on every push
  - Backend: `ruff` lint, `black` format check, `pytest`
  - Frontend: `eslint`, TypeScript check, build verification
  - Docker: Multi-stage build validation

- **CD** (`.github/workflows/cd.yml`): Runs on push to `main`
  - Auto-deploys to Railway (backend) and Vercel (frontend)

---

## API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register new user (email/password) |
| `/auth/login` | POST | Login with email/password |
| `/auth/google/login` | GET | Initiate Google OAuth flow |
| `/auth/github/login` | GET | Initiate GitHub OAuth flow |
| `/auth/callback` | GET | OAuth callback handler |
| `/auth/me` | GET | Get current user info |

### Vehicles

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/vehicles` | GET | Required | List all vehicles |
| `/api/vehicles/{id}` | GET | Required | Get vehicle details |
| `/api/vehicles/{id}/telemetry` | GET | Required | Get recent telemetry for vehicle |

### Geofences

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/geofences` | GET | Required | List user's geofences |
| `/api/geofences` | POST | Required | Create new geofence |
| `/api/geofences/{id}` | GET | Required | Get geofence details |
| `/api/geofences/{id}` | PUT | Required | Update geofence |
| `/api/geofences/{id}` | DELETE | Required | Delete geofence |

### Alerts

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/alerts` | GET | Required | List user's alerts |
| `/api/alerts/unread-count` | GET | Required | Get unread alert count |
| `/api/alerts/{id}/acknowledge` | POST | Required | Mark alert as acknowledged |

### Analytics

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/analytics/occupancy` | GET | Required | Occupancy trends over time |
| `/api/analytics/fleet-stats` | GET | Required | Fleet-wide statistics |

### WebSocket

| Endpoint | Protocol | Auth | Description |
|----------|----------|------|-------------|
| `/ws/telemetry` | WebSocket | Required | Real-time telemetry stream |
| `/ws/alerts` | WebSocket | Required | Real-time alert notifications |

### System

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | None | Health check (includes DB connectivity) |
| `/ready` | GET | None | Readiness probe |
| `/metrics` | GET | None | Prometheus metrics |
| `/docs` | GET | None | Interactive API documentation (Swagger) |

**Interactive API Docs**: Visit http://localhost:8000/docs for full Swagger documentation with try-it-out functionality.

---

## Project Structure

```
fleet-vehicle-gateway/
├── backend/                        # FastAPI backend
│   ├── app/
│   │   ├── api/                   # REST & WebSocket endpoints
│   │   │   ├── analytics.py       # Analytics endpoints
│   │   │   ├── geofencing.py      # Geofence CRUD + alert system
│   │   │   ├── privacy.py         # Privacy controls
│   │   │   ├── users.py           # User management
│   │   │   ├── vehicles.py        # Vehicle endpoints
│   │   │   └── websocket.py       # WebSocket handlers
│   │   ├── auth/                  # Authentication
│   │   │   ├── dependencies.py    # Auth dependencies
│   │   │   ├── jwt.py             # JWT token handling
│   │   │   ├── oauth.py           # OAuth providers (Google, GitHub)
│   │   │   └── router.py          # Auth routes
│   │   ├── core/                  # Core configuration
│   │   │   ├── config.py          # Settings management
│   │   │   ├── database.py        # DB connection & session
│   │   │   ├── logging.py         # Structured logging setup
│   │   │   ├── migrations.py      # Startup migrations
│   │   │   └── permissions.py     # RBAC logic
│   │   ├── models/                # Data models
│   │   │   ├── db_models.py       # SQLAlchemy ORM models
│   │   │   └── schemas.py         # Pydantic request/response schemas
│   │   ├── services/              # Business logic
│   │   │   ├── geofence_service.py  # Geofence monitoring engine
│   │   │   ├── kafka_consumer.py    # Kafka telemetry consumer
│   │   │   ├── privacy_engine.py    # GDPR anonymization engine
│   │   │   ├── simulator_service.py # Vehicle telemetry simulator
│   │   │   └── telemetry_hub.py     # WebSocket broadcast hub
│   │   └── main.py                # FastAPI app entrypoint
│   ├── tests/                     # Backend tests
│   ├── Dockerfile                 # Backend container
│   └── requirements.txt           # Python dependencies
│
├── frontend/                      # Next.js dashboard
│   ├── app/                       # Next.js 14 app directory
│   │   ├── dashboard/             # Main dashboard page
│   │   ├── geofences/             # Geofence management UI
│   │   │   ├── page.tsx           # Geofence list & create modal
│   │   │   └── GeofenceMapComponent.tsx  # Interactive polygon drawer
│   │   ├── login/                 # Auth pages
│   │   ├── register/
│   │   └── layout.tsx             # Root layout
│   ├── components/                # Reusable UI components
│   │   ├── FleetMap.tsx           # Main map with vehicle markers
│   │   ├── NotificationBell.tsx   # Real-time alert notifications
│   │   ├── VehicleCard.tsx        # Vehicle detail cards
│   │   └── ThemeToggle.tsx        # Dark mode toggle
│   ├── lib/                       # Utilities
│   │   ├── auth.ts                # Auth helper (fetchWithAuth)
│   │   └── utils.ts               # Common utilities
│   ├── public/                    # Static assets
│   └── Dockerfile                 # Frontend container
│
├── edge/                          # Edge gateway simulator
│   └── src/
│       ├── simulator.py           # Fleet data simulator (50 vehicles)
│       ├── kafka_producer.py      # Kafka telemetry producer
│       └── ai_inference.py        # Simulated YOLOv11 inference
│
├── .github/
│   └── workflows/
│       ├── ci.yml                 # CI pipeline (test, lint, build)
│       └── cd.yml                 # CD pipeline (deploy)
│
├── deploy/                        # Deployment configs
│   ├── railway.json               # Railway service config
│   └── vercel.json                # Vercel deployment config
│
├── docs/                          # Documentation
├── docker-compose.yml             # Local development orchestration
└── README.md                      # You are here!
```

---

## Configuration

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` |  | - | PostgreSQL connection string (asyncpg format) |
| `SECRET_KEY` |  | - | JWT signing key (min 32 chars) |
| `APP_ENV` |  | `development` | Environment: `development`, `production` |
| `DEBUG` |  | `false` | Enable debug mode |
| `BACKEND_HOST` |  | `0.0.0.0` | Server bind address |
| `BACKEND_PORT` |  | `8000` | Server port |
| `CORS_ORIGINS` |  | `["*"]` | Allowed CORS origins (JSON array) |
| `GOOGLE_CLIENT_ID` |  | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` |  | - | Google OAuth secret |
| `GITHUB_CLIENT_ID` |  | - | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` |  | - | GitHub OAuth secret |
| `OAUTH_REDIRECT_URL` |  | - | OAuth callback URL |
| `KAFKA_ENABLED` |  | `false` | Enable Kafka consumer |
| `KAFKA_BOOTSTRAP_SERVERS` |  | `localhost:19092` | Kafka broker addresses |
| `SIMULATOR_VEHICLE_COUNT` |  | `50` | Number of simulated vehicles |
| `SIMULATOR_UPDATE_INTERVAL_MS` |  | `1000` | Telemetry update frequency (ms) |

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` |  | - | Backend API base URL |

**Note**: All `NEXT_PUBLIC_*` variables are embedded at build time and exposed to the browser.

---

## Testing

### Backend Tests

```bash
cd backend

# Install dev dependencies
pip install pytest pytest-asyncio pytest-cov httpx

# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_auth.py -v
```

### Frontend Tests

```bash
cd frontend

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build verification
npm run build
```

### Docker Verification

```bash
# Build all images
docker-compose build

# Start in detached mode
docker-compose up -d

# Check logs
docker-compose logs -f

# Run health checks
curl http://localhost:8000/health
curl http://localhost:3000
```

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Code Style

- **Backend**: Follow PEP 8, enforced by `ruff` and `black`
- **Frontend**: Follow ESLint + TypeScript strict mode
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/) format

### Testing Requirements

All PRs must:
- Pass CI checks (lint, type check, build)
- Include tests for new features
- Maintain or improve code coverage

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **FastAPI** - Lightning-fast async framework
- **Next.js** - The React framework for production
- **Leaflet** - Open-source interactive maps
- **Redpanda** - Kafka-compatible streaming platform
- **Railway** & **Vercel** - Deployment platforms

---

## Contact

**Developer**: Manas Sharma  
**GitHub**: [@Technocrat-dev](https://github.com/Technocrat-dev)  
**Project Link**: [Fleet Vehicle Gateway](https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway)

---

**Built with  for demonstrating production engineering skills**
