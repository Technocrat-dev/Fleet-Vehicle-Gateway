/**
 * WebSocket hook for real-time telemetry updates
 */

import { useEffect, useState, useCallback, useRef } from 'react'

export interface VehicleTelemetry {
    vehicle_id: string
    timestamp: string
    occupancy_count: number
    inference_latency_ms: number
    location: {
        latitude: number
        longitude: number
    }
    frame_hash: string
    consent_status: string
    route_id?: string
    speed_kmh?: number
    heading_degrees?: number
}

export interface VehicleStatus {
    vehicle_id: string
    last_seen: string
    occupancy_count: number
    location: {
        latitude: number
        longitude: number
    }
    inference_latency_ms: number
    consent_status: string
    route_id?: string
    speed_kmh?: number
    is_active: boolean
}

export interface FleetSummary {
    total_vehicles: number
    active_vehicles: number
    total_passengers: number
    average_occupancy: number
    average_latency_ms: number
    consent_granted_count: number
    timestamp: string
}

interface UseWebSocketReturn {
    vehicles: Map<string, VehicleStatus>
    summary: FleetSummary | null
    isConnected: boolean
    error: string | null
    messageCount: number
}

export function useFleetWebSocket(wsUrl: string): UseWebSocketReturn {
    const [vehicles, setVehicles] = useState<Map<string, VehicleStatus>>(new Map())
    const [summary, setSummary] = useState<FleetSummary | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [messageCount, setMessageCount] = useState(0)

    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(wsUrl)
            wsRef.current = ws

            ws.onopen = () => {
                console.log('🔌 WebSocket connected')
                setIsConnected(true)
                setError(null)
            }

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)

                    // Handle different message types
                    if (data.type === 'initial_state') {
                        // Initial batch of all vehicles
                        const newVehicles = new Map<string, VehicleStatus>()
                        data.vehicles.forEach((v: VehicleStatus) => {
                            newVehicles.set(v.vehicle_id, v)
                        })
                        setVehicles(newVehicles)
                    } else if (data.type === 'heartbeat' || data.type === 'pong') {
                        // Ignore heartbeats
                    } else if (data.vehicle_id) {
                        // Single telemetry update - convert to VehicleStatus
                        setVehicles(prev => {
                            const updated = new Map(prev)
                            updated.set(data.vehicle_id, {
                                vehicle_id: data.vehicle_id,
                                last_seen: data.timestamp,
                                occupancy_count: data.occupancy_count,
                                location: data.location,
                                inference_latency_ms: data.inference_latency_ms,
                                consent_status: data.consent_status,
                                route_id: data.route_id,
                                speed_kmh: data.speed_kmh,
                                is_active: true,
                            })
                            return updated
                        })
                        setMessageCount(prev => prev + 1)
                    }
                } catch (e) {
                    console.error('Failed to parse message:', e)
                }
            }

            ws.onerror = (event) => {
                console.error('WebSocket error:', event)
                setError('Connection error')
            }

            ws.onclose = () => {
                console.log('🔌 WebSocket disconnected')
                setIsConnected(false)

                // Reconnect after 3 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('Attempting to reconnect...')
                    connect()
                }, 3000)
            }

        } catch (e) {
            setError(`Failed to connect: ${e}`)
        }
    }, [wsUrl])

    useEffect(() => {
        connect()

        // Ping every 25 seconds to keep connection alive
        const pingInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'ping' }))
            }
        }, 25000)

        return () => {
            clearInterval(pingInterval)
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
            wsRef.current?.close()
        }
    }, [connect])

    // Calculate summary from vehicles
    useEffect(() => {
        if (vehicles.size === 0) return

        const vehicleArray = Array.from(vehicles.values())
        const activeVehicles = vehicleArray.filter(v => v.is_active)
        const totalPassengers = vehicleArray.reduce((sum, v) => sum + v.occupancy_count, 0)
        const avgOccupancy = totalPassengers / vehicleArray.length
        const avgLatency = vehicleArray.reduce((sum, v) => sum + v.inference_latency_ms, 0) / vehicleArray.length
        const consentGranted = vehicleArray.filter(v => v.consent_status === 'granted').length

        setSummary({
            total_vehicles: vehicleArray.length,
            active_vehicles: activeVehicles.length,
            total_passengers: totalPassengers,
            average_occupancy: avgOccupancy,
            average_latency_ms: avgLatency,
            consent_granted_count: consentGranted,
            timestamp: new Date().toISOString(),
        })
    }, [vehicles])

    return { vehicles, summary, isConnected, error, messageCount }
}

// Simple fetch wrapper for REST API
export async function fetchApi<T>(endpoint: string): Promise<T> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(`${baseUrl}${endpoint}`)
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
    }
    return response.json()
}
