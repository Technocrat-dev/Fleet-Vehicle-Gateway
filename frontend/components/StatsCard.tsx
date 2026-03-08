/**
 * Stats Card Component
 */

interface StatsCardProps {
    icon: React.ReactNode
    label: string
    value: string | number
    trend?: string
    accentColor?: string
}

export function StatsCard({ icon, label, value, trend, accentColor }: StatsCardProps) {
    return (
        <div className="glass-light rounded-xl p-4 card-hover group">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.08] transition-colors">
                    {icon}
                </div>
                <span className="text-sm text-[var(--text-secondary)] font-medium">{label}</span>
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)] stat-number">
                {value}
            </div>
            {trend && (
                <div className="text-xs text-[var(--text-muted)] mt-2 font-medium">{trend}</div>
            )}
        </div>
    )
}
