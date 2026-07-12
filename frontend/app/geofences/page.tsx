'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Trash2, Edit2, X, Undo2 } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth'
import { PageHeader } from '@/components/PageHeader'

// Interface for the map component props
interface GeofenceMapProps {
    initialPolygon?: { type: 'Polygon', coordinates: number[][][] } | null
    color: string
    onPolygonChange: (polygon: { type: 'Polygon', coordinates: number[][][] } | null) => void
}

// Dynamic import for map (SSR disabled)
// @ts-ignore Next.js dynamic import issue
const GeofenceMap = dynamic<GeofenceMapProps>(
    () => import('./GeofenceMapComponent').then(mod => mod.default),
    {
        ssr: false,
        loading: () => (
            <div className="h-[350px] bg-sunken border border-line rounded flex items-center justify-center">
                <span className="text-sm text-ink-muted">Loading map…</span>
            </div>
        )
    }
)

interface Geofence {
    id: number
    name: string
    description: string | null
    polygon: {
        type: string
        coordinates: number[][][]
    }
    alert_on_enter: boolean
    alert_on_exit: boolean
    color: string
    is_active: boolean
    created_at: string
    updated_at: string
}

const inputClass = 'w-full px-3 py-2 bg-surface border border-line-strong rounded text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-colors'

