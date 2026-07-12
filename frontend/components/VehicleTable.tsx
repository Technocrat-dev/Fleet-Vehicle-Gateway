'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { VehicleStatus } from '@/lib/websocket'
import { VEHICLE_CAPACITY, occupancyLevel } from '@/lib/constants'
import { TickValue } from '@/components/TickValue'

interface VehicleTableProps {
    vehicles: VehicleStatus[]
    onSelect?: (vehicle: VehicleStatus) => void
}

type SortKey = 'vehicle_id' | 'occupancy_count' | 'inference_latency_ms' | 'speed_kmh' | 'safety_score'

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

function compare(a: VehicleStatus, b: VehicleStatus, key: SortKey): number {
    if (key === 'vehicle_id') {
        return a.vehicle_id.localeCompare(b.vehicle_id, undefined, { numeric: true })
    }
    return (a[key] ?? -Infinity) - (b[key] ?? -Infinity)
}

function SortHeader({
    label,
    sortKey,
    active,
    dir,
    onSort,
    align = 'left',
}: {
    label: string
    sortKey: SortKey
    active: boolean
    dir: 1 | -1
    onSort: (key: SortKey) => void
    align?: 'left' | 'right'
}) {
    return (
        <th className={`font-medium py-2 pr-4 ${align === 'right' ? 'text-right' : 'text-left'}`}>
            <button
                onClick={() => onSort(sortKey)}
                className={`inline-flex items-center gap-0.5 hover:text-ink transition-colors ${active ? 'text-ink' : ''}`}
            >
                {label}
                <span className="w-3">
                    {active && (dir === 1
                        ? <ChevronUp className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />)}
                </span>
            </button>
        </th>
    )
}

export function VehicleTable({ vehicles, onSelect }: VehicleTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>('vehicle_id')
    const [dir, setDir] = useState<1 | -1>(1)

    if (vehicles.length === 0) {
        return (
            <div className="text-center py-12 text-sm text-ink-muted">
                Waiting for vehicle data…
            </div>
        )
    }

    const handleSort = (key: SortKey) => {
        if (key === sortKey) {
            setDir(d => (d === 1 ? -1 : 1))
        } else {
            setSortKey(key)
            // Metrics start descending (largest first), ids ascending
            setDir(key === 'vehicle_id' ? 1 : -1)
        }
    }

    const sorted = [...vehicles].sort((a, b) => dir * compare(a, b, sortKey))

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-line text-xs text-ink-secondary">
                        <SortHeader label="Vehicle" sortKey="vehicle_id" active={sortKey === 'vehicle_id'} dir={dir} onSort={handleSort} />
                        <th className="font-medium py-2 pr-4 text-left">Status</th>
                        <SortHeader label="Occupancy" sortKey="occupancy_count" active={sortKey === 'occupancy_count'} dir={dir} onSort={handleSort} />
                        <SortHeader label="Latency" sortKey="inference_latency_ms" active={sortKey === 'inference_latency_ms'} dir={dir} onSort={handleSort} align="right" />
                        <SortHeader label="Speed" sortKey="speed_kmh" active={sortKey === 'speed_kmh'} dir={dir} onSort={handleSort} align="right" />
                        <SortHeader label="Safety" sortKey="safety_score" active={sortKey === 'safety_score'} dir={dir} onSort={handleSort} align="right" />
                        <th className="font-medium py-2 text-left">Consent</th>
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
                    <TickValue
                        value={`${vehicle.occupancy_count}/${VEHICLE_CAPACITY}`}
                        className={`num font-medium w-8 inline-block ${levelText[level]}`}
                    />
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
