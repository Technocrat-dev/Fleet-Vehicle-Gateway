/**
 * Vehicle Grid Component - Shows all vehicles in a grid layout
 */

import { VehicleStatus } from '@/lib/websocket'
import { User, Navigation, Clock } from 'lucide-react'

interface VehicleGridProps {
    vehicles: VehicleStatus[]
}

export function VehicleGrid({ vehicles }: VehicleGridProps) {
    if (vehicles.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500">
                Waiting for vehicle data...
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {vehicles.map((vehicle) => (
                <VehicleCard key={vehicle.vehicle_id} vehicle={vehicle} />
            ))}
        </div>
    )
}

function VehicleCard({ vehicle }: { vehicle: VehicleStatus }) {
    const occupancyColor =
        vehicle.occupancy_count >= 7 ? 'text-red-500' :
            vehicle.occupancy_count >= 4 ? 'text-yellow-500' :
                'text-green-500'

    return (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {vehicle.vehicle_id.replace('vehicle-', 'V-')}
                </span>
                <span className={`text-xs ${vehicle.is_active ? 'text-green-500' : 'text-slate-400'}`}>
                    ●
                </span>
            </div>

            {/* Occupancy indicator */}
            <div className="flex items-center gap-1 mb-2">
                <User className={`w-4 h-4 ${occupancyColor}`} />
                <span className={`text-lg font-bold ${occupancyColor}`}>
                    {vehicle.occupancy_count}
                </span>
                <span className="text-xs text-slate-400">/ 8</span>
            </div>

            {/* Mini stats */}
            <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{vehicle.inference_latency_ms.toFixed(1)}ms</span>
                </div>
                {vehicle.speed_kmh && (
                    <div className="flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        <span>{Math.round(vehicle.speed_kmh)}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
