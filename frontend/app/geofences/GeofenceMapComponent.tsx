'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polygon, CircleMarker, useMapEvents } from 'react-leaflet'

interface GeoJSONPolygon {
    type: 'Polygon'
    coordinates: number[][][]
}

interface GeofenceMapProps {
    initialPolygon?: GeoJSONPolygon | null
    color: string
    onPolygonChange: (polygon: GeoJSONPolygon | null) => void
}

// First drawing point gets the "close here" affordance color
const START_POINT_COLOR = '#1a7f4b'

// Handle map click events for polygon drawing
function PolygonDrawer({
    points,
    setPoints,
    onComplete
}: {
    points: [number, number][]
    setPoints: (points: [number, number][]) => void
    onComplete: (polygon: GeoJSONPolygon) => void
}) {
    useMapEvents({
        click: (e) => {
            const { lat, lng } = e.latlng
            const newPoint: [number, number] = [lat, lng]

            // Check if clicking near the first point to close the polygon
            if (points.length >= 3) {
                const firstPoint = points[0]
                const distance = Math.sqrt(
                    Math.pow(lat - firstPoint[0], 2) +
                    Math.pow(lng - firstPoint[1], 2)
                )

                // If clicking within ~0.002 degrees of first point, close the polygon
                if (distance < 0.002) {
                    // Convert to GeoJSON format (lng, lat not lat, lng)
                    const coordinates = [
                        [...points, points[0]].map(([lat, lng]) => [lng, lat])
                    ]
                    onComplete({
                        type: 'Polygon',
                        coordinates: coordinates as number[][][]
                    })
                    setPoints([])
                    return
                }
            }

            setPoints([...points, newPoint])
        }
    })

    return null
}

export default function GeofenceMapComponent({
    initialPolygon,
    color,
    onPolygonChange
}: GeofenceMapProps) {
    // Drawing state
    const [points, setPoints] = useState<[number, number][]>([])
    const [completedPolygon, setCompletedPolygon] = useState<GeoJSONPolygon | null>(
        initialPolygon || null
    )

    // Tokyo center
    const defaultCenter: [number, number] = [35.6762, 139.7503]

    const handleComplete = (polygon: GeoJSONPolygon) => {
        setCompletedPolygon(polygon)
        onPolygonChange(polygon)
    }

    // Convert GeoJSON to Leaflet format
    const getPolygonPositions = (): [number, number][] => {
        if (!completedPolygon) return []
        // GeoJSON is [lng, lat], Leaflet is [lat, lng]
        return completedPolygon.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number])
    }

    // Reset drawing when initialPolygon changes
    useEffect(() => {
        if (initialPolygon) {
            setCompletedPolygon(initialPolygon)
        }
    }, [initialPolygon])

    // Notify parent when polygon is cleared
    useEffect(() => {
        if (completedPolygon === null && initialPolygon !== null) {
            onPolygonChange(null)
        }
    }, [completedPolygon])

    const instruction =
        completedPolygon ? null :
            points.length === 0 ? 'Click on the map to start drawing your geofence' :
                points.length < 3 ? `Add ${3 - points.length} more point${3 - points.length > 1 ? 's' : ''} to form a polygon` :
                    'Click near the green starting point to complete the polygon'

    return (
        <div className="h-[350px] rounded overflow-hidden border border-line relative">
            <MapContainer
                center={defaultCenter}
                zoom={13}
                style={{ height: '100%', width: '100%', cursor: 'crosshair' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                {/* Polygon drawing handler */}
                {!completedPolygon && (
                    <PolygonDrawer
                        points={points}
                        setPoints={setPoints}
                        onComplete={handleComplete}
                    />
                )}

                {/* Show in-progress polygon while drawing */}
                {points.length >= 2 && (
                    <Polygon
                        positions={points}
                        pathOptions={{
                            color: color,
                            fillColor: color,
                            fillOpacity: 0.15,
                            weight: 1.5,
                            dashArray: '5, 5',
                        }}
                    />
                )}

                {/* Show completed polygon */}
                {completedPolygon && (
                    <Polygon
                        positions={getPolygonPositions()}
                        pathOptions={{
                            color: color,
                            fillColor: color,
                            fillOpacity: 0.15,
                            weight: 1.5,
                        }}
                    />
                )}

                {/* Show individual points while drawing */}
                {points.map((point, index) => (
                    <CircleMarker
                        key={index}
                        center={point}
                        radius={index === 0 ? 7 : 4}
                        pathOptions={{
                            color: index === 0 ? START_POINT_COLOR : color,
                            fillColor: index === 0 ? START_POINT_COLOR : color,
                            fillOpacity: 1,
                            weight: 2,
                        }}
                    />
                ))}
            </MapContainer>

            {/* Instructions overlay */}
            {instruction && (
                <div className="absolute bottom-3 left-3 right-3 bg-surface border border-line rounded px-3 py-2 text-xs text-ink-secondary text-center shadow-[0_2px_8px_rgba(26,28,32,0.1)] z-[1000] pointer-events-none">
                    {instruction}
                </div>
            )}
        </div>
    )
}
