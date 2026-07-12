/**
 * Occupancy Chart — vehicles grouped by passenger count.
 * Bar color carries the same status semantics as the table (ok / warn / crit).
 */

'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { VehicleStatus } from '@/lib/websocket'
import { VEHICLE_CAPACITY, occupancyLevel, STATUS_HEX } from '@/lib/constants'

interface OccupancyChartProps {
    vehicles: VehicleStatus[]
}

const tick = { fontSize: 11, fill: '#82878f', fontFamily: 'var(--font-mono)' }

const tooltipStyle = {
    background: '#ffffff',
    border: '1px solid #e2e2dd',
    borderRadius: '5px',
    color: '#1a1c20',
    fontSize: '12px',
    boxShadow: '0 4px 12px rgba(26, 28, 32, 0.08)',
}

export function OccupancyChart({ vehicles }: OccupancyChartProps) {
    const distribution = Array.from({ length: VEHICLE_CAPACITY + 1 }, (_, i) => ({
        occupancy: i,
        count: vehicles.filter(v => v.occupancy_count === i).length,
    }))

    if (vehicles.length === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-sm text-ink-muted">
                Waiting for data…
            </div>
        )
    }

    return (
        <div>
            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribution} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#e2e2dd" />
                        <XAxis
                            dataKey="occupancy"
                            tick={tick}
                            tickLine={false}
                            axisLine={{ stroke: '#cfcfc8' }}
                        />
                        <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                            cursor={{ fill: '#ededea' }}
                            contentStyle={tooltipStyle}
                            formatter={(value: number) => [`${value} vehicles`, 'Count']}
                            labelFormatter={(label) => `${label} passengers`}
                        />
                        <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={40}>
                            {distribution.map((entry) => (
                                <Cell
                                    key={`cell-${entry.occupancy}`}
                                    fill={STATUS_HEX[occupancyLevel(entry.occupancy)]}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="text-xs text-ink-muted mt-2">
                Passengers per vehicle, capacity {VEHICLE_CAPACITY}
            </div>
        </div>
    )
}
