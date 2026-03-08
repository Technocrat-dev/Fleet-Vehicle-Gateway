/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            },
            colors: {
                surface: {
                    deep: '#0a0e1a',
                    DEFAULT: '#111627',
                    elevated: '#1a1f35',
                    hover: '#222845',
                },
                accent: {
                    DEFAULT: '#06d6a0',
                    dim: '#059f78',
                    warm: '#f4a261',
                },
                muted: '#6b7194',
                danger: '#e63946',
                success: '#2ec475',
            },
            borderColor: {
                subtle: 'rgba(255, 255, 255, 0.06)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.4s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
