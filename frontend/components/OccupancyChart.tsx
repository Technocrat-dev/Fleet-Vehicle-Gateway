/**
 * Occupancy Chart Component - Bar chart showing occupancy distribution
 */

'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { VehicleStatus } from '@/lib/websocket'

interface OccupancyChartProps {
    vehicles: VehicleStatus[]
}

export function OccupancyChart({ vehicles }: OccupancyChartProps) {
    // Group vehicles by occupancy count
    const distribution = Array.from({ length: 9 }, (_, i) => ({
        occupancy: i,
        count: vehicles.filter(v => v.occupancy_count === i).length,
    }))

    const getBarColor = (occupancy: number) => {
        if (occupancy >= 7) return '#ef4444'  // red
        if (occupancy >= 4) return '#f59e0b'  // yellow
        return '#22c55e'  // green
    }

    if (vehicles.length === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-slate-500">
                Waiting for data...
            </div>
        )
    }

    return (
        <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                        dataKey="occupancy"
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#1e293b',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#f1f5f9'
                        }}
                        formatter={(value: number) => [`${value} vehicles`, 'Count']}
                        labelFormatter={(label) => `${label} passengers`}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.occupancy)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <div className="text-xs text-center text-slate-500 mt-2">
                Passengers per vehicle
            </div>
        </div>
    )
}
