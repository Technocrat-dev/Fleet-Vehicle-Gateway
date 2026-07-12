'use client'

import { X } from 'lucide-react'
import { VehicleStatus } from '@/lib/websocket'
import { VEHICLE_CAPACITY } from '@/lib/constants'

interface VehicleDetailDrawerProps {
    vehicle: VehicleStatus | null
    onClose: () => void
}

function Row({ label, value, valueClass = '' }: { label: string; value: React.ReactNode; valueClass?: string }) {
    return (
        <div className="flex items-baseline justify-between py-2 border-b border-line last:border-b-0">
            <span className="text-sm text-ink-secondary">{label}</span>
            <span className={`num text-sm ${valueClass}`}>{value}</span>
        </div>
    )
}

function Tag({ tone, children }: { tone: 'ok' | 'warn' | 'crit' | 'neutral'; children: React.ReactNode }) {
    const tones = {
        ok: 'bg-ok-bg text-ok',
        warn: 'bg-warn-bg text-warn',
        crit: 'bg-crit-bg text-crit',
        neutral: 'bg-sunken text-ink-secondary',
    }
    return (
        <span className={`inline-block px-1.5 py-0.5 rounded-sm text-xs font-medium ${tones[tone]}`}>
            {children}
        </span>
    )
}

export function VehicleDetailDrawer({ vehicle, onClose }: VehicleDetailDrawerProps) {
    if (!vehicle) return null

    const consentTone =
        vehicle.consent_status === 'granted' ? 'ok' :
            vehicle.consent_status === 'withdrawn' ? 'crit' : 'warn'

    const consentLabel =
        vehicle.consent_status === 'granted' ? 'Granted' :
            vehicle.consent_status === 'withdrawn' ? 'Withdrawn' : 'Pending'

    return (
        <>
            <div
                className="fixed inset-0 bg-ink/30 z-40 animate-fade-in"
                onClick={onClose}
            />

            <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-surface border-l border-line z-50 overflow-y-auto animate-slide-in-right">
                {/* Header */}
                <div className="sticky top-0 bg-surface border-b border-line px-5 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${vehicle.is_active ? 'bg-ok' : 'bg-line-strong'}`} />
                        <h2 className="num text-base font-semibold">
                            {vehicle.vehicle_id.replace('vehicle-', 'V-')}
                        </h2>
                        <span className="text-xs text-ink-muted">
                            {vehicle.is_active ? 'Active' : 'Offline'}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-ink-secondary hover:text-ink hover:bg-sunken rounded transition-colors"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-6">
                    {/* Telemetry */}
                    <section>
                        <h3 className="text-xs font-semibold text-ink-muted mb-1">Telemetry</h3>
                        <Row label="Passengers" value={`${vehicle.occupancy_count} / ${VEHICLE_CAPACITY}`} />
                        <Row label="Inference latency" value={`${vehicle.inference_latency_ms?.toFixed(1) ?? '—'} ms`} />
                        <Row label="Speed" value={vehicle.speed_kmh != null ? `${vehicle.speed_kmh.toFixed(1)} km/h` : '—'} />
                        {vehicle.route_id && <Row label="Route" value={vehicle.route_id} />}
                        <Row label="Last seen" value={new Date(vehicle.last_seen).toLocaleTimeString()} />
                    </section>

                    {/* Location */}
                    <section>
                        <h3 className="text-xs font-semibold text-ink-muted mb-1">Location</h3>
                        <Row label="Latitude" value={vehicle.location?.latitude?.toFixed(6) ?? '—'} />
                        <Row label="Longitude" value={vehicle.location?.longitude?.toFixed(6) ?? '—'} />
                    </section>

                    {/* Privacy */}
                    <section>
                        <h3 className="text-xs font-semibold text-ink-muted mb-1">Privacy</h3>
                        <Row label="Consent" value={<Tag tone={consentTone}>{consentLabel}</Tag>} />
                    </section>

                    {/* Driver */}
                    {(vehicle.safety_score !== undefined || vehicle.driver_id) && (
                        <section>
                            <h3 className="text-xs font-semibold text-ink-muted mb-1">Driver</h3>
                            {vehicle.driver_id && <Row label="Driver" value={vehicle.driver_id} />}
                            {vehicle.safety_score !== undefined && (
                                <>
                                    <Row
                                        label="Safety score"
                                        value={`${vehicle.safety_score.toFixed(0)} / 100`}
                                        valueClass={
                                            vehicle.safety_score >= 80 ? 'text-ok font-medium' :
                                                vehicle.safety_score >= 60 ? 'text-warn font-medium' :
                                                    'text-crit font-medium'
                                        }
                                    />
                                    <div className="w-full h-1 bg-sunken rounded-full mt-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${vehicle.safety_score >= 80 ? 'bg-ok' :
                                                vehicle.safety_score >= 60 ? 'bg-warn' : 'bg-crit'
                                                }`}
                                            style={{ width: `${vehicle.safety_score}%` }}
                                        />
                                    </div>
                                </>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                                {vehicle.is_speeding && <Tag tone="crit">Speeding</Tag>}
                                {vehicle.is_idling && <Tag tone="warn">Idling</Tag>}
                                {!vehicle.is_speeding && !vehicle.is_idling && <Tag tone="ok">Normal</Tag>}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </>
    )
}
