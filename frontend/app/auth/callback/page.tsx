'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OAuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            // Get tokens from URL parameters
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

            // Store tokens in localStorage
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('refresh_token', refreshToken);

            // Redirect to dashboard
            router.push('/dashboard');
        };

        handleCallback();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md">
                {error ? (
                    <div>
                        <div className="text-6xl mb-4">❌</div>
                        <h2 className="text-xl font-semibold text-red-600 mb-2">Authentication Error</h2>
                        <p className="text-gray-600">{error}</p>
                        <p className="text-sm text-gray-500 mt-4">Redirecting to login...</p>
                    </div>
                ) : (
                    <div>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Completing Authentication</h2>
                        <p className="text-gray-600">You'll be redirected to the dashboard in a moment...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
