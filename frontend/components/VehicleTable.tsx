'use client'

import { VehicleStatus } from '@/lib/websocket'
import { VEHICLE_CAPACITY, occupancyLevel } from '@/lib/constants'

interface VehicleTableProps {
    vehicles: VehicleStatus[]
    onSelect?: (vehicle: VehicleStatus) => void
}

const levelText = {
    ok: 'text-ok',
    warn: 'text-warn',
    crit: 'text-crit',
} as const

const levelBar = {
    ok: 'bg-ok',
    warn: 'bg-warn',
    crit: 'bg-crit',
} as const

export function VehicleTable({ vehicles, onSelect }: VehicleTableProps) {
    if (vehicles.length === 0) {
        return (
            <div className="text-center py-12 text-sm text-ink-muted">
                Waiting for vehicle data…
            </div>
        )
    }

    const sorted = [...vehicles].sort((a, b) =>
        a.vehicle_id.localeCompare(b.vehicle_id, undefined, { numeric: true })
    )

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-secondary">
                        <th className="font-medium py-2 pr-4">Vehicle</th>
                        <th className="font-medium py-2 pr-4">Status</th>
                        <th className="font-medium py-2 pr-4">Occupancy</th>
                        <th className="font-medium py-2 pr-4 text-right">Latency</th>
                        <th className="font-medium py-2 pr-4 text-right">Speed</th>
                        <th className="font-medium py-2 pr-4 text-right">Safety</th>
                        <th className="font-medium py-2">Consent</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {sorted.map((v) => (
                        <VehicleRow key={v.vehicle_id} vehicle={v} onSelect={onSelect} />
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function VehicleRow({
    vehicle,
    onSelect,
}: {
    vehicle: VehicleStatus
    onSelect?: (vehicle: VehicleStatus) => void
}) {
    const level = occupancyLevel(vehicle.occupancy_count)
    const ratio = Math.min(vehicle.occupancy_count / VEHICLE_CAPACITY, 1)

    return (
        <tr
            className={onSelect ? 'hover:bg-sunken cursor-pointer transition-colors' : undefined}
            onClick={() => onSelect?.(vehicle)}
        >
            <td className="num py-2.5 pr-4 font-medium whitespace-nowrap">
                {vehicle.vehicle_id.replace('vehicle-', 'V-')}
            </td>
            <td className="py-2.5 pr-4 whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5">
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${vehicle.is_active ? 'bg-ok' : 'bg-line-strong'}`}
                    />
                    <span className={vehicle.is_active ? 'text-ink-secondary' : 'text-ink-muted'}>
                        {vehicle.is_active ? 'Active' : 'Offline'}
                    </span>
                </span>
            </td>
            <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2.5">
                    <span className={`num font-medium w-8 ${levelText[level]}`}>
                        {vehicle.occupancy_count}/{VEHICLE_CAPACITY}
                    </span>
                    <div className="w-16 h-1 bg-sunken rounded-full overflow-hidden shrink-0">
                        <div
                            className={`h-full ${levelBar[level]} transition-[width] duration-500`}
                            style={{ width: `${ratio * 100}%` }}
                        />
                    </div>
                </div>
            </td>
            <td className="num py-2.5 pr-4 text-right text-ink-secondary whitespace-nowrap">
                {vehicle.inference_latency_ms.toFixed(1)} ms
            </td>
            <td className="num py-2.5 pr-4 text-right text-ink-secondary whitespace-nowrap">
                {vehicle.speed_kmh != null ? `${Math.round(vehicle.speed_kmh)} km/h` : '—'}
            </td>
            <td className="num py-2.5 pr-4 text-right whitespace-nowrap">
                {vehicle.safety_score != null ? (
                    <span
                        className={
                            vehicle.safety_score >= 80
                                ? 'text-ink-secondary'
                                : vehicle.safety_score >= 60
                                    ? 'text-warn'
                                    : 'text-crit'
                        }
                    >
                        {vehicle.safety_score.toFixed(0)}
                    </span>
                ) : (
                    <span className="text-ink-muted">—</span>
                )}
            </td>
            <td className="py-2.5 whitespace-nowrap">
                <span
                    className={`inline-block px-1.5 py-0.5 rounded-sm text-xs ${vehicle.consent_status === 'granted'
                        ? 'bg-ok-bg text-ok'
                        : 'bg-warn-bg text-warn'
                        }`}
                >
                    {vehicle.consent_status === 'granted' ? 'Granted' : 'Pending'}
                </span>
            </td>
        </tr>
    )
}
