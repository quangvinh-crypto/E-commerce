/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Mode Premium Color System
        zinc: {
          950: '#09090b',
          900: '#18181b',
          800: '#27272a',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(to right, #f4f4f5, #f59e0b)',
        'gradient-cta': 'linear-gradient(135deg, #f59e0b, #fbbf24)',
        'gradient-section': 'linear-gradient(to bottom, #09090b, #18181b)',
        'gradient-overlay': 'linear-gradient(to bottom, rgba(9,9,11,0.8), rgba(9,9,11,0.95))',
      },
      boxShadow: {
        'amber-glow': '0 20px 25px -5px rgba(245, 158, 11, 0.2)',
        'amber-glow-lg': '0 25px 50px -12px rgba(245, 158, 11, 0.3)',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-in-out',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
