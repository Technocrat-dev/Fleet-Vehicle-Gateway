'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
    Car, Users, Zap, Activity, Shield,
    ChevronLeft, RefreshCw, Wifi, WifiOff
} from 'lucide-react'
import { useFleetWebSocket, VehicleStatus } from '@/lib/websocket'
import { StatsCard } from '@/components/StatsCard'
import { VehicleGrid } from '@/components/VehicleGrid'
import { LatencyChart } from '@/components/LatencyChart'
import { OccupancyChart } from '@/components/OccupancyChart'

// Dynamic import for map (SSR disabled)
const FleetMap = dynamic(() => import('@/components/FleetMap'), {
    ssr: false,
    loading: () => (
        <div className="h-[400px] bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse flex items-center justify-center">
            <span className="text-slate-500">Loading map...</span>
        </div>
    )
})

export default function DashboardPage() {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/telemetry'
    const { vehicles, summary, isConnected, error, messageCount } = useFleetWebSocket(wsUrl)

    const vehicleArray = Array.from(vehicles.values())

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/"
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </Link>
                            <div className="flex items-center gap-2">
                                <Car className="w-6 h-6 text-blue-500" />
                                <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                                    Fleet Dashboard
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Connection Status */}
                            <div className="flex items-center gap-2 text-sm">
                                {isConnected ? (
                                    <>
                                        <Wifi className="w-4 h-4 text-green-500" />
                                        <span className="text-green-600 dark:text-green-400">Connected</span>
                                    </>
                                ) : (
                                    <>
                                        <WifiOff className="w-4 h-4 text-red-500" />
                                        <span className="text-red-600 dark:text-red-400">Disconnected</span>
                                    </>
                                )}
                            </div>

                            {/* Message Counter */}
                            <div className="text-sm text-slate-500">
                                <RefreshCw className="w-4 h-4 inline mr-1" />
                                {messageCount.toLocaleString()} updates
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatsCard
                        icon={<Car className="w-5 h-5 text-blue-500" />}
                        label="Total Vehicles"
                        value={summary?.total_vehicles || 0}
                        trend={summary?.active_vehicles ? `${summary.active_vehicles} active` : undefined}
                    />
                    <StatsCard
                        icon={<Users className="w-5 h-5 text-green-500" />}
                        label="Total Passengers"
                        value={summary?.total_passengers || 0}
                        trend={`Avg: ${(summary?.average_occupancy || 0).toFixed(1)}/vehicle`}
                    />
                    <StatsCard
                        icon={<Zap className="w-5 h-5 text-yellow-500" />}
                        label="Avg Latency"
                        value={`${(summary?.average_latency_ms || 0).toFixed(1)}ms`}
                        trend="OpenVINO optimized"
                    />
                    <StatsCard
                        icon={<Shield className="w-5 h-5 text-purple-500" />}
                        label="Privacy Compliance"
                        value={`${summary?.total_vehicles ? Math.round((summary.consent_granted_count / summary.total_vehicles) * 100) : 0}%`}
                        trend={`${summary?.consent_granted_count || 0} granted`}
                    />
                </div>

                {/* Map Section */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                            🗺️ Vehicle Locations
                        </h2>
                        <span className="text-sm text-slate-500">
                            {vehicleArray.length} vehicles on map
                        </span>
                    </div>
                    <FleetMap vehicles={vehicleArray} />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                            📊 Occupancy Distribution
                        </h2>
                        <OccupancyChart vehicles={vehicleArray} />
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                            ⚡ Inference Latency
                        </h2>
                        <LatencyChart vehicles={vehicleArray} />
                    </div>
                </div>

                {/* Vehicle Grid */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                            🚗 Vehicle Status
                        </h2>
                        <span className="text-sm text-slate-500">
                            Real-time updates
                        </span>
                    </div>
                    <VehicleGrid vehicles={vehicleArray} />
                </div>
            </main>
        </div>
    )
}
