'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { LogOut, MapPin, Shield } from 'lucide-react'
import { useFleetWebSocket, VehicleStatus } from '@/lib/websocket'
import { logout, getCurrentUser, User } from '@/lib/auth'
import { MetricStrip } from '@/components/MetricStrip'
import { VehicleTable } from '@/components/VehicleTable'
import { LatencyChart } from '@/components/LatencyChart'
import { OccupancyChart } from '@/components/OccupancyChart'
import { VehicleDetailDrawer } from '@/components/VehicleDetailDrawer'
import { NotificationBell } from '@/components/NotificationBell'

const FleetMap = dynamic(() => import('@/components/FleetMap'), {
    ssr: false,
    loading: () => (
        <div className="h-[400px] bg-sunken border border-line rounded flex items-center justify-center">
            <span className="text-sm text-ink-muted">Loading map…</span>
        </div>
    )
})

function Panel({ title, aside, children }: {
    title: string
    aside?: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <section className="bg-surface border border-line rounded">
            <div className="flex items-baseline justify-between px-4 pt-3 pb-2">
                <h2 className="text-sm font-semibold">{title}</h2>
                {aside}
            </div>
            <div className="px-4 pb-4">{children}</div>
        </section>
    )
}

export default function DashboardPage() {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/telemetry'
    const { vehicles, summary, isConnected, messageCount } = useFleetWebSocket(wsUrl)
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleStatus | null>(null)
    const [currentUser, setCurrentUser] = useState<User | null>(null)

    useEffect(() => {
        getCurrentUser().then(setCurrentUser)
    }, [])

    const vehicleArray = Array.from(vehicles.values())

    return (
        <div className="min-h-screen bg-paper">
            {/* Header */}
            <header className="bg-surface border-b border-line sticky top-0 z-40">
                <div className="container mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <h1 className="text-sm font-semibold">Fleet Dashboard</h1>
                        <nav className="flex items-center gap-1">
                            <Link
                                href="/geofences"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-ink-secondary hover:text-ink hover:bg-sunken rounded transition-colors"
                            >
                                <MapPin className="w-3.5 h-3.5" />
                                Geofences
                            </Link>
                            {currentUser?.role === 'admin' && (
                                <Link
                                    href="/admin/users"
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-ink-secondary hover:text-ink hover:bg-sunken rounded transition-colors"
                                >
                                    <Shield className="w-3.5 h-3.5" />
                                    Users
                                </Link>
                            )}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-xs">
                            <span className={`live-dot ${isConnected ? '' : 'down'}`} />
                            <span className={isConnected ? 'text-ink-secondary' : 'text-crit font-medium'}>
                                {isConnected ? 'Live' : 'Offline'}
                            </span>
                            <span className="num text-ink-muted" title="Messages received">
                                {messageCount.toLocaleString()} msgs
                            </span>
                        </div>

                        <NotificationBell />

                        <button
                            onClick={() => logout()}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-ink-secondary hover:text-ink hover:bg-sunken rounded transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-6 space-y-4">
                {/* Key figures */}
                <MetricStrip
                    metrics={[
                        {
                            label: 'Vehicles',
                            value: summary?.total_vehicles || 0,
                            detail: summary?.active_vehicles ? `${summary.active_vehicles} active` : undefined,
                        },
                        {
                            label: 'Passengers',
                            value: summary?.total_passengers || 0,
                            detail: `avg ${(summary?.average_occupancy || 0).toFixed(1)} per vehicle`,
                        },
                        {
                            label: 'Avg latency',
                            value: `${(summary?.average_latency_ms || 0).toFixed(1)} ms`,
                            detail: 'edge inference',
                        },
                        {
                            label: 'Consent',
                            value: `${summary?.total_vehicles ? Math.round((summary.consent_granted_count / summary.total_vehicles) * 100) : 0}%`,
                            detail: `${summary?.consent_granted_count || 0} of ${summary?.total_vehicles || 0} granted`,
                        },
                    ]}
                />

                {/* Map */}
                <Panel
                    title="Vehicle locations"
                    aside={
                        <span className="num text-xs text-ink-muted">
                            {vehicleArray.length} on map
                        </span>
                    }
                >
                    <FleetMap
                        vehicles={vehicleArray}
                        onVehicleClick={(vehicle) => setSelectedVehicle(vehicle)}
                    />
                </Panel>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Panel title="Occupancy distribution">
                        <OccupancyChart vehicles={vehicleArray} />
                    </Panel>
                    <Panel title="Inference latency">
                        <LatencyChart vehicles={vehicleArray} />
                    </Panel>
                </div>

                {/* Table */}
                <Panel
                    title="Vehicle status"
                    aside={
                        <span className="num text-xs text-ink-muted">
                            {vehicleArray.length} vehicles
                        </span>
                    }
                >
                    <VehicleTable
                        vehicles={vehicleArray}
                        onSelect={(vehicle) => setSelectedVehicle(vehicle)}
                    />
                </Panel>
            </main>

            <VehicleDetailDrawer
                vehicle={selectedVehicle}
                onClose={() => setSelectedVehicle(null)}
            />
        </div>
    )
}
