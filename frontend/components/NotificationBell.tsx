'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, X, Check, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth'

interface Alert {
    id: number
    alert_type: string
    title: string
    message: string
    severity: string
    vehicle_id: string | null
    geofence_id: number | null
    is_read: boolean
    is_acknowledged: boolean
    created_at: string
}

interface NotificationBellProps {
    apiUrl?: string
}

export function NotificationBell({ apiUrl = 'http://localhost:8000' }: NotificationBellProps) {
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const loadAlerts = useCallback(async () => {
        try {
            const response = await fetchWithAuth(`${apiUrl}/api/alerts?limit=10`)
            if (response.ok) {
                const data = await response.json()
                setAlerts(data)
            }
        } catch (err) {
            console.error('Failed to load alerts:', err)
        }
    }, [apiUrl])

    const loadUnreadCount = useCallback(async () => {
        try {
            const response = await fetchWithAuth(`${apiUrl}/api/alerts/unread-count`)
            if (response.ok) {
                const data = await response.json()
                setUnreadCount(data.unread_count)
            }
        } catch (err) {
            console.error('Failed to load unread count:', err)
        }
    }, [apiUrl])

    useEffect(() => {
        loadUnreadCount()
        // Poll for new alerts every 30 seconds
        const interval = setInterval(loadUnreadCount, 30000)
        return () => clearInterval(interval)
    }, [loadUnreadCount])

    useEffect(() => {
        if (isOpen) {
            loadAlerts()
        }
    }, [isOpen, loadAlerts])

    const markAsRead = async (alertId: number) => {
        try {
            await fetchWithAuth(`${apiUrl}/api/alerts/${alertId}/read`, {
                method: 'POST',
            })
            setAlerts(alerts.map(a => a.id === alertId ? { ...a, is_read: true } : a))
            setUnreadCount(Math.max(0, unreadCount - 1))
        } catch (err) {
            console.error('Failed to mark alert as read:', err)
        }
    }

    const markAllAsRead = async () => {
        try {
            await fetchWithAuth(`${apiUrl}/api/alerts/read-all`, {
                method: 'POST',
            })
            setAlerts(alerts.map(a => ({ ...a, is_read: true })))
            setUnreadCount(0)
        } catch (err) {
            console.error('Failed to mark all alerts as read:', err)
        }
    }

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <AlertCircle className="w-4 h-4 text-red-500" />
            case 'warning':
                return <AlertTriangle className="w-4 h-4 text-yellow-500" />
            default:
                return <Info className="w-4 h-4 text-blue-500" />
        }
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'border-l-red-500'
            case 'warning':
                return 'border-l-yellow-500'
            default:
                return 'border-l-blue-500'
        }
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = now.getTime() - date.getTime()

        if (diff < 60000) return 'Just now'
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
        return date.toLocaleDateString()
    }

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-800 dark:text-white">
                                Notifications
                            </h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* Alert List */}
                        <div className="max-h-80 overflow-y-auto">
                            {alerts.length === 0 ? (
                                <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                                    <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                                    <p>No notifications</p>
                                </div>
                            ) : (
                                alerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className={`px-4 py-3 border-b border-slate-100 dark:border-slate-700 border-l-4 ${getSeverityColor(alert.severity)} ${!alert.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                            } hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer`}
                                        onClick={() => !alert.is_read && markAsRead(alert.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            {getSeverityIcon(alert.severity)}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className="font-medium text-slate-800 dark:text-white text-sm truncate">
                                                        {alert.title}
                                                    </h4>
                                                    {!alert.is_read && (
                                                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                                    {alert.message}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {formatTime(alert.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
