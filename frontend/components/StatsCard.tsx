/**
 * Stats Card Component
 */

interface StatsCardProps {
    icon: React.ReactNode
    label: string
    value: string | number
    trend?: string
}

export function StatsCard({ icon, label, value, trend }: StatsCardProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm card-hover">
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white stat-number">
                {value}
            </div>
            {trend && (
                <div className="text-xs text-slate-400 mt-1">{trend}</div>
            )}
        </div>
    )
}
