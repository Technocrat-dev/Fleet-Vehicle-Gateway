'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-paper px-4">
            <div className="bg-surface border border-line rounded p-8 text-center w-full max-w-sm">
                {children}
            </div>
        </div>
    );
}

function Spinner() {
    return (
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-line-strong border-t-brand mx-auto mb-4" />
    );
}

function OAuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState('');

    useEffect(() => {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const errorParam = searchParams.get('error');

        if (errorParam) {
            setError('Authentication failed. Please try again.');
            setTimeout(() => router.push('/auth/login'), 3000);
            return;
        }

        if (!accessToken || !refreshToken) {
            setError('Authentication completed but tokens not received.');
            setTimeout(() => router.push('/auth/login'), 3000);
            return;
        }

        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        router.push('/dashboard');
    }, [searchParams, router]);

    return (
        <CallbackShell>
            {error ? (
                <div>
                    <h2 className="text-base font-semibold text-crit mb-1">Authentication error</h2>
                    <p className="text-sm text-ink-secondary">{error}</p>
                    <p className="text-xs text-ink-muted mt-3">Redirecting to login…</p>
                </div>
            ) : (
                <div>
                    <Spinner />
                    <h2 className="text-base font-semibold mb-1">Completing authentication</h2>
                    <p className="text-sm text-ink-secondary">You&apos;ll be redirected in a moment…</p>
                </div>
            )}
        </CallbackShell>
    );
}

export default function OAuthCallbackPage() {
    return (
        <Suspense fallback={
            <CallbackShell>
                <Spinner />
                <h2 className="text-base font-semibold">Loading…</h2>
            </CallbackShell>
        }>
            <OAuthCallbackContent />
        </Suspense>
    );
}
