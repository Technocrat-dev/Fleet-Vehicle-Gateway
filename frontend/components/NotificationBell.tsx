'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell } from 'lucide-react'
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

const severityDot: Record<string, string> = {
    critical: 'bg-crit',
    warning: 'bg-warn',
}

export function NotificationBell({ apiUrl }: NotificationBellProps) {
    const effectiveApiUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    const [alerts, setAlerts] = useState<Alert[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const wsRef = useRef<WebSocket | null>(null)

    const wsUrl = effectiveApiUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/alerts'

    const loadAlerts = useCallback(async () => {
        try {
            const response = await fetchWithAuth(`${effectiveApiUrl}/api/alerts?limit=10`)
            if (response.ok) {
                setAlerts(await response.json())
            }
        } catch (err) {
            console.error('Failed to load alerts:', err)
        }
    }, [effectiveApiUrl])

    const loadUnreadCount = useCallback(async () => {
        try {
            const response = await fetchWithAuth(`${effectiveApiUrl}/api/alerts/unread-count`)
            if (response.ok) {
                const data = await response.json()
                setUnreadCount(data.unread_count)
            }
        } catch (err) {
            console.error('Failed to load unread count:', err)
        }
    }, [effectiveApiUrl])

    // Real-time alerts over WebSocket
    useEffect(() => {
        let closedByCleanup = false
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null

        const connectWebSocket = () => {
            try {
                const ws = new WebSocket(wsUrl)

                ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data)
                        if (message.type === 'alert') {
                            // Refetch instead of splicing the pushed payload in:
                            // the push has no database id, and the list needs real
                            // ids for mark-as-read to work.
                            setUnreadCount(prev => prev + 1)
                            loadAlerts()
                        }
                    } catch {
                        // Ignore parse errors for heartbeat messages
                    }
                }

                ws.onclose = () => {
                    if (!closedByCleanup) {
                        reconnectTimer = setTimeout(connectWebSocket, 5000)
                    }
                }

                wsRef.current = ws
            } catch (err) {
                console.error('Failed to connect to alert WebSocket:', err)
            }
        }

        connectWebSocket()

        return () => {
            closedByCleanup = true
            if (reconnectTimer) clearTimeout(reconnectTimer)
            wsRef.current?.close()
        }
    }, [wsUrl, loadAlerts])

    // Initial load + slow poll as backup
    useEffect(() => {
        loadUnreadCount()
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
            await fetchWithAuth(`${effectiveApiUrl}/api/alerts/${alertId}/read`, { method: 'POST' })
            setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (err) {
            console.error('Failed to mark alert as read:', err)
        }
    }

    const markAllAsRead = async () => {
        try {
            await fetchWithAuth(`${effectiveApiUrl}/api/alerts/read-all`, { method: 'POST' })
            setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
            setUnreadCount(0)
        } catch (err) {
            console.error('Failed to mark all alerts as read:', err)
        }
    }

    const formatTime = (dateString: string) => {
        const diff = Date.now() - new Date(dateString).getTime()
        if (diff < 60000) return 'just now'
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
        return new Date(dateString).toLocaleDateString()
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-ink-secondary hover:text-ink hover:bg-sunken rounded transition-colors"
                title="Notifications"
            >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                    <span className="num absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-signal text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    <div className="absolute right-0 top-full mt-2 w-80 bg-surface rounded border border-line shadow-[0_8px_24px_rgba(26,28,32,0.12)] z-50 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-line flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-ink-secondary hover:text-ink font-medium"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                            {alerts.length === 0 ? (
                                <div className="p-6 text-center text-ink-muted">
                                    <p className="text-sm">No notifications yet</p>
                                    <p className="text-xs mt-1">Geofence alerts will appear here</p>
                                </div>
                            ) : (
                                alerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className={`px-4 py-3 border-b border-line last:border-b-0 hover:bg-sunken cursor-pointer transition-colors ${!alert.is_read ? 'bg-paper' : ''}`}
                                        onClick={() => !alert.is_read && markAsRead(alert.id)}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${severityDot[alert.severity] || 'bg-line-strong'}`}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className={`text-sm truncate ${alert.is_read ? 'text-ink-secondary' : 'font-medium'}`}>
                                                        {alert.title}
                                                    </h4>
                                                    <span className="num text-[11px] text-ink-muted shrink-0">
                                                        {formatTime(alert.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-ink-secondary mt-0.5 line-clamp-2">
                                                    {alert.message}
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
