/**
 * Fleet Map Component - Interactive Leaflet map showing vehicle locations
 */

'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { VehicleStatus } from '@/lib/websocket'

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom vehicle icon
function createVehicleIcon(occupancy: number) {
    const color = occupancy >= 7 ? '#ef4444' : occupancy >= 4 ? '#f59e0b' : '#22c55e'

    return L.divIcon({
        className: 'vehicle-marker-icon',
        html: `
      <div style="
        width: 28px;
        height: 28px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 11px;
        font-weight: bold;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      ">
        ${occupancy}
      </div>
    `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    })
}

interface FleetMapProps {
    vehicles: VehicleStatus[]
    onVehicleClick?: (vehicle: VehicleStatus) => void
}

// Component to fit map bounds to vehicles
function MapBoundsUpdater({ vehicles }: { vehicles: VehicleStatus[] }) {
    const map = useMap()

    useEffect(() => {
        if (vehicles.length > 0) {
            const bounds = L.latLngBounds(
                vehicles.map(v => [v.location.latitude, v.location.longitude] as [number, number])
            )
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
        }
    }, [vehicles.length > 0])  // Only run once when we first get vehicles

    return null
}

export default function FleetMap({ vehicles, onVehicleClick }: FleetMapProps) {
    // Tokyo center coordinates
    const defaultCenter: [number, number] = [35.6762, 139.7503]

    if (typeof window === 'undefined') {
        return null  // SSR guard
    }

    return (
        <div className="h-[400px] rounded-xl overflow-hidden relative z-0">
            <MapContainer
                center={defaultCenter}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapBoundsUpdater vehicles={vehicles} />

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
                            <div className="text-sm">
                                <div className="font-bold mb-1">{vehicle.vehicle_id}</div>
                                <div>👤 Passengers: {vehicle.occupancy_count}</div>
                                <div>⚡ Latency: {vehicle.inference_latency_ms.toFixed(1)}ms</div>
                                {vehicle.speed_kmh && (
                                    <div>🚗 Speed: {Math.round(vehicle.speed_kmh)} km/h</div>
                                )}
                                {vehicle.route_id && (
                                    <div>📍 Route: {vehicle.route_id.replace('route-', '')}</div>
                                )}
                                <div className="text-xs text-gray-500 mt-1">
                                    {vehicle.consent_status === 'granted' ? '✅ Consent' : '⚠️ Pending'}
                                </div>
                                {onVehicleClick && (
                                    <button
                                        onClick={() => onVehicleClick(vehicle)}
                                        className="mt-2 w-full px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                    >
                                        View Details
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

