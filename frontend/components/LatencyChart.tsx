/**
 * Latency Chart — histogram of inference latency across the fleet.
 * Bins are computed from the observed range so outliers never fall off the chart.
 */

'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { VehicleStatus } from '@/lib/websocket'

interface LatencyChartProps {
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

export function LatencyChart({ vehicles }: LatencyChartProps) {
    if (vehicles.length === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-sm text-ink-muted">
                Waiting for data…
            </div>
        )
    }

    const latencies = vehicles.map(v => v.inference_latency_ms)
    const min = Math.floor(Math.min(...latencies))
    const max = Math.ceil(Math.max(...latencies))
    const binSize = Math.max(1, Math.ceil((max - min) / 8))

    const bins: { latency: string; count: number }[] = []
    for (let start = min; start <= max; start += binSize) {
        bins.push({
            latency: `${start}`,
            count: latencies.filter(l => l >= start && l < start + binSize).length,
        })
    }

    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length

    return (
        <div>
            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bins} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#e2e2dd" />
                        <XAxis
                            dataKey="latency"
                            tick={tick}
                            tickLine={false}
                            axisLine={{ stroke: '#cfcfc8' }}
                            unit="ms"
                        />
                        <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                            cursor={{ fill: '#ededea' }}
                            contentStyle={tooltipStyle}
                            formatter={(value: number) => [`${value} vehicles`, 'Count']}
                            labelFormatter={(label) => `${label}–${Number(label) + binSize} ms`}
                        />
                        <ReferenceLine
                            x={`${Math.floor((avgLatency - min) / binSize) * binSize + min}`}
                            stroke="#d9480f"
                            strokeDasharray="4 3"
                        />
                        <Bar dataKey="count" fill="#22314e" radius={[2, 2, 0, 0]} maxBarSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs text-ink-muted mt-2">
                <span>Inference latency, {binSize} ms bins</span>
                <span className="num">
                    avg <span className="text-signal font-medium">{avgLatency.toFixed(1)} ms</span>
                </span>
            </div>
        </div>
    )
}
