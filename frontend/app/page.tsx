'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Car, MapPin, Zap, Shield, BarChart3, Bell,
    Users, Globe, ChevronRight, Wifi, ArrowRight, Menu, X,
    Activity, Eye, Radio, Lock
} from 'lucide-react'

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

export default function LandingPage() {
    const [isVisible, setIsVisible] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        const token = localStorage.getItem('access_token')
        if (token) {
            window.location.href = '/dashboard'
            return
        }
        setIsVisible(true)
    }, [])

    if (!isVisible) {
        return (
            <div className="min-h-screen bg-surface-deep flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent)] border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-surface-deep">
            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass">
                <div className="container mx-auto px-6 py-3.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                                <Car className="w-5 h-5 text-surface-deep" />
                            </div>
                            <span className="text-lg font-bold text-[var(--text-primary)]">FleetGateway</span>
                        </div>
                        <div className="hidden md:flex items-center gap-6">
                            <a href="#capabilities" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Capabilities</a>
                            <a href="#architecture" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Architecture</a>
                            <a href="https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Source</a>
                        </div>
                        <div className="hidden md:flex items-center gap-3">
                            <Link href="/auth/login" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium">
                                Log in
                            </Link>
                            <Link href="/auth/register" className="px-4 py-2 bg-[var(--accent)] text-surface-deep rounded-lg font-semibold text-sm hover:brightness-110 transition-all">
                                Try demo
                            </Link>
                        </div>
                        <button
                            className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {mobileMenuOpen && (
                    <div className="md:hidden glass border-t border-[rgba(255,255,255,0.06)]">
                        <div className="container mx-auto px-6 py-4 space-y-3">
                            <a href="#capabilities" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2">Capabilities</a>
                            <a href="#architecture" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2">Architecture</a>
                            <a href="https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway" target="_blank" rel="noopener noreferrer" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2">Source</a>
                            <hr className="border-[rgba(255,255,255,0.06)]" />
                            <Link href="/auth/login" className="block text-sm text-[var(--text-secondary)] py-2">Log in</Link>
                            <Link href="/auth/register" className="block w-full px-4 py-2.5 bg-[var(--accent)] text-surface-deep rounded-lg font-semibold text-sm text-center">Try demo</Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero */}
            <section className="relative pt-28 pb-20 px-6 overflow-hidden">
                <div className="absolute inset-0 bg-grid" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[var(--accent)] opacity-[0.04] blur-[120px] rounded-full" />

                <div className="container mx-auto relative">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 glass-light rounded-full text-xs font-medium text-[var(--accent)] mb-8">
                            <Radio className="w-3 h-3" />
                            <span>50 vehicles streaming live telemetry</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[var(--text-primary)] mb-5 leading-[1.1] tracking-tight">
                            Fleet monitoring
                            <br />
                            <span className="text-gradient">at the edge</span>
                        </h1>

                        <p className="text-base md:text-lg text-[var(--text-secondary)] mb-10 max-w-xl mx-auto leading-relaxed">
                            Real-time vehicle tracking with on-device AI inference.
                            From edge sensors to cloud dashboards in under 10ms.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
                            <Link
                                href="/auth/register"
                                className="group px-6 py-3 bg-[var(--accent)] text-surface-deep rounded-xl font-semibold text-sm hover:brightness-110 transition-all flex items-center gap-2"
                            >
                                Open dashboard
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <a
                                href="https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group px-6 py-3 glass-light rounded-xl font-semibold text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2"
                            >
                                <Globe className="w-4 h-4" />
                                View source
                            </a>
                        </div>

                        {/* Dashboard preview */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-t from-surface-deep via-transparent to-transparent z-10 pointer-events-none" />
                            <div className="glass rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                                        <span className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide">LIVE</span>
                                    </div>
                                    <span className="text-xs text-[var(--text-muted)]">fleet-gateway/dashboard</span>
                                    <span className="text-[10px] text-[var(--text-muted)]">50 vehicles</span>
                                </div>
                                <div className="p-5 bg-surface">
                                    <div className="grid grid-cols-4 gap-3 mb-4">
                                        {[
                                            { label: 'Vehicles', value: '50', color: 'var(--accent)' },
                                            { label: 'Passengers', value: '247', color: 'var(--accent-warm)' },
                                            { label: 'Latency', value: '9.6ms', color: 'var(--accent)' },
                                            { label: 'Uptime', value: '99.9%', color: 'var(--success)' }
                                        ].map((stat) => (
                                            <div key={stat.label} className="glass-light rounded-lg p-3 text-center">
                                                <div className="text-xl font-bold stat-number" style={{ color: stat.color }}>{stat.value}</div>
                                                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="h-36 glass-light rounded-lg flex items-center justify-center relative overflow-hidden">
                                        <div className="relative flex items-center gap-2 text-[var(--text-muted)]">
                                            <Globe className="w-6 h-6" />
                                            <span className="text-sm">Live Fleet Map</span>
                                        </div>
                                        <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
                                        <div className="absolute top-1/2 left-2/3 w-2 h-2 bg-[var(--accent-warm)] rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                                        <div className="absolute top-2/3 left-1/4 w-2 h-2 bg-[var(--success)] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats strip */}
            <section className="py-8 border-y border-[rgba(255,255,255,0.04)]">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        {[
                            { icon: <Car className="w-4 h-4 text-[var(--accent)]" />, value: <AnimatedCounter end={50} suffix="+" />, label: 'Vehicles tracked' },
                            { icon: <Activity className="w-4 h-4 text-[var(--accent-warm)]" />, value: <AnimatedCounter end={1000} suffix="+" />, label: 'Events per second' },
                            { icon: <Zap className="w-4 h-4 text-[var(--accent)]" />, value: '9.6ms', label: 'Inference latency' },
                            { icon: <Lock className="w-4 h-4 text-[var(--success)]" />, value: 'GDPR', label: 'Privacy compliant' },
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                {stat.icon}
                                <div className="text-2xl font-bold text-[var(--text-primary)] stat-number">{stat.value}</div>
                                <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Capabilities */}
            <section id="capabilities" className="py-20 px-6">
                <div className="container mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-3">
                            What it does
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto">
                            A real-time data pipeline from vehicle sensors to your browser,
                            with geofencing, analytics, and privacy controls built in.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                        {[
                            { icon: <MapPin className="w-5 h-5" />, title: 'Live GPS tracking', desc: 'Sub-second position updates rendered on an interactive Leaflet map with route traces.' },
                            { icon: <Zap className="w-5 h-5" />, title: 'Edge AI inference', desc: 'YOLOv11 object detection running through OpenVINO at 9.6ms average inference time.' },
                            { icon: <Bell className="w-5 h-5" />, title: 'Geofence alerts', desc: 'Draw polygon zones on the map. Get notified when vehicles cross boundaries.' },
                            { icon: <Shield className="w-5 h-5" />, title: 'Privacy engine', desc: 'GDPR-compliant data handling with per-user consent tracking and anonymization.' },
                            { icon: <BarChart3 className="w-5 h-5" />, title: 'Telemetry analytics', desc: 'Occupancy trends, latency distributions, and route density visualizations.' },
                            { icon: <Eye className="w-5 h-5" />, title: 'Role-based access', desc: 'OAuth via Google and GitHub. Admin and user roles with scoped permissions.' },
                        ].map((feature) => (
                            <div key={feature.title} className="glass-light rounded-xl p-5 card-hover group">
                                <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] mb-3 group-hover:bg-[var(--accent)]/20 transition-colors">
                                    {feature.icon}
                                </div>
                                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">{feature.title}</h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Architecture */}
            <section id="architecture" className="py-20 px-6 border-t border-[rgba(255,255,255,0.04)]">
                <div className="container mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-4">
                                How it works
                            </h2>
                            <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
                                A three-stage pipeline: edge devices capture and run inference,
                                the backend processes and stores telemetry, and the dashboard
                                renders it in real time over WebSocket.
                            </p>

                            <div className="space-y-4">
                                {[
                                    { step: '01', title: 'Edge capture', desc: 'Simulator generates GPS, speed, occupancy data for 50 vehicles. AI inference runs on each frame.' },
                                    { step: '02', title: 'Backend ingest', desc: 'FastAPI receives telemetry via HTTP or Kafka. Geofence Service checks positions. Privacy Engine applies redaction.' },
                                    { step: '03', title: 'Live delivery', desc: 'TelemetryHub broadcasts to connected WebSocket clients. Next.js dashboard renders updates on the map.' },
                                ].map((item) => (
                                    <div key={item.step} className="flex gap-4 group">
                                        <div className="text-[var(--accent)] font-bold text-sm tabular-nums pt-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                                            {item.step}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{item.title}</h3>
                                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-light rounded-xl p-6">
                            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Stack</h3>
                            <div className="space-y-3">
                                {[
                                    { category: 'Backend', items: 'FastAPI, Python 3.11, SQLAlchemy 2.0, PostgreSQL' },
                                    { category: 'Frontend', items: 'Next.js 14, TypeScript, Tailwind, Leaflet, Recharts' },
                                    { category: 'Auth', items: 'Google OAuth, GitHub OAuth, JWT + bcrypt' },
                                    { category: 'Streaming', items: 'WebSocket, Redpanda (Kafka-compatible)' },
                                    { category: 'Infra', items: 'Docker, Cloud Run, GitHub Actions CI/CD' },
                                    { category: 'AI', items: 'YOLOv11, OpenVINO runtime' },
                                ].map((row) => (
                                    <div key={row.category} className="flex gap-3 text-xs">
                                        <span className="text-[var(--accent)] font-semibold w-20 shrink-0">{row.category}</span>
                                        <span className="text-[var(--text-secondary)]">{row.items}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 px-6">
                <div className="container mx-auto max-w-2xl text-center">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                        See it running
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-8">
                        Create an account and watch 50 vehicles stream telemetry in real time.
                        The first user gets admin access.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/auth/register"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-surface-deep rounded-xl font-semibold text-sm hover:brightness-110 transition-all"
                        >
                            Open dashboard
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                        <a
                            href="https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 glass-light rounded-xl font-semibold text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                        >
                            <Globe className="w-4 h-4" />
                            Source code
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-[rgba(255,255,255,0.04)]">
                <div className="container mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center">
                                <Car className="w-3.5 h-3.5 text-surface-deep" />
                            </div>
                            <span className="text-sm font-semibold text-[var(--text-primary)]">FleetGateway</span>
                        </div>
                        <div className="flex items-center gap-6 text-xs text-[var(--text-muted)]">
                            <a href="https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)] transition-colors">GitHub</a>
                            <a href="https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway#readme" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)] transition-colors">Docs</a>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                            Built by Manas Sharma
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
