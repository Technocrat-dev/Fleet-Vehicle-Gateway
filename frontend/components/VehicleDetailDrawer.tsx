'use client'

import { X, MapPin, Users, Zap, Navigation, Clock, Shield, Activity } from 'lucide-react'
import { VehicleStatus } from '@/lib/websocket'

interface VehicleDetailDrawerProps {
    vehicle: VehicleStatus | null
    onClose: () => void
}

export function VehicleDetailDrawer({ vehicle, onClose }: VehicleDetailDrawerProps) {
    if (!vehicle) return null

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500'
            case 'idle': return 'bg-yellow-500'
            case 'offline': return 'bg-red-500'
            default: return 'bg-slate-500'
        }
    }

    const getConsentBadge = (status: string) => {
        switch (status) {
            case 'granted': return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', text: 'Granted' }
            case 'pending': return { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', text: 'Pending' }
            case 'withdrawn': return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', text: 'Withdrawn' }
            default: return { color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400', text: 'Unknown' }
        }
    }

    const consentBadge = getConsentBadge(vehicle.consent_status || 'pending')

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl z-50 overflow-y-auto transform transition-transform">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(vehicle.is_active ? 'active' : 'offline')} animate-pulse`} />
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                            {vehicle.vehicle_id}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${vehicle.is_active
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                            }`}>
                            {vehicle.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${consentBadge.color}`}>
                            <Shield className="w-3 h-3 inline mr-1" />
                            {consentBadge.text}
                        </span>
                    </div>

                    {/* Location Card */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
                            <MapPin className="w-4 h-4" />
                            <span>Current Location</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">Latitude</span>
                                <span className="font-mono text-slate-800 dark:text-white">
                                    {vehicle.location?.latitude?.toFixed(6) || 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">Longitude</span>
                                <span className="font-mono text-slate-800 dark:text-white">
                                    {vehicle.location?.longitude?.toFixed(6) || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                                <Users className="w-4 h-4" />
                                <span className="text-sm">Passengers</span>
                            </div>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                {vehicle.occupancy_count}
                            </div>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-1">
                                <Zap className="w-4 h-4" />
                                <span className="text-sm">Latency</span>
                            </div>
                            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                                {vehicle.inference_latency_ms?.toFixed(1) || 'N/A'}ms
                            </div>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                                <Activity className="w-4 h-4" />
                                <span className="text-sm">Speed</span>
                            </div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                                {vehicle.speed_kmh?.toFixed(1) || 0} km/h
                            </div>
                        </div>

                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                                <Navigation className="w-4 h-4" />
                                <span className="text-sm">Status</span>
                            </div>
                            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                {vehicle.is_active ? 'Online' : 'Offline'}
                            </div>
                        </div>
                    </div>

                    {/* Route Info */}
                    {vehicle.route_id && (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                                <Navigation className="w-4 h-4" />
                                <span>Current Route</span>
                            </div>
                            <div className="font-medium text-slate-800 dark:text-white">
                                {vehicle.route_id}
                            </div>
                        </div>
                    )}

                    {/* Last Update */}
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>Last seen: {new Date(vehicle.last_seen).toLocaleTimeString()}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors">
                            View History
                        </button>
                        <button className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl font-medium transition-colors">
                            Send Alert
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
