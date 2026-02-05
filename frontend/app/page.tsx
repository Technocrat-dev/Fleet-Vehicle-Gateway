'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Car, BarChart3, Shield, Zap, ArrowRight, Activity } from 'lucide-react'

export default function HomePage() {
    const [stats, setStats] = useState({
        vehicles: 0,
        passengers: 0,
        latency: 0,
    })

    useEffect(() => {
        // Animate stats on load
        const interval = setInterval(() => {
            setStats(prev => ({
                vehicles: Math.min(prev.vehicles + 2, 50),
                passengers: Math.min(prev.passengers + 8, 187),
                latency: prev.latency < 9.6 ? prev.latency + 0.4 : 9.6,
            }))
        }, 50)

        return () => clearInterval(interval)
    }, [])

    return (
        <main className="min-h-screen">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/10 to-transparent" />

                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Car className="w-8 h-8 text-blue-400" />
                        <span className="text-xl font-bold text-white">Fleet Gateway</span>
                    </div>
                    <Link
                        href="/dashboard"
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        Open Dashboard
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </nav>

                <div className="container mx-auto px-6 py-24 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full text-blue-300 mb-8">
                        <Activity className="w-4 h-4" />
                        <span className="text-sm font-medium">Live Demo Running</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                        Fleet Vehicle
                        <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> Data Gateway</span>
                    </h1>

                    <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-12">
                        Real-time edge-to-cloud data pipeline for fleet monitoring.
                        Powered by YOLOv11 AI, Kafka streaming, and BigQuery analytics.
                    </p>

                    {/* Live Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                            <div className="text-4xl font-bold text-white stat-number">{stats.vehicles}</div>
                            <div className="text-slate-400 mt-1">Vehicles Tracked</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                            <div className="text-4xl font-bold text-white stat-number">{stats.passengers}</div>
                            <div className="text-slate-400 mt-1">Total Passengers</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                            <div className="text-4xl font-bold text-white stat-number">{stats.latency.toFixed(1)}ms</div>
                            <div className="text-slate-400 mt-1">Avg Latency</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="container mx-auto px-6 py-24">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white text-center mb-16">
                    Production-Ready Architecture
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <FeatureCard
                        icon={<Zap className="w-8 h-8 text-yellow-500" />}
                        title="Edge AI Processing"
                        description="YOLOv11 with OpenVINO optimization achieving 9.6ms inference latency"
                    />
                    <FeatureCard
                        icon={<Activity className="w-8 h-8 text-green-500" />}
                        title="Real-time Streaming"
                        description="Kafka-based event streaming with sub-second delivery"
                    />
                    <FeatureCard
                        icon={<BarChart3 className="w-8 h-8 text-blue-500" />}
                        title="Cloud Analytics"
                        description="GCP BigQuery integration for SQL analytics and ML datasets"
                    />
                    <FeatureCard
                        icon={<Shield className="w-8 h-8 text-purple-500" />}
                        title="Privacy-First"
                        description="GDPR-compliant data anonymization and consent management"
                    />
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-slate-100 dark:bg-slate-800/50 py-16">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">
                        Ready to explore the dashboard?
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-8">
                        View 50 simulated vehicles with real-time updates
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white text-lg rounded-xl transition-all hover:scale-105"
                    >
                        <Car className="w-5 h-5" />
                        Open Fleet Dashboard
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <footer className="container mx-auto px-6 py-8 text-center text-slate-500 text-sm">
                <p>Fleet Vehicle Data Gateway • Demo for Woven by Toyota / Arene Platform</p>
                <div className="mt-2 flex justify-center gap-4">
                    <a href="/docs" className="hover:text-blue-500">API Docs</a>
                    <span>•</span>
                    <a href="https://github.com" className="hover:text-blue-500">GitHub</a>
                </div>
            </footer>
        </main>
    )
}

function FeatureCard({
    icon,
    title,
    description
}: {
    icon: React.ReactNode
    title: string
    description: string
}) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm card-hover">
            <div className="mb-4">{icon}</div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{title}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{description}</p>
        </div>
    )
}
