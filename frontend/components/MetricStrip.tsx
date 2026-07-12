'use client'

import { TickValue } from '@/components/TickValue'

export interface Metric {
    label: string
    value: string | number
    detail?: string
    /** Recent samples rendered as a sparkline; grows as the session streams. */
    spark?: number[]
}

function Sparkline({ data }: { data: number[] }) {
    if (data.length < 2) return null

    const w = 72
    const h = 22
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const points = data
        .map((v, i) => {
            const x = (i / (data.length - 1)) * w
            const y = h - 2 - ((v - min) / range) * (h - 4)
            return `${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')

    const last = data[data.length - 1]
    const lastY = h - 2 - ((last - min) / range) * (h - 4)

    return (
        <svg width={w} height={h} className="shrink-0" aria-hidden="true">
            <polyline
                points={points}
                fill="none"
                stroke="var(--brand)"
                strokeWidth="1.25"
                strokeLinejoin="round"
                opacity="0.55"
            />
            <circle cx={w} cy={lastY} r="1.75" fill="var(--signal)" />
        </svg>
    )
}

/**
 * Single bordered row of key figures, divided by hairlines.
 * Values are monospace with tabular numerals so they don't jitter as data streams.
 */
export function MetricStrip({ metrics }: { metrics: Metric[] }) {
    return (
        <div className="bg-surface border border-line rounded grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-line">
            {metrics.map((m) => (
                <div key={m.label} className="px-5 py-4">
                    <div className="text-xs text-ink-secondary mb-1">{m.label}</div>
                    <div className="flex items-end justify-between gap-3">
                        <TickValue value={m.value} className="num text-2xl font-semibold leading-none" />
                        {m.spark && <Sparkline data={m.spark} />}
                    </div>
                    {m.detail && (
                        <div className="text-xs text-ink-muted mt-1.5">{m.detail}</div>
                    )}
                </div>
            ))}
        </div>
    )
}
