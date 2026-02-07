'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Car, MapPin, Zap, Shield, BarChart3, Bell,
    Users, Globe, ChevronRight, Check,
    Wifi, Clock, TrendingUp, ArrowRight, Menu, X
} from 'lucide-react'

// Animated counter component
function AnimatedCounter({ end, duration = 2000, suffix = '' }: {
    end: number, duration?: number, suffix?: string
}) {
    const [count, setCount] = useState(0)

    useEffect(() => {
        let startTime: number
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / duration, 1)
            setCount(Math.floor(progress * end))
            if (progress < 1) requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)
    }, [end, duration])

    return <span>{count.toLocaleString()}{suffix}</span>
}

// Feature card component
function FeatureCard({ icon, title, description }: {
    icon: React.ReactNode, title: string, description: string
}) {
    return (
        <div className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-200 dark:border-slate-700">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{description}</p>
            </div>
        </div>
    )
}

// Stats card
function StatCard({ value, label, icon }: { value: React.ReactNode, label: string, icon: React.ReactNode }) {
    return (
        <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-3xl md:text-4xl font-bold text-white mb-1">
                {icon}
                {value}
            </div>
            <div className="text-blue-200 text-sm">{label}</div>
        </div>
    )
}

export default function LandingPage() {
    const [isVisible, setIsVisible] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        // Check if user is already authenticated
        const token = localStorage.getItem('access_token')
        if (token) {
            window.location.href = '/dashboard'
            return
        }
        setIsVisible(true)
    }, [])

    if (!isVisible) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
        )
    }

    const features = [
        {
            icon: <MapPin className="w-6 h-6" />,
            title: "Real-Time GPS Tracking",
            description: "Track every vehicle in your fleet with sub-second updates. View live locations on an interactive map."
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: "AI-Powered Analytics",
            description: "OpenVINO-optimized inference at 9.6ms. Get instant insights on occupancy and passenger flow."
        },
        {
            icon: <Bell className="w-6 h-6" />,
            title: "Geofencing & Alerts",
            description: "Create virtual boundaries and receive instant notifications when vehicles enter or exit zones."
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: "Privacy-First Design",
            description: "GDPR-compliant data handling with consent management. Your data stays secure and private."
        },
        {
            icon: <BarChart3 className="w-6 h-6" />,
            title: "Live Analytics",
            description: "Real-time occupancy charts, latency metrics, and route distribution visualizations."
        },
        {
            icon: <Users className="w-6 h-6" />,
            title: "Role-Based Access",
            description: "Admin and User roles with secure OAuth authentication via Google and GitHub."
        }
    ]

    const benefits = [
        "Real-time vehicle tracking",
        "AI-powered occupancy detection",
        "Real-time telemetry streaming",
        "GDPR-compliant data handling",
        "Geofencing with alerts",
        "24/7 fleet visibility"
    ]

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Car className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">FleetGateway</span>
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-slate-400 hover:text-white transition-colors">Features</a>
                            <a href="#how-it-works" className="text-slate-400 hover:text-white transition-colors">How It Works</a>
                            <a href="https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">GitHub</a>
                        </div>
                        <div className="hidden md:flex items-center gap-4">
                            <Link
                                href="/auth/login"
                                className="text-slate-300 hover:text-white transition-colors"
                            >
                                Log In
                            </Link>
                            <Link
                                href="/auth/register"
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                            >
                                Get Started
                            </Link>
                        </div>
                        {/* Mobile menu button */}
                        <button
                            className="md:hidden p-2 text-slate-400 hover:text-white"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu panel */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-slate-900/95 backdrop-blur-lg border-t border-slate-800">
                        <div className="container mx-auto px-6 py-4 space-y-4">
                            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-slate-400 hover:text-white transition-colors py-2">Features</a>
                            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-slate-400 hover:text-white transition-colors py-2">How It Works</a>
                            <a href="https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway" target="_blank" rel="noopener noreferrer" className="block text-slate-400 hover:text-white transition-colors py-2">GitHub</a>
                            <hr className="border-slate-700" />
                            <Link
                                href="/auth/login"
                                className="block text-slate-300 hover:text-white transition-colors py-2"
                            >
                                Log In
                            </Link>
                            <Link
                                href="/auth/register"
                                className="block w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium text-center hover:opacity-90 transition-opacity"
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="container mx-auto">
                    <div className="max-w-4xl mx-auto text-center">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm mb-8">
                            <Wifi className="w-4 h-4" />
                            <span>Real-time fleet monitoring powered by AI</span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                            Smart Fleet Management{' '}
                            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                Made Simple
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Track, analyze, and optimize your entire fleet in real-time.
                            From edge AI to cloud analytics, get complete visibility into every vehicle.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                            <Link
                                href="/auth/register"
                                className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold text-lg hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25"
                            >
                                Get Started
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <a
                                href="https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group px-8 py-4 bg-slate-800 text-white rounded-xl font-semibold text-lg hover:bg-slate-700 transition-colors flex items-center gap-2 border border-slate-700"
                            >
                                <Globe className="w-5 h-5" />
                                View on GitHub
                            </a>
                        </div>

                        {/* Hero Image / Dashboard Preview */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10 pointer-events-none" />
                            <div className="relative bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="ml-4 text-sm text-slate-500">fleet-gateway.app/dashboard</span>
                                </div>
                                <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900">
                                    {/* Mini dashboard preview */}
                                    <div className="grid grid-cols-4 gap-4 mb-6">
                                        {[
                                            { label: 'Vehicles', value: '50', color: 'blue' },
                                            { label: 'Passengers', value: '247', color: 'green' },
                                            { label: 'Latency', value: '9.6ms', color: 'yellow' },
                                            { label: 'Uptime', value: '99.9%', color: 'purple' }
                                        ].map((stat) => (
                                            <div key={stat.label} className="bg-slate-700/50 rounded-xl p-4 text-center">
                                                <div className={`text-2xl font-bold text-${stat.color}-400`}>{stat.value}</div>
                                                <div className="text-xs text-slate-500">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Map placeholder */}
                                    <div className="h-48 bg-slate-700/50 rounded-xl flex items-center justify-center relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[url('/map-placeholder.png')] bg-cover bg-center opacity-30" />
                                        <div className="relative flex items-center gap-2 text-slate-400">
                                            <Globe className="w-8 h-8" />
                                            <span className="text-lg">Live Fleet Map</span>
                                        </div>
                                        {/* Animated dots for vehicles */}
                                        <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                                        <div className="absolute top-1/2 left-2/3 w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                                        <div className="absolute top-2/3 left-1/4 w-3 h-3 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="py-12 bg-gradient-to-r from-blue-600 to-purple-600">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <StatCard
                            icon={<Car className="w-6 h-6" />}
                            value={<AnimatedCounter end={50} suffix="+" />}
                            label="Vehicles Tracked"
                        />
                        <StatCard
                            icon={<TrendingUp className="w-6 h-6" />}
                            value={<AnimatedCounter end={1000} suffix="+" />}
                            label="Data Points/Sec"
                        />
                        <StatCard
                            icon={<Clock className="w-6 h-6" />}
                            value="9.6ms"
                            label="Avg Inference"
                        />
                        <StatCard
                            icon={<Shield className="w-6 h-6" />}
                            value="99.9%"
                            label="Uptime SLA"
                        />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-6">
                <div className="container mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Everything You Need to{' '}
                            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                Manage Your Fleet
                            </span>
                        </h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            From real-time tracking to predictive maintenance, our platform provides
                            comprehensive tools for modern fleet management.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature) => (
                            <FeatureCard key={feature.title} {...feature} />
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-24 px-6 bg-slate-800/50">
                <div className="container mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            How It Works
                        </h2>
                        <p className="text-slate-400">
                            Get started in minutes with our simple setup process
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                        {[
                            { step: '1', title: 'Connect Your Fleet', desc: 'Install our edge gateway on vehicles or use our simulator for testing.' },
                            { step: '2', title: 'Stream Data', desc: 'Real-time telemetry flows through Kafka to our cloud platform.' },
                            { step: '3', title: 'Monitor & Optimize', desc: 'Use our dashboard to track, analyze, and improve fleet operations.' }
                        ].map((item, i) => (
                            <div key={item.step} className="relative text-center">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                                    {item.step}
                                </div>
                                {i < 2 && (
                                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-purple-500 to-blue-500" />
                                )}
                                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                                <p className="text-slate-400">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="py-24 px-6">
                <div className="container mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                                Why Choose{' '}
                                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                    FleetGateway?
                                </span>
                            </h2>
                            <p className="text-slate-400 mb-8">
                                Our platform is built for modern fleet operations, combining edge AI with
                                cloud-scale analytics for unparalleled visibility and control.
                            </p>
                            <ul className="space-y-4">
                                {benefits.map((benefit) => (
                                    <li key={benefit} className="flex items-center gap-3 text-slate-300">
                                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-green-400" />
                                        </div>
                                        {benefit}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-3xl" />
                            <div className="relative bg-slate-800 rounded-2xl p-8 border border-slate-700">
                                <div className="aspect-video bg-slate-700/50 rounded-xl flex items-center justify-center">
                                    <div className="text-center">
                                        <Zap className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                                        <p className="text-slate-400 text-sm">Edge AI + Cloud Analytics</p>
                                        <p className="text-slate-500 text-xs mt-1">YOLOv11 + OpenVINO</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-6 bg-slate-800/50">
                <div className="container mx-auto">
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 p-12 text-center">
                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                        <div className="relative">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                Ready to Explore the Platform?
                            </h2>
                            <p className="text-blue-100 mb-8 max-w-xl mx-auto">
                                A production-ready fleet management system showcasing edge-to-cloud data pipelines,
                                real-time WebSocket streaming, and AI-powered analytics.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    href="/auth/register"
                                    className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-colors"
                                >
                                    Try the Demo
                                    <ChevronRight className="w-5 h-5" />
                                </Link>
                                <a
                                    href="https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-8 py-4 bg-slate-800/80 text-white rounded-xl font-semibold text-lg hover:bg-slate-700 transition-colors border border-white/20"
                                >
                                    <Globe className="w-5 h-5" />
                                    Source Code
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-slate-800">
                <div className="container mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Car className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-bold text-white">FleetGateway</span>
                        </div>
                        <div className="flex items-center gap-8 text-sm text-slate-400">
                            <a href="https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
                            <a href="https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway#readme" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Documentation</a>
                        </div>
                        <div className="text-sm text-slate-500">
                            © 2026 FleetGateway. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
