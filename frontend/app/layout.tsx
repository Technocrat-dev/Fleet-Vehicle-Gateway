import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Fleet Vehicle Data Gateway | Dashboard',
    description: 'Real-time fleet monitoring with edge-to-cloud data pipeline',
    keywords: ['fleet management', 'vehicle monitoring', 'real-time analytics', 'IoT'],
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="dark">
            <head>
                <link
                    rel="stylesheet"
                    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                    crossOrigin=""
                />
            </head>
            <body className="min-h-screen bg-surface-deep text-[var(--text-primary)] antialiased">
                {children}
            </body>
        </html>
    )
}
