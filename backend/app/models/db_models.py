"""
Database Models

SQLAlchemy ORM models for the Fleet Vehicle Gateway.
"""

from datetime import datetime, timezone
from typing import Optional
from enum import Enum as PyEnum
from sqlalchemy import (
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, PyEnum):
    """User roles for access control."""

    ADMIN = "admin"
    MANAGER = "manager"
    VIEWER = "viewer"


class User(Base):
    """User model for authentication."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )  # Null for OAuth users
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # OAuth fields
    oauth_provider: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # google, github
    oauth_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Role-based access control
    role: Mapped[str] = mapped_column(
        String(20), default=UserRole.VIEWER.value, nullable=False
    )

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    api_keys: Mapped[list["APIKey"]] = relationship(
        "APIKey", back_populates="user", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_users_oauth", "oauth_provider", "oauth_id"),)


class APIKey(Base):
    """API Keys for service-to-service authentication."""

    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    key_hash: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Permissions
    scopes: Mapped[str] = mapped_column(
        Text, default="read"
    )  # Comma-separated: read,write,admin

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="api_keys")


class Vehicle(Base):
    """Vehicle registry for the fleet."""

    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vehicle_id: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Vehicle details
    vehicle_type: Mapped[str] = mapped_column(String(50), default="bus")
    capacity: Mapped[int] = mapped_column(Integer, default=8)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    consent_status: Mapped[str] = mapped_column(String(20), default="granted")

    # Current state (cached from latest telemetry)
    current_latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    current_longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    current_occupancy: Mapped[int] = mapped_column(Integer, default=0)
    current_route_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_seen: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    telemetry_records: Mapped[list["TelemetryRecord"]] = relationship(
        "TelemetryRecord", back_populates="vehicle", cascade="all, delete-orphan"
    )


class TelemetryRecord(Base):
    """Historical telemetry data for analytics."""

    __tablename__ = "telemetry_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vehicle_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vehicles.id"), nullable=False
    )

    # Telemetry data
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    occupancy_count: Mapped[int] = mapped_column(Integer, nullable=False)
    inference_latency_ms: Mapped[float] = mapped_column(Float, nullable=False)
    speed_kmh: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    heading_degrees: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    route_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    frame_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    consent_status: Mapped[str] = mapped_column(String(20), default="granted")

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship(
        "Vehicle", back_populates="telemetry_records"
    )

    __table_args__ = (
        Index("ix_telemetry_vehicle_timestamp", "vehicle_id", "timestamp"),
    )


class RefreshToken(Base):
    """Refresh tokens for JWT authentication."""

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )

    # Metadata
    device_info: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    # Status
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class Geofence(Base):
    """Geofence model for virtual boundaries."""

    __tablename__ = "geofences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # GeoJSON polygon stored as JSON text
    # Format: {"type": "Polygon", "coordinates": [[[lng, lat], [lng, lat], ...]]}
    polygon: Mapped[str] = mapped_column(Text, nullable=False)

    # Alert settings
    alert_on_enter: Mapped[bool] = mapped_column(Boolean, default=True)
    alert_on_exit: Mapped[bool] = mapped_column(Boolean, default=True)

    # Styling
    color: Mapped[str] = mapped_column(String(7), default="#3B82F6")  # Hex color

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    alerts: Mapped[list["Alert"]] = relationship(
        "Alert", back_populates="geofence", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_geofences_user_id", "user_id"),)


class Alert(Base):
    """Alert model for geofence and system notifications."""

    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )

    # Alert details
    alert_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # geofence_enter, geofence_exit, speeding, idle, maintenance
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(
        String(20), default="info"
    )  # info, warning, critical

    # Related entities
    vehicle_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    geofence_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("geofences.id", ondelete="SET NULL"), nullable=True
    )

    # Status
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Extra data (JSON)
    extra_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    geofence: Mapped[Optional["Geofence"]] = relationship(
        "Geofence", back_populates="alerts"
    )

    __table_args__ = (
        Index("ix_alerts_user_id", "user_id"),
        Index("ix_alerts_created_at", "created_at"),
        Index("ix_alerts_vehicle_id", "vehicle_id"),
    )
