import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import 'leaflet/dist/leaflet.css'
import './globals.css'

const plexSans = IBM_Plex_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-sans',
    display: 'swap',
})

const plexMono = IBM_Plex_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-mono',
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'Fleet Vehicle Data Gateway',
    description: 'Real-time fleet monitoring with edge-to-cloud data pipeline',
    keywords: ['fleet management', 'vehicle monitoring', 'real-time analytics', 'IoT'],
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
            <body className="min-h-screen bg-paper text-ink antialiased">
                {children}
            </body>
        </html>
    )
}
