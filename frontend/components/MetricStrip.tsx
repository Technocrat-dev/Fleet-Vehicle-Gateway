export interface Metric {
    label: string
    value: string | number
    detail?: string
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
                    <div className="num text-2xl font-semibold leading-none">{m.value}</div>
                    {m.detail && (
                        <div className="text-xs text-ink-muted mt-1.5">{m.detail}</div>
                    )}
                </div>
            ))}
        </div>
    )
}