export default function GeofencesPage() {
    const [geofences, setGeofences] = useState<Geofence[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null)

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    const loadGeofences = useCallback(async () => {
        try {
            const response = await fetchWithAuth(`${apiUrl}/api/geofences`)
            if (response.ok) {
                const data = await response.json()
                setGeofences(data)
            } else {
                setError('Failed to load geofences')
            }
        } catch (err) {
            setError('Error loading geofences')
        } finally {
            setLoading(false)
        }
    }, [apiUrl])

    useEffect(() => {
        loadGeofences()
    }, [loadGeofences])

    const deleteGeofence = async (id: number) => {
        if (!confirm('Are you sure you want to delete this geofence?')) return

        try {
            const response = await fetchWithAuth(`${apiUrl}/api/geofences/${id}`, {
                method: 'DELETE',
            })
            if (response.ok) {
                setGeofences(geofences.filter(g => g.id !== id))
            } else {
                const data = await response.json().catch(() => ({}))
                setError(data.detail || `Failed to delete geofence (${response.status})`)
            }
        } catch (err) {
            console.error('Delete error:', err)
            setError('Failed to delete geofence - check console for details')
        }
    }

    const toggleGeofenceActive = async (geofence: Geofence) => {
        try {
            const response = await fetchWithAuth(`${apiUrl}/api/geofences/${geofence.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !geofence.is_active }),
            })
            if (response.ok) {
                const updated = await response.json()
                setGeofences(geofences.map(g => g.id === geofence.id ? updated : g))
            }
        } catch (err) {
            setError('Failed to update geofence')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-paper flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-line-strong border-t-brand" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-paper">
            <PageHeader title="Geofences" backHref="/dashboard">
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-hover text-white rounded font-medium text-sm transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">New geofence</span>
                </button>
            </PageHeader>

            <main className="container mx-auto px-6 py-6">
                <p className="text-sm text-ink-secondary mb-6 max-w-xl">
                    Draw polygon zones on the map. When vehicles enter or exit a zone you
                    receive a notification — alerts repeat at most every 5 minutes per
                    vehicle per zone.
                </p>

                {error && (
                    <div className="mb-6 px-4 py-3 bg-crit-bg text-crit rounded text-sm flex items-center gap-2">
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto" title="Dismiss">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {geofences.length === 0 ? (
                    <div className="border border-line rounded bg-surface text-center py-16">
                        <h2 className="text-base font-semibold mb-1">No geofences yet</h2>
                        <p className="text-sm text-ink-secondary mb-5">
                            Create your first geofence to start monitoring vehicle locations.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded font-medium text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            New geofence
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {geofences.map((geofence) => (
                            <div
                                key={geofence.id}
                                className={`bg-surface border border-line rounded p-4 ${geofence.is_active ? '' : 'opacity-60'}`}
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-2.5 h-2.5 rounded-sm shrink-0"
                                                style={{ backgroundColor: geofence.color }}
                                            />
                                            <h3 className="font-semibold text-sm truncate">
                                                {geofence.name}
                                            </h3>
                                        </div>
                                        {geofence.description && (
                                            <p className="text-xs text-ink-secondary mt-1">
                                                {geofence.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="text-xs text-ink-secondary mb-3">
                                    Alerts:{' '}
                                    <span className="text-ink">
                                        {[
                                            geofence.alert_on_enter && 'enter',
                                            geofence.alert_on_exit && 'exit',
                                        ].filter(Boolean).join(', ') || 'off'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-line">
                                    <button
                                        onClick={() => toggleGeofenceActive(geofence)}
                                        className={`px-1.5 py-0.5 rounded-sm text-xs font-medium transition-colors ${geofence.is_active
                                            ? 'bg-ok-bg text-ok'
                                            : 'bg-sunken text-ink-secondary'
                                            }`}
                                    >
                                        {geofence.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setEditingGeofence(geofence)}
                                            className="p-1.5 text-ink-secondary hover:text-ink hover:bg-sunken rounded transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => deleteGeofence(geofence.id)}
                                            className="p-1.5 text-ink-secondary hover:text-crit hover:bg-crit-bg rounded transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Modal */}
            {showCreateModal && (
                <GeofenceModal
                    onClose={() => setShowCreateModal(false)}
                    onSave={() => {
                        setShowCreateModal(false)
                        loadGeofences()
                    }}
                    apiUrl={apiUrl}
                />
            )}

            {/* Edit Modal */}
            {editingGeofence && (
                <GeofenceModal
                    geofence={editingGeofence}
                    onClose={() => setEditingGeofence(null)}
                    onSave={() => {
                        setEditingGeofence(null)
                        loadGeofences()
                    }}
                    apiUrl={apiUrl}
                />
            )}
        </div>
    )
}

// Geofence Create/Edit Modal with Map Drawing
interface GeofenceModalProps {
    geofence?: Geofence
    onClose: () => void
    onSave: () => void
    apiUrl: string
}

function GeofenceModal({ geofence, onClose, onSave, apiUrl }: GeofenceModalProps) {
    const [name, setName] = useState(geofence?.name || '')
    const [description, setDescription] = useState(geofence?.description || '')
    const [alertOnEnter, setAlertOnEnter] = useState(geofence?.alert_on_enter ?? true)
    const [alertOnExit, setAlertOnExit] = useState(geofence?.alert_on_exit ?? true)
    const [color, setColor] = useState(geofence?.color || '#22314e')
    const [polygon, setPolygon] = useState<{ type: 'Polygon', coordinates: number[][][] } | null>(
        geofence?.polygon ? { type: 'Polygon', coordinates: geofence.polygon.coordinates } : null
    )
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!polygon) {
            setError('Please draw a geofence area on the map')
            return
        }

        setSaving(true)
        setError(null)

        try {
            const url = geofence
                ? `${apiUrl}/api/geofences/${geofence.id}`
                : `${apiUrl}/api/geofences`

            const response = await fetchWithAuth(url, {
                method: geofence ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description: description || null,
                    polygon,
                    alert_on_enter: alertOnEnter,
                    alert_on_exit: alertOnExit,
                    color,
                }),
            })

            if (response.ok) {
                onSave()
            } else {
                const data = await response.json().catch(() => ({}))
                console.error('Geofence save failed:', data)
                setError(data.detail || `Failed to save geofence (${response.status})`)
            }
        } catch (err) {
            console.error('Geofence save error:', err)
            setError(`Error saving geofence: ${err instanceof Error ? err.message : String(err)}`)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-ink/30 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded w-full max-w-3xl shadow-[0_16px_48px_rgba(26,28,32,0.18)] max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 h-14 border-b border-line sticky top-0 bg-surface z-10">
                    <h2 className="text-sm font-semibold">
                        {geofence ? 'Edit geofence' : 'New geofence'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-ink-secondary hover:text-ink hover:bg-sunken rounded transition-colors"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {error && (
                        <div className="px-3 py-2 bg-crit-bg text-crit rounded text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                                Name *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={inputClass}
                                placeholder="e.g. Tokyo Station area"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                                Color
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-9 h-9 rounded cursor-pointer border border-line-strong bg-surface p-0.5"
                                />
                                <span className="num text-sm text-ink-secondary">{color}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={inputClass}
                            placeholder="Optional description"
                            rows={2}
                        />
                    </div>

                    {/* Map Drawing Area */}
                    <div>
                        <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                            Area * — click the map to place points; click the first point again to close the polygon
                        </label>
                        <GeofenceMap
                            initialPolygon={polygon}
                            color={color}
                            onPolygonChange={setPolygon}
                        />
                        {polygon && (
                            <div className="mt-2 text-sm text-ink-secondary flex items-center gap-3">
                                <span>
                                    Polygon with{' '}
                                    <span className="num text-ink">{polygon.coordinates[0].length - 1}</span> points
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPolygon(null)}
                                    className="text-crit hover:underline flex items-center gap-1 text-xs font-medium"
                                >
                                    <Undo2 className="w-3 h-3" />
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-secondary">
                            <input
                                type="checkbox"
                                checked={alertOnEnter}
                                onChange={(e) => setAlertOnEnter(e.target.checked)}
                                className="w-4 h-4 rounded-sm border-line-strong accent-[var(--brand)]"
                            />
                            Alert on enter
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-secondary">
                            <input
                                type="checkbox"
                                checked={alertOnExit}
                                onChange={(e) => setAlertOnExit(e.target.checked)}
                                className="w-4 h-4 rounded-sm border-line-strong accent-[var(--brand)]"
                            />
                            Alert on exit
                        </label>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-line-strong text-ink-secondary hover:text-ink hover:bg-sunken rounded text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name || !polygon}
                            className="flex-1 px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : (geofence ? 'Update' : 'Create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
