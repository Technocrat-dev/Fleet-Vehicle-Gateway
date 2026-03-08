'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
    Car, Users, Zap, Activity, Shield,
    LogOut, RefreshCw, Wifi, WifiOff, MapPin
} from 'lucide-react'
import { useFleetWebSocket, VehicleStatus } from '@/lib/websocket'
import { logout, getCurrentUser, User } from '@/lib/auth'
import { StatsCard } from '@/components/StatsCard'
import { VehicleGrid } from '@/components/VehicleGrid'
import { LatencyChart } from '@/components/LatencyChart'
import { OccupancyChart } from '@/components/OccupancyChart'
import { VehicleDetailDrawer } from '@/components/VehicleDetailDrawer'
import { NotificationBell } from '@/components/NotificationBell'

const FleetMap = dynamic(() => import('@/components/FleetMap'), {
    ssr: false,
    loading: () => (
        <div className="h-[400px] bg-surface-elevated rounded-xl animate-pulse flex items-center justify-center">
            <span className="text-[var(--text-muted)]">Loading map...</span>
        </div>
    )
})

export default function DashboardPage() {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/telemetry'
    const { vehicles, summary, isConnected, error, messageCount } = useFleetWebSocket(wsUrl)
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleStatus | null>(null)
    const [currentUser, setCurrentUser] = useState<User | null>(null)

    useEffect(() => {
        getCurrentUser().then(setCurrentUser)
    }, [])

    const vehicleArray = Array.from(vehicles.values())

    return (
        <div className="min-h-screen bg-surface-deep">
            {/* Header */}
            <header className="glass sticky top-0 z-50">
                <div className="container mx-auto px-6 py-3.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => logout()}
                                className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors group"
                                title="Logout"
                            >
                                <LogOut className="w-4.5 h-4.5 text-[var(--text-secondary)] group-hover:text-[var(--danger)]" />
                            </button>
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                                    <Car className="w-4 h-4 text-surface-deep" />
                                </div>
                                <h1 className="text-lg font-bold text-[var(--text-primary)]">
                                    Fleet Dashboard
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {currentUser?.role === 'admin' && (
                                <Link
                                    href="/admin/users"
                                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/[0.06] rounded-lg transition-colors text-sm"
                                >
                                    <Shield className="w-3.5 h-3.5 text-[var(--accent-warm)]" />
                                    <span className="text-[var(--text-secondary)] font-medium">Users</span>
                                </Link>
                            )}

                            <Link
                                href="/geofences"
                                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/[0.06] rounded-lg transition-colors text-sm"
                            >
                                <MapPin className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                <span className="text-[var(--text-secondary)] font-medium">Geofences</span>
                            </Link>

                            <NotificationBell />

                            <div className="flex items-center gap-1.5 text-sm">
                                {isConnected ? (
                                    <>
                                        <Wifi className="w-3.5 h-3.5 text-[var(--success)]" />
                                        <span className="text-[var(--success)] text-xs font-medium">Live</span>
                                    </>
                                ) : (
                                    <>
                                        <WifiOff className="w-3.5 h-3.5 text-[var(--danger)]" />
                                        <span className="text-[var(--danger)] text-xs font-medium">Offline</span>
                                    </>
                                )}
                            </div>

                            <div className="text-xs text-[var(--text-muted)] font-medium tabular-nums">
                                <RefreshCw className="w-3 h-3 inline mr-1 opacity-50" />
                                {messageCount.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-6">
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <StatsCard
                        icon={<Car className="w-4.5 h-4.5 text-[var(--accent)]" />}
                        label="Vehicles"
                        value={summary?.total_vehicles || 0}
                        trend={summary?.active_vehicles ? `${summary.active_vehicles} active` : undefined}
                    />
                    <StatsCard
                        icon={<Users className="w-4.5 h-4.5 text-[var(--accent-warm)]" />}
                        label="Passengers"
                        value={summary?.total_passengers || 0}
                        trend={`avg ${(summary?.average_occupancy || 0).toFixed(1)} per vehicle`}
                    />
                    <StatsCard
                        icon={<Zap className="w-4.5 h-4.5 text-[var(--accent)]" />}
                        label="Avg Latency"
                        value={`${(summary?.average_latency_ms || 0).toFixed(1)}ms`}
                        trend="OpenVINO optimized"
                    />
                    <StatsCard
                        icon={<Shield className="w-4.5 h-4.5 text-[var(--success)]" />}
                        label="Privacy"
                        value={`${summary?.total_vehicles ? Math.round((summary.consent_granted_count / summary.total_vehicles) * 100) : 0}%`}
                        trend={`${summary?.consent_granted_count || 0} consented`}
                    />
                </div>

                {/* Map Section */}
                <div className="glass-light rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide uppercase">
                            Vehicle Locations
                        </h2>
                        <span className="text-xs text-[var(--text-muted)] font-medium tabular-nums">
                            {vehicleArray.length} on map
                        </span>
                    </div>
                    <FleetMap
                        vehicles={vehicleArray}
                        onVehicleClick={(vehicle) => setSelectedVehicle(vehicle)}
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <div className="glass-light rounded-xl p-5">
                        <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide uppercase mb-4">
                            Occupancy Distribution
                        </h2>
                        <OccupancyChart vehicles={vehicleArray} />
                    </div>

                    <div className="glass-light rounded-xl p-5">
                        <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide uppercase mb-4">
                            Inference Latency
                        </h2>
                        <LatencyChart vehicles={vehicleArray} />
                    </div>
                </div>

                {/* Vehicle Grid */}
                <div className="glass-light rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide uppercase">
                            Vehicle Status
                        </h2>
                        <div className="flex items-center gap-1.5">
                            <span className="connection-dot connected" />
                            <span className="text-xs text-[var(--text-muted)] font-medium">
                                Real-time
                            </span>
                        </div>
                    </div>
                    <VehicleGrid vehicles={vehicleArray} />
                </div>
            </main>

            <VehicleDetailDrawer
                vehicle={selectedVehicle}
                onClose={() => setSelectedVehicle(null)}
            />
        </div>
    )
}
