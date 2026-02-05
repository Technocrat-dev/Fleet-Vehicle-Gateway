"""
FastAPI Backend - Main Application

Fleet Vehicle Data Gateway API with:
- REST endpoints for fleet management
- WebSocket for real-time telemetry streaming
- OAuth 2.0 authentication (local + Google/GitHub)
- Rate limiting and security
- Prometheus metrics
- Structured logging
"""

import asyncio
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from starlette.middleware.sessions import SessionMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.logging import setup_logging, get_logger, RequestContext
from app.api import vehicles, analytics, websocket as ws_router
from app.auth.router import router as auth_router
from app.services.telemetry_hub import TelemetryHub
from app.services.kafka_consumer import TelemetryConsumer


# Initialize logging
setup_logging()
logger = get_logger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Global telemetry hub for WebSocket broadcasting
telemetry_hub = TelemetryHub()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Starts/stops background services.
    """
    logger.info("application_starting", version="1.0.0", env=settings.APP_ENV)
    
    # Initialize database
    await init_db()
    logger.info("database_initialized")
    
    # Start Kafka consumer in background
    consumer_task = None
    if settings.KAFKA_ENABLED:
        consumer = TelemetryConsumer(telemetry_hub)
        consumer_task = asyncio.create_task(consumer.run())
        logger.info("kafka_consumer_started", bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS)
    else:
        # Start simulator in demo mode
        from app.services.simulator_service import start_simulator
        consumer_task = asyncio.create_task(start_simulator(telemetry_hub))
        logger.info("simulator_started", vehicle_count=settings.SIMULATOR_VEHICLE_COUNT)
    
    # Store hub in app state for access in routes
    app.state.telemetry_hub = telemetry_hub
    
    logger.info(
        "application_ready",
        api_docs=f"http://localhost:{settings.BACKEND_PORT}/docs",
        websocket=f"ws://localhost:{settings.BACKEND_PORT}/ws/telemetry",
    )
    
    yield  # Application runs here
    
    # Shutdown
    logger.info("application_shutting_down")
    
    if consumer_task:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
    
    await close_db()
    logger.info("application_stopped")


# Create FastAPI app
app = FastAPI(
    title="Fleet Vehicle Data Gateway",
    description="Real-time fleet monitoring with edge-to-cloud data pipeline. Features OAuth 2.0 authentication, real-time WebSocket telemetry, and analytics APIs.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Session middleware for OAuth (required for state parameter)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
)

# CORS middleware with configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Add request ID and log requests."""
    request_id = str(uuid.uuid4())[:8]
    RequestContext.bind(request_id=request_id)
    
    start_time = datetime.now(timezone.utc)
    
    response: Response = await call_next(request)
    
    duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
    
    # Don't log health checks or metrics (too noisy)
    if request.url.path not in ["/health", "/ready", "/metrics"]:
        logger.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2),
        )
    
    response.headers["X-Request-ID"] = request_id
    RequestContext.clear()
    
    return response


# Include routers
app.include_router(auth_router)  # /auth/*
app.include_router(vehicles.router, prefix="/api", tags=["Vehicles"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(ws_router.router, tags=["WebSocket"])


# Health check endpoints
@app.get("/health", response_class=PlainTextResponse, include_in_schema=False)
async def health_check():
    """Kubernetes liveness probe - includes database connectivity check."""
    from app.core.database import engine
    from sqlalchemy import text
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return "OK"
    except Exception:
        return PlainTextResponse("UNHEALTHY", status_code=503)


@app.get("/ready", response_class=PlainTextResponse, include_in_schema=False)
async def readiness_check():
    """Kubernetes readiness probe."""
    if telemetry_hub.is_healthy():
        return "READY"
    return PlainTextResponse("NOT_READY", status_code=503)


@app.get("/metrics", response_class=PlainTextResponse, include_in_schema=False)
@limiter.limit("10/minute")
async def prometheus_metrics(request: Request):
    """Prometheus metrics endpoint."""
    stats = telemetry_hub.get_stats()
    
    metrics = f"""# HELP fleet_vehicles_total Total number of tracked vehicles
# TYPE fleet_vehicles_total gauge
fleet_vehicles_total {stats['vehicle_count']}

# HELP fleet_passengers_total Total passengers across all vehicles
# TYPE fleet_passengers_total gauge
fleet_passengers_total {stats['total_passengers']}

# HELP fleet_messages_processed_total Total telemetry messages processed
# TYPE fleet_messages_processed_total counter
fleet_messages_processed_total {stats['messages_processed']}

# HELP fleet_websocket_connections Active WebSocket connections
# TYPE fleet_websocket_connections gauge
fleet_websocket_connections {stats['websocket_connections']}

# HELP fleet_avg_inference_latency_ms Average inference latency
# TYPE fleet_avg_inference_latency_ms gauge
fleet_avg_inference_latency_ms {stats['avg_latency_ms']:.2f}
"""
    return metrics


@app.get("/")
async def root():
    """API root - basic info."""
    return {
        "name": "Fleet Vehicle Data Gateway",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics",
        "auth": {
            "register": "/auth/register",
            "login": "/auth/login",
            "oauth_providers": "/auth/providers",
        },
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=settings.DEBUG,
    )
