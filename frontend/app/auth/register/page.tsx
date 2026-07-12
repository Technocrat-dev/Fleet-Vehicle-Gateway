'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const inputClass = 'w-full px-3 py-2 bg-surface border border-line-strong rounded text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-colors';

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    full_name: fullName || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Registration failed');
            }

            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = (provider: 'google' | 'github') => {
        window.location.href = `${API_URL}/auth/${provider}/login`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-paper px-4">
            <div className="w-full max-w-sm">
                <div className="mb-6">
                    <div className="text-sm font-semibold mb-6">Fleet Gateway</div>
                    <h1 className="text-xl font-semibold mb-1">Create an account</h1>
                    <p className="text-sm text-ink-secondary">Watch the fleet stream in real time</p>
                </div>

                <div className="bg-surface border border-line rounded p-6">
                    {error && (
                        <div className="bg-crit-bg text-crit px-3 py-2 rounded mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2 mb-5">
                        <button
                            onClick={() => handleOAuthLogin('google')}
                            className="w-full flex items-center justify-center gap-2.5 px-3 py-2 bg-surface border border-line-strong rounded text-sm font-medium hover:bg-sunken transition-colors"
                        >
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign up with Google
                        </button>

                        <button
                            onClick={() => handleOAuthLogin('github')}
                            className="w-full flex items-center justify-center gap-2.5 px-3 py-2 bg-surface border border-line-strong rounded text-sm font-medium hover:bg-sunken transition-colors"
                        >
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            Sign up with GitHub
                        </button>
                    </div>

                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex-1 border-t border-line" />
                        <span className="text-xs text-ink-muted">or</span>
                        <div className="flex-1 border-t border-line" />
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-xs font-medium text-ink-secondary mb-1.5">
                                Name <span className="text-ink-muted font-normal">(optional)</span>
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className={inputClass}
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-xs font-medium text-ink-secondary mb-1.5">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={inputClass}
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-medium text-ink-secondary mb-1.5">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={inputClass}
                                placeholder="Min 8 characters"
                                required
                                minLength={8}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand hover:bg-brand-hover text-white py-2 rounded font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating account…' : 'Create account'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-ink-secondary mt-4">
                    Already have an account?{' '}
                    <a href="/auth/login" className="text-ink font-medium underline underline-offset-2 hover:text-brand">
                        Sign in
                    </a>
                </p>
            </div>
        </div>
    );
}
