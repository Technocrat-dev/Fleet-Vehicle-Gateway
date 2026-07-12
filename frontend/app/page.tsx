'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'

const GITHUB_URL = 'https://github.com/Technocrat-dev/Fleet-Vehicle-Gateway'

const CAPABILITIES = [
    { title: 'Live GPS tracking', desc: 'Sub-second position updates rendered on an interactive map with route traces.' },
    { title: 'Edge AI inference', desc: 'YOLOv11 object detection through OpenVINO at 9.6 ms average inference time.' },
    { title: 'Geofence alerts', desc: 'Draw polygon zones on the map and get notified when vehicles cross boundaries.' },
    { title: 'Privacy engine', desc: 'GDPR-compliant data handling with per-user consent tracking and anonymization.' },
    { title: 'Telemetry analytics', desc: 'Occupancy trends, latency distributions, and route density visualizations.' },
    { title: 'Role-based access', desc: 'OAuth via Google and GitHub. Admin and user roles with scoped permissions.' },
]

const PIPELINE = [
    { step: '1', title: 'Edge capture', desc: 'A simulator generates GPS, speed, and occupancy data for 50 vehicles. AI inference runs on each frame.' },
    { step: '2', title: 'Backend ingest', desc: 'FastAPI receives telemetry via HTTP or Kafka. Geofences are checked and privacy rules applied.' },
    { step: '3', title: 'Live delivery', desc: 'The telemetry hub broadcasts to connected WebSocket clients; the dashboard renders updates on the map.' },
]

const STACK = [
    { category: 'Backend', items: 'FastAPI, Python 3.11, SQLAlchemy 2.0, PostgreSQL' },
    { category: 'Frontend', items: 'Next.js 14, TypeScript, Tailwind, Leaflet, Recharts' },
    { category: 'Auth', items: 'Google OAuth, GitHub OAuth, JWT + bcrypt' },
    { category: 'Streaming', items: 'WebSocket, Redpanda (Kafka-compatible)' },
    { category: 'Infra', items: 'Docker, Cloud Run, GitHub Actions CI/CD' },
    { category: 'AI', items: 'YOLOv11, OpenVINO runtime' },
]

// Sample telemetry feed for the hero — generated client-side so the
// landing page feels alive without pretending to be real fleet data.
function makeFeedLine(): string {
    const id = String(Math.floor(Math.random() * 50) + 1).padStart(3, '0')
    const occupancy = Math.floor(Math.random() * 9)
    const lat = (35.62 + Math.random() * 0.09).toFixed(4)
    const lng = (139.68 + Math.random() * 0.1).toFixed(4)
    const latency = (8 + Math.random() * 2.5).toFixed(1)
    return `{"vehicle_id":"vehicle-${id}","occupancy":${occupancy},"lat":${lat},"lng":${lng},"latency_ms":${latency}}`
}

const FEED_LENGTH = 6

