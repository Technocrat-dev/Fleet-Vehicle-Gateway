'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    ArrowLeft, Users, Shield, User as UserIcon,
    Check, X, AlertTriangle, MoreVertical
} from 'lucide-react'
import { fetchWithAuth, getCurrentUser, User } from '@/lib/auth'
import { useRouter } from 'next/navigation'

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
    }, [router])

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
                                <Users className="w-6 h-6 text-purple-500" />
                                <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                                    User Management
                                </h1>
                                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                                    Admin
                                </span>
                            </div>
                        </div>
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

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="font-semibold text-slate-800 dark:text-white">
                            All Users ({users.length})
                        </h2>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'admin'
                                            ? 'bg-purple-100 dark:bg-purple-900/30'
                                            : 'bg-slate-100 dark:bg-slate-700'
                                        }`}>
                                        {user.role === 'admin' ? (
                                            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        ) : (
                                            <UserIcon className="w-5 h-5 text-slate-500" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-800 dark:text-white">
                                                {user.full_name || user.email}
                                            </span>
                                            {user.id === currentUser?.id && (
                                                <span className="text-xs text-slate-500">(you)</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            {user.email}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-lg ${user.role === 'admin'
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                        }`}>
                                        {user.role}
                                    </span>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-lg ${user.is_active
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>

                                    {user.id !== currentUser?.id && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                            >
                                                <MoreVertical className="w-4 h-4 text-slate-500" />
                                            </button>

                                            {actionMenuOpen === user.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-40"
                                                        onClick={() => setActionMenuOpen(null)}
                                                    />
                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 py-1">
                                                        {user.role === 'user' ? (
                                                            <button
                                                                onClick={() => updateUserRole(user.id, 'admin')}
                                                                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                            >
                                                                Make Admin
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => updateUserRole(user.id, 'user')}
                                                                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                            >
                                                                Remove Admin
                                                            </button>
                                                        )}
                                                        <hr className="my-1 border-slate-200 dark:border-slate-700" />
                                                        {user.is_active ? (
                                                            <button
                                                                onClick={() => toggleUserActive(user.id, false)}
                                                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            >
                                                                Deactivate User
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => toggleUserActive(user.id, true)}
                                                                className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                            >
                                                                Activate User
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
