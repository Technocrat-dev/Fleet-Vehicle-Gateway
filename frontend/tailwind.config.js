/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-sans)', '-apple-system', 'sans-serif'],
                mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
            },
            colors: {
                paper: 'var(--paper)',
                surface: 'var(--surface)',
                sunken: 'var(--sunken)',
                ink: {
                    DEFAULT: 'var(--ink)',
                    secondary: 'var(--ink-secondary)',
                    muted: 'var(--ink-muted)',
                },
                line: {
                    DEFAULT: 'var(--line)',
                    strong: 'var(--line-strong)',
                },
                brand: {
                    DEFAULT: 'var(--brand)',
                    hover: 'var(--brand-hover)',
                },
                signal: 'var(--signal)',
                ok: {
                    DEFAULT: 'var(--ok)',
                    bg: 'var(--ok-bg)',
                },
                warn: {
                    DEFAULT: 'var(--warn)',
                    bg: 'var(--warn-bg)',
                },
                crit: {
                    DEFAULT: 'var(--crit)',
                    bg: 'var(--crit-bg)',
                },
            },
            borderRadius: {
                DEFAULT: '5px',
            },
        },
    },
    plugins: [],
}
