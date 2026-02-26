import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── Backgrounds ───────────────────────── */
        'bg-base': '#FFFFFF',
        'bg-surface': '#FAFAFA',
        'bg-elevated': '#F4F4F4',
        'bg-dark': '#0A0A0A',
        'bg-dark-surface': '#141414',
        'bg-dark-elevated': '#1E1E1E',

        /* ── Text ──────────────────────────────── */
        'text-pri': '#0A0A0A',
        'text-sec': '#525252',
        'text-mut': '#A3A3A3',
        'text-inv': '#FFFFFF',

        /* ── Accents ───────────────────────────── */
        primary: '#0A0A0A',
        'primary-hover': '#262626',
        'primary-active': '#404040',
        success: '#15803D',
        'success-dim': 'rgba(21,128,61,0.1)',
        error: '#B91C1C',
        'error-dim': 'rgba(185,28,28,0.1)',
        gold: '#737373',

        /* ── Borders ───────────────────────────── */
        'border-subtle': '#E5E5E5',
        'border-default': '#D4D4D4',
        'border-strong': '#A3A3A3',

        /* ── Semantic aliases ──────────────────── */
        'surface-1': '#FAFAFA',
        'surface-2': '#F4F4F4',
        'surface-3': '#EBEBEB',
        'text-primary': '#0A0A0A',
        'text-secondary': '#525252',
        'text-muted': '#A3A3A3',
        'text-disabled': '#D4D4D4',
      },

      fontFamily: {
        display: ['DM Serif Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },

      maxWidth: {
        container: '1280px',
      },

      borderRadius: {
        button: '8px',
        card: '12px',
        pill: '9999px',
      },

      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        hover: '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
        elevated: '0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
        mocha: '0 2px 12px rgba(0,0,0,0.15)',
        'mocha-lg': '0 4px 24px rgba(0,0,0,0.20)',
      },

      animation: {
        ticker: 'ticker 45s linear infinite',
        'fade-in': 'fadeIn 200ms ease-out both',
        'slide-up': 'slideUp 250ms ease-out both',
        'slide-down': 'slideDown 220ms ease-out both',
        'scale-in': 'scaleIn 200ms ease-out both',
        'card-appear': 'cardAppear 300ms ease-out both',
        shimmer: 'shimmer 2s linear infinite',
      },

      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          from: { transform: 'translateY(-8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        cardAppear: {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },

      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
}

export default config
