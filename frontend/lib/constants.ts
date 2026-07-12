/** Seated capacity used for occupancy ratios across the dashboard. */
export const VEHICLE_CAPACITY = 8

/** Occupancy level → status color, shared by table, map, and charts. */
export function occupancyLevel(count: number): 'ok' | 'warn' | 'crit' {
    const ratio = count / VEHICLE_CAPACITY
    if (ratio >= 0.85) return 'crit'
    if (ratio >= 0.5) return 'warn'
    return 'ok'
}

export const STATUS_HEX: Record<'ok' | 'warn' | 'crit', string> = {
    ok: '#1a7f4b',
    warn: '#b45309',
    crit: '#b91c1c',
}
