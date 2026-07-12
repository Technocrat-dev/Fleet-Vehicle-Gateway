'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, MoreVertical } from 'lucide-react'
import { fetchWithAuth, getCurrentUser, User } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'

interface UserListItem {
    id: number
    email: string
    full_name: string | null
    role: string
    is_active: boolean
    created_at: string
}

export default function AdminUsersPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [users, setUsers] = useState<UserListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null)

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    const loadUsers = useCallback(async () => {
        try {
            const response = await fetchWithAuth(`${apiUrl}/api/users`)
            if (response.ok) {
                const data = await response.json()
                setUsers(data)
            } else if (response.status === 403) {
                setError('You do not have permission to view this page')
            } else {
                setError('Failed to load users')
            }
        } catch (err) {
            setError('Error loading users')
        } finally {
            setLoading(false)
        }
    }, [apiUrl])

    // Check if current user is admin
    useEffect(() => {
        async function checkAdmin() {
            const user = await getCurrentUser()
            if (!user) {
                router.push('/auth/login')
                return
            }
            setCurrentUser(user)
            if (user.role !== 'admin') {
                router.push('/dashboard')
                return
            }
            loadUsers()
        }
        checkAdmin()
    }, [router, loadUsers])

    const updateUserRole = async (userId: number, newRole: string) => {
        try {
            const response = await fetchWithAuth(`${apiUrl}/api/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            })
            if (response.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
            } else {
                const data = await response.json()
                setError(data.detail || 'Failed to update role')
            }
        } catch (err) {
            setError('Error updating role')
        }
        setActionMenuOpen(null)
    }

    const toggleUserActive = async (userId: number, activate: boolean) => {
        try {
            const endpoint = activate ? 'activate' : 'deactivate'
            const response = await fetchWithAuth(`${apiUrl}/api/users/${userId}/${endpoint}`, {
                method: 'PUT',
            })
            if (response.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, is_active: activate } : u))
            } else {
                const data = await response.json()
                setError(data.detail || `Failed to ${endpoint} user`)
            }
        } catch (err) {
            setError(`Error ${activate ? 'activating' : 'deactivating'} user`)
        }
        setActionMenuOpen(null)
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
            <PageHeader title="User management" backHref="/dashboard" />

            <main className="container mx-auto px-6 py-6">
                {error && (
                    <div className="mb-6 px-4 py-3 bg-crit-bg text-crit rounded text-sm flex items-center gap-2">
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto" title="Dismiss">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="bg-surface border border-line rounded overflow-visible">
                    <div className="px-5 py-3 border-b border-line flex items-baseline justify-between">
                        <h2 className="text-sm font-semibold">All users</h2>
                        <span className="num text-xs text-ink-muted">{users.length}</span>
                    </div>

                    <div className="divide-y divide-line">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="px-5 py-3 flex items-center justify-between hover:bg-sunken transition-colors"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium truncate">
                                            {user.full_name || user.email}
                                        </span>
                                        {user.id === currentUser?.id && (
                                            <span className="text-xs text-ink-muted">(you)</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-ink-secondary truncate">
                                        {user.email}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-1.5 py-0.5 text-xs font-medium rounded-sm ${user.role === 'admin'
                                        ? 'bg-brand text-white'
                                        : 'bg-sunken text-ink-secondary'
                                        }`}>
                                        {user.role}
                                    </span>
                                    <span className={`px-1.5 py-0.5 text-xs font-medium rounded-sm ${user.is_active
                                        ? 'bg-ok-bg text-ok'
                                        : 'bg-crit-bg text-crit'
                                        }`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>

                                    {user.id !== currentUser?.id && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                                                className="p-1.5 text-ink-secondary hover:text-ink hover:bg-sunken rounded transition-colors"
                                                title="Actions"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            {actionMenuOpen === user.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-40"
                                                        onClick={() => setActionMenuOpen(null)}
                                                    />
                                                    <div className="absolute right-0 top-full mt-1 w-44 bg-surface rounded border border-line shadow-[0_8px_24px_rgba(26,28,32,0.12)] z-50 py-1 animate-pop">
                                                        {user.role === 'user' ? (
                                                            <button
                                                                onClick={() => updateUserRole(user.id, 'admin')}
                                                                className="w-full px-3 py-1.5 text-left text-sm text-ink-secondary hover:text-ink hover:bg-sunken transition-colors"
                                                            >
                                                                Make admin
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => updateUserRole(user.id, 'user')}
                                                                className="w-full px-3 py-1.5 text-left text-sm text-ink-secondary hover:text-ink hover:bg-sunken transition-colors"
                                                            >
                                                                Remove admin
                                                            </button>
                                                        )}
                                                        <hr className="my-1 border-line" />
                                                        {user.is_active ? (
                                                            <button
                                                                onClick={() => toggleUserActive(user.id, false)}
                                                                className="w-full px-3 py-1.5 text-left text-sm text-crit hover:bg-crit-bg transition-colors"
                                                            >
                                                                Deactivate user
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => toggleUserActive(user.id, true)}
                                                                className="w-full px-3 py-1.5 text-left text-sm text-ok hover:bg-ok-bg transition-colors"
                                                            >
                                                                Activate user
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}
