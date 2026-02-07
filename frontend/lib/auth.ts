const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface User {
    id: number;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    is_active: boolean;
}

export async function getAccessToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
}

export async function getRefreshToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
}

export async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) throw new Error('Refresh failed');

        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        return data.access_token;
    } catch {
        // Refresh failed, logout
        logout();
        return null;
    }
}

export async function getCurrentUser(): Promise<User | null> {
    let token = await getAccessToken();

    if (!token) return null;

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
            // Try to refresh
            token = await refreshAccessToken();
            if (!token) return null;

            // Retry with new token
            const retryResponse = await fetch(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!retryResponse.ok) return null;
            return retryResponse.json();
        }

        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

export function logout() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/auth/login';
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    let token = await getAccessToken();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
    };

    let response = await fetch(url, { ...options, headers });

    // If unauthorized, try to refresh
    if (response.status === 401) {
        token = await refreshAccessToken();
        if (!token) {
            logout();
            throw new Error('Session expired');
        }

        // Retry with new token
        headers.Authorization = `Bearer ${token}`;
        response = await fetch(url, { ...options, headers });
    }

    return response;
}
