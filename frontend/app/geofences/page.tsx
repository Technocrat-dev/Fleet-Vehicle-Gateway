'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    MapPin, Plus, Trash2, Edit2, Bell, BellOff,
    ArrowLeft, Check, X, AlertTriangle
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth'

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
            }
        } catch (err) {
            setError('Failed to delete geofence')
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
            <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-40">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </Link>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-6 h-6 text-blue-500" />
                                <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                                    Geofences
                                </h1>
                            </div>
                        </div>
                        {/* Button moved to main content area */}
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {geofences.length === 0 ? (
                    <div className="text-center py-16">
                        <MapPin className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                            No Geofences Yet
                        </h2>
                        <p className="text-slate-500 dark:text-slate-500 mb-6">
                            Create your first geofence to start monitoring vehicle locations.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Create Your First Geofence
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {geofences.map((geofence) => (
                            <div
                                key={geofence.id}
                                className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border-l-4 ${geofence.is_active ? '' : 'opacity-60'
                                    }`}
                                style={{ borderLeftColor: geofence.color }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-slate-800 dark:text-white text-lg">
                                            {geofence.name}
                                        </h3>
                                        {geofence.description && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                {geofence.description}
                                            </p>
                                        )}
                                    </div>
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: geofence.color }}
                                    />
                                </div>

                                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    <div className="flex items-center gap-1">
                                        {geofence.alert_on_enter ? (
                                            <Bell className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <BellOff className="w-4 h-4 text-slate-400" />
                                        )}
                                        <span>Enter</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {geofence.alert_on_exit ? (
                                            <Bell className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <BellOff className="w-4 h-4 text-slate-400" />
                                        )}
                                        <span>Exit</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        onClick={() => toggleGeofenceActive(geofence)}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${geofence.is_active
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                            }`}
                                    >
                                        {geofence.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setEditingGeofence(geofence)}
                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4 text-slate-500" />
                                        </button>
                                        <button
                                            onClick={() => deleteGeofence(geofence.id)}
                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
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

// Geofence Create/Edit Modal
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
    const [color, setColor] = useState(geofence?.color || '#3B82F6')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Default polygon for Tokyo area (simple rectangle)
    const defaultPolygon = {
        type: 'Polygon' as const,
        coordinates: [[
            [139.68, 35.70],  // NW corner
            [139.78, 35.70],  // NE corner
            [139.78, 35.65],  // SE corner
            [139.68, 35.65],  // SW corner
            [139.68, 35.70],  // Close polygon
        ]]
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
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
                    polygon: geofence?.polygon || defaultPolygon,
                    alert_on_enter: alertOnEnter,
                    alert_on_exit: alertOnExit,
                    color,
                }),
            })

            if (response.ok) {
                onSave()
            } else {
                const data = await response.json()
                setError(data.detail || 'Failed to save geofence')
            }
        } catch (err) {
            setError('Error saving geofence')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                        {geofence ? 'Edit Geofence' : 'Create Geofence'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g., Tokyo Station Area"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Optional description"
                            rows={2}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Color
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-10 h-10 rounded-lg cursor-pointer border-0"
                            />
                            <span className="text-sm text-slate-500">{color}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={alertOnEnter}
                                onChange={(e) => setAlertOnEnter(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                Alert on enter
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={alertOnExit}
                                onChange={(e) => setAlertOnExit(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                Alert on exit
                            </span>
                        </label>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                            📍 A default polygon around Tokyo will be created. You can edit the coordinates later using the map editor.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name}
                            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : (geofence ? 'Update' : 'Create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
