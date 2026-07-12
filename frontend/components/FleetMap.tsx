/**
 * Fleet Map — Leaflet map showing vehicle locations and geofences.
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet'
import L from 'leaflet'
import { VehicleStatus } from '@/lib/websocket'
import { fetchWithAuth } from '@/lib/auth'
import { occupancyLevel, STATUS_HEX, VEHICLE_CAPACITY } from '@/lib/constants'

// Vehicle marker: rounded square carrying the passenger count,
// colored by the shared occupancy status scale.
function createVehicleIcon(occupancy: number) {
    const color = STATUS_HEX[occupancyLevel(occupancy)]

    return L.divIcon({
        className: 'vehicle-marker-icon',
        html: `
      <div style="
        width: 26px;
        height: 26px;
        background: ${color};
        border: 2px solid #ffffff;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 11px;
        font-weight: 600;
        font-family: var(--font-mono), monospace;
        box-shadow: 0 1px 4px rgba(26, 28, 32, 0.35);
        cursor: pointer;
      ">
        ${occupancy}
      </div>
    `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
    })
}

interface Geofence {
    id: number
    name: string
    polygon: {
        type: string
        coordinates: number[][][]
    }
    color: string
    is_active: boolean
}

interface FleetMapProps {
    vehicles: VehicleStatus[]
    onVehicleClick?: (vehicle: VehicleStatus) => void
    showGeofences?: boolean
}

// Fit map bounds once, when vehicles first arrive
function MapBoundsUpdater({ vehicles }: { vehicles: VehicleStatus[] }) {
    const map = useMap()
    const hasFitRef = useRef(false)

    useEffect(() => {
        if (vehicles.length > 0 && !hasFitRef.current) {
            hasFitRef.current = true
            const bounds = L.latLngBounds(
                vehicles.map(v => [v.location.latitude, v.location.longitude] as [number, number])
            )
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
        }
    }, [vehicles, map])

    return null
}

// Convert GeoJSON coordinates ([lng, lat]) to Leaflet format ([lat, lng])
function geojsonToLeaflet(coordinates: number[][][]): [number, number][] {
    return coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number])
}

function PopupRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '12px' }}>
            <span style={{ color: '#565b64' }}>{label}</span>
            <span style={{ fontFamily: 'var(--font-mono), monospace' }}>{value}</span>
        </div>
    )
}

export default function FleetMap({ vehicles, onVehicleClick, showGeofences = true }: FleetMapProps) {
    const [geofences, setGeofences] = useState<Geofence[]>([])
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    // Tokyo center coordinates
    const defaultCenter: [number, number] = [35.6762, 139.7503]

    const loadGeofences = useCallback(async () => {
        if (!showGeofences) return

        try {
            const response = await fetchWithAuth(`${apiUrl}/api/geofences?active_only=true`)
            if (response.ok) {
                const data = await response.json()
                setGeofences(data)
            }
        } catch (err) {
            console.error('Failed to load geofences for map:', err)
        }
    }, [apiUrl, showGeofences])

    useEffect(() => {
        loadGeofences()
        const interval = setInterval(loadGeofences, 30000)
        return () => clearInterval(interval)
    }, [loadGeofences])

    if (typeof window === 'undefined') {
        return null  // SSR guard
    }

    return (
        <div className="h-[400px] rounded overflow-hidden border border-line relative z-0">
            <MapContainer
                center={defaultCenter}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                <MapBoundsUpdater vehicles={vehicles} />

                {geofences.map((geofence) => (
                    <Polygon
                        key={`geofence-${geofence.id}`}
                        positions={geojsonToLeaflet(geofence.polygon.coordinates)}
                        pathOptions={{
                            color: geofence.color,
                            fillColor: geofence.color,
                            fillOpacity: 0.12,
                            weight: 1.5,
                        }}
                    >
                        <Popup>
                            <div style={{ fontSize: '12px' }}>
                                <div style={{ fontWeight: 600, marginBottom: '2px' }}>{geofence.name}</div>
                                <span style={{ color: geofence.is_active ? '#1a7f4b' : '#82878f' }}>
                                    {geofence.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </Popup>
                    </Polygon>
                ))}

                {vehicles.map((vehicle) => (
                    <Marker
                        key={vehicle.vehicle_id}
                        position={[vehicle.location.latitude, vehicle.location.longitude]}
                        icon={createVehicleIcon(vehicle.occupancy_count)}
                        eventHandlers={{
                            click: () => onVehicleClick?.(vehicle)
                        }}
                    >
                        <Popup>
                            <div style={{ minWidth: '170px' }}>
                                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', fontFamily: 'var(--font-mono), monospace' }}>
                                    {vehicle.vehicle_id.replace('vehicle-', 'V-')}
                                </div>
                                <div style={{ display: 'grid', gap: '3px' }}>
                                    <PopupRow label="Passengers" value={`${vehicle.occupancy_count}/${VEHICLE_CAPACITY}`} />
                                    <PopupRow label="Latency" value={`${vehicle.inference_latency_ms.toFixed(1)} ms`} />
                                    {vehicle.speed_kmh != null && (
                                        <PopupRow label="Speed" value={`${Math.round(vehicle.speed_kmh)} km/h`} />
                                    )}
                                    {vehicle.route_id && (
                                        <PopupRow label="Route" value={vehicle.route_id.replace('route-', '')} />
                                    )}
                                    <PopupRow
                                        label="Consent"
                                        value={vehicle.consent_status === 'granted' ? 'Granted' : 'Pending'}
                                    />
                                </div>
                                {onVehicleClick && (
                                    <button
                                        onClick={() => onVehicleClick(vehicle)}
                                        style={{
                                            marginTop: '10px',
                                            width: '100%',
                                            padding: '5px 8px',
                                            background: '#22314e',
                                            color: '#ffffff',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        View details
                                    </button>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}
