'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polygon, CircleMarker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet default icon issue
try {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
} catch (e) { }

interface GeoJSONPolygon {
    type: 'Polygon'
    coordinates: number[][][]
}

interface GeofenceMapProps {
    initialPolygon?: GeoJSONPolygon | null
    color: string
    onPolygonChange: (polygon: GeoJSONPolygon | null) => void
}

// Component to handle map click events for polygon drawing
function PolygonDrawer({
    points,
    setPoints,
    color,
    onComplete
}: {
    points: [number, number][]
    setPoints: (points: [number, number][]) => void
    color: string
    onComplete: (polygon: GeoJSONPolygon) => void
}) {
    const map = useMap()

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

// Component to show click point markers
function PointMarkers({ points, color }: { points: [number, number][], color: string }) {
    return (
        <>
            {points.map((point, index) => (
                <div
                    key={index}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        pointerEvents: 'none'
                    }}
                />
            ))}
        </>
    )
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

    // Get positions for the in-progress polygon
    const getDrawingPositions = (): [number, number][] => {
        return points
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

    return (
        <div className="h-[350px] rounded-xl overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 relative">
            <MapContainer
                center={defaultCenter}
                zoom={13}
                style={{ height: '100%', width: '100%', cursor: 'crosshair' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Polygon drawing handler */}
                {!completedPolygon && (
                    <PolygonDrawer
                        points={points}
                        setPoints={setPoints}
                        color={color}
                        onComplete={handleComplete}
                    />
                )}

                {/* Show in-progress polygon while drawing */}
                {points.length >= 2 && (
                    <Polygon
                        positions={getDrawingPositions()}
                        pathOptions={{
                            color: color,
                            fillColor: color,
                            fillOpacity: 0.3,
                            weight: 2,
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
                            fillOpacity: 0.3,
                            weight: 2,
                        }}
                    />
                )}

                {/* Show individual points while drawing */}
                {points.map((point, index) => (
                    <CircleMarker
                        key={index}
                        center={point}
                        radius={index === 0 ? 8 : 5}
                        pathOptions={{
                            color: index === 0 ? '#22c55e' : color,
                            fillColor: index === 0 ? '#22c55e' : color,
                            fillOpacity: 1,
                            weight: 2,
                        }}
                    />
                ))}
            </MapContainer>

            {/* Instructions overlay */}
            {!completedPolygon && points.length === 0 && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm text-center">
                    Click on the map to start drawing your geofence
                </div>
            )}
            {!completedPolygon && points.length > 0 && points.length < 3 && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm text-center">
                    Add {3 - points.length} more point{3 - points.length > 1 ? 's' : ''} to create a polygon
                </div>
            )}
            {!completedPolygon && points.length >= 3 && (
                <div className="absolute bottom-4 left-4 right-4 bg-green-600/90 text-white px-4 py-2 rounded-lg text-sm text-center">
                    Click near the <span className="font-bold text-green-200">green starting point</span> to complete the polygon
                </div>
            )}
        </div>
    )
}