function LiveFeed() {
    const [lines, setLines] = useState<string[]>(() =>
        Array.from({ length: FEED_LENGTH }, makeFeedLine)
    )

    useEffect(() => {
        const id = setInterval(() => {
            setLines(prev => [...prev.slice(1), makeFeedLine()])
        }, 1400)
        return () => clearInterval(id)
    }, [])

    return (
        <div className="border border-line rounded overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-sunken border-b border-line">
                <span className="num text-xs text-ink-secondary">ws://gateway/ws/telemetry</span>
                <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
                    <span className="live-dot" />
                    live sample
                </span>
            </div>
            <div className="p-4 bg-surface overflow-x-auto">
                <div className="num text-xs leading-relaxed text-ink-secondary whitespace-pre">
                    {lines.map((line, i) => (
                        <div
                            key={line + i}
                            className={i === lines.length - 1 ? 'feed-line-new' : undefined}
                        >
                            {line}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
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
            <div className="min-h-screen bg-paper flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-line-strong border-t-brand" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-paper">
            {/* Nav */}
            <nav className="bg-surface border-b border-line sticky top-0 z-50">
                <div className="container mx-auto px-6 h-14 flex items-center justify-between">
                    <span className="text-sm font-semibold">Fleet Gateway</span>
                    <div className="hidden md:flex items-center gap-6">
                        <a href="#capabilities" className="text-sm text-ink-secondary hover:text-ink transition-colors">Capabilities</a>
                        <a href="#architecture" className="text-sm text-ink-secondary hover:text-ink transition-colors">Architecture</a>
                        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-ink-secondary hover:text-ink transition-colors">Source</a>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                        <Link href="/auth/login" className="text-sm text-ink-secondary hover:text-ink transition-colors font-medium">
                            Log in
                        </Link>
                        <Link href="/auth/register" className="px-3.5 py-1.5 bg-brand hover:bg-brand-hover text-white rounded font-medium text-sm transition-colors">
                            Try the demo
                        </Link>
                    </div>
                    <button
                        className="md:hidden p-2 text-ink-secondary hover:text-ink"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        title="Menu"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {mobileMenuOpen && (
                    <div className="md:hidden bg-surface border-t border-line">
                        <div className="container mx-auto px-6 py-4 space-y-1">
                            <a href="#capabilities" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-ink-secondary hover:text-ink py-2">Capabilities</a>
                            <a href="#architecture" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-ink-secondary hover:text-ink py-2">Architecture</a>
                            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="block text-sm text-ink-secondary hover:text-ink py-2">Source</a>
                            <hr className="border-line my-2" />
                            <Link href="/auth/login" className="block text-sm text-ink-secondary py-2">Log in</Link>
                            <Link href="/auth/register" className="block w-full px-4 py-2 bg-brand text-white rounded font-medium text-sm text-center">Try the demo</Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero */}
            <section className="border-b border-line bg-surface">
                <div className="container mx-auto px-6 py-16 md:py-20">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="max-w-lg">
                            <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight mb-4">
                                Fleet telemetry, from edge to operator.
                            </h1>
                            <p className="text-base text-ink-secondary leading-relaxed mb-8">
                                50 vehicles stream GPS, occupancy, and on-device AI inference
                                results into a live dashboard — under 10&nbsp;ms from sensor to screen.
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                                <Link
                                    href="/auth/register"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded font-medium text-sm transition-colors"
                                >
                                    Open the dashboard
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <a
                                    href={GITHUB_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-4 py-2 border border-line-strong hover:bg-sunken rounded font-medium text-sm text-ink-secondary hover:text-ink transition-colors"
                                >
                                    View source
                                </a>
                            </div>

                            <dl className="flex gap-8 mt-10 pt-6 border-t border-line">
                                <div>
                                    <dt className="text-xs text-ink-muted">Vehicles</dt>
                                    <dd className="num text-lg font-semibold">50</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-ink-muted">Events / sec</dt>
                                    <dd className="num text-lg font-semibold">1,000+</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-ink-muted">Inference</dt>
                                    <dd className="num text-lg font-semibold">9.6 ms</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-ink-muted">Privacy</dt>
                                    <dd className="num text-lg font-semibold">GDPR</dd>
                                </div>
                            </dl>
                        </div>

                        {/* Telemetry feed sample */}
                        <LiveFeed />
                    </div>
                </div>
            </section>

            {/* Capabilities */}
            <section id="capabilities" className="container mx-auto px-6 py-16">
                <h2 className="text-xl font-semibold mb-2">What it does</h2>
                <p className="text-sm text-ink-secondary mb-8 max-w-md">
                    A real-time pipeline from vehicle sensors to your browser, with
                    geofencing, analytics, and privacy controls built in.
                </p>

                <div className="border-t border-line">
                    {CAPABILITIES.map((feature) => (
                        <div
                            key={feature.title}
                            className="group grid md:grid-cols-[220px_1fr] gap-1 md:gap-8 py-4 px-2 -mx-2 border-b border-line hover:bg-surface transition-colors"
                        >
                            <h3 className="text-sm font-semibold group-hover:text-signal transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-ink-secondary leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Architecture */}
            <section id="architecture" className="bg-surface border-y border-line">
                <div className="container mx-auto px-6 py-16">
                    <div className="grid lg:grid-cols-2 gap-12 items-start">
                        <div>
                            <h2 className="text-xl font-semibold mb-2">How it works</h2>
                            <p className="text-sm text-ink-secondary mb-8 leading-relaxed max-w-md">
                                Three stages: edge devices capture and run inference, the backend
                                processes and stores telemetry, and the dashboard renders it in
                                real time over WebSocket.
                            </p>

                            <ol className="space-y-5">
                                {PIPELINE.map((item) => (
                                    <li key={item.step} className="flex gap-4">
                                        <span className="num text-sm text-ink-muted pt-0.5">{item.step}</span>
                                        <div>
                                            <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                                            <p className="text-sm text-ink-secondary leading-relaxed">{item.desc}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <div className="border border-line rounded">
                            <div className="px-4 py-2.5 border-b border-line">
                                <h3 className="text-sm font-semibold">Stack</h3>
                            </div>
                            <dl>
                                {STACK.map((row) => (
                                    <div key={row.category} className="grid grid-cols-[90px_1fr] gap-4 px-4 py-2.5 border-b border-line last:border-b-0 text-sm">
                                        <dt className="text-ink-muted">{row.category}</dt>
                                        <dd className="text-ink-secondary">{row.items}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="container mx-auto px-6 py-16">
                <div className="max-w-md">
                    <h2 className="text-xl font-semibold mb-2">See it running</h2>
                    <p className="text-sm text-ink-secondary mb-6">
                        Create an account and watch 50 vehicles stream telemetry in real time.
                        The first user gets admin access.
                    </p>
                    <Link
                        href="/auth/register"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded font-medium text-sm transition-colors"
                    >
                        Open the dashboard
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-line">
                <div className="container mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
                    <span className="text-sm font-semibold">Fleet Gateway</span>
                    <div className="flex items-center gap-6 text-sm text-ink-secondary">
                        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">GitHub</a>
                        <a href={`${GITHUB_URL}#readme`} target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">Docs</a>
                    </div>
                    <span className="text-sm text-ink-muted">Built by Manas Sharma</span>
                </div>
            </footer>
        </div>
    )
}
