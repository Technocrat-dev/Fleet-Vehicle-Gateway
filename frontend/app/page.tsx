'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
    const router = useRouter()

    useEffect(() => {
        // Check if user is authenticated
        const token = localStorage.getItem('access_token')

        if (token) {
            // User is authenticated, go to dashboard
            router.replace('/dashboard')
        } else {
            // User not authenticated, go to login
            router.replace('/auth/login')
        }
    }, [router])

    // Show loading while redirecting
    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-400">Loading...</p>
            </div>
        </main>
    )
}
