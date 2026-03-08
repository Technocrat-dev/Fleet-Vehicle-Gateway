/**
 * Vehicle Grid Component
 */

import { VehicleStatus } from '@/lib/websocket'
import { User, Navigation, Clock } from 'lucide-react'

interface VehicleGridProps {
    vehicles: VehicleStatus[]
}

export function VehicleGrid({ vehicles }: VehicleGridProps) {
    if (vehicles.length === 0) {
        return (
            <div className="text-center py-12 text-[var(--text-muted)]">
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
    const occupancyRatio = vehicle.occupancy_count / 8
    const occupancyColor =
        occupancyRatio >= 0.85 ? 'text-[var(--danger)]' :
            occupancyRatio >= 0.5 ? 'text-[var(--accent-warm)]' :
                'text-[var(--success)]'

    const barColor =
        occupancyRatio >= 0.85 ? 'bg-[var(--danger)]' :
            occupancyRatio >= 0.5 ? 'bg-[var(--accent-warm)]' :
                'bg-[var(--success)]'

    return (
        <div className="glass-light rounded-lg p-3 card-hover group cursor-default">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wide">
                    {vehicle.vehicle_id.replace('vehicle-', 'V-')}
                </span>
                <span className={`text-[10px] ${vehicle.is_active ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                    {vehicle.is_active ? '●' : '○'}
                </span>
            </div>

            {/* Occupancy bar */}
            <div className="flex items-center gap-2 mb-2">
                <User className={`w-3.5 h-3.5 ${occupancyColor}`} />
                <span className={`text-lg font-bold ${occupancyColor} stat-number`}>
                    {vehicle.occupancy_count}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">/ 8</span>
            </div>

            {/* Capacity bar */}
            <div className="w-full h-1 bg-white/[0.04] rounded-full mb-2 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${Math.min(occupancyRatio * 100, 100)}%`, opacity: 0.7 }}
                />
            </div>

            {/* Mini stats */}
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
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
