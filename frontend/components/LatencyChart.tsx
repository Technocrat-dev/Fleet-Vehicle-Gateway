/**
 * Latency Chart Component - Shows inference latency distribution
 */

'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { VehicleStatus } from '@/lib/websocket'

interface LatencyChartProps {
    vehicles: VehicleStatus[]
}

export function LatencyChart({ vehicles }: LatencyChartProps) {
    // Create histogram bins for latency
    const bins = [7, 8, 9, 10, 11, 12, 13, 14]
    const histogram = bins.map(bin => ({
        latency: `${bin}ms`,
        count: vehicles.filter(v =>
            v.inference_latency_ms >= bin && v.inference_latency_ms < bin + 1
        ).length,
    }))

    // Calculate average
    const avgLatency = vehicles.length > 0
        ? vehicles.reduce((sum, v) => sum + v.inference_latency_ms, 0) / vehicles.length
        : 0

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
                <AreaChart data={histogram} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="latency"
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
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#latencyGradient)"
                    />
                </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-xs text-slate-500 mt-2 px-2">
                <span>Inference latency distribution</span>
                <span className="font-medium text-blue-500">
                    Avg: {avgLatency.toFixed(1)}ms
                </span>
            </div>
        </div>
    )
}
