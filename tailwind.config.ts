import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fondo: {
          base:    '#080808',
          card:    '#111111',
          elevado: '#1A1A1A',
          borde:   '#242424',
          hover:   '#1E1E1E',
        },
        texto: {
          primario:   '#F2EFE8',
          secundario: '#8C8880',
          apagado:    '#4A4845',
          inverso:    '#0A0A0A',
        },
        acento: {
          DEFAULT: '#E07B39',
          suave:   '#E07B3920',
          hover:   '#C96A2A',
          fuerte:  '#FF8C42',
        },
        exito: {
          DEFAULT: '#4CAF82',
          suave:   '#4CAF8220',
          texto:   '#6EC99A',
        },
        advertencia: {
          DEFAULT: '#D4A843',
          suave:   '#D4A84320',
          texto:   '#E8BF5A',
        },
        peligro: {
          DEFAULT: '#D44343',
          suave:   '#D4434320',
          texto:   '#E86060',
        },
        info: {
          DEFAULT: '#4385D4',
          suave:   '#4385D420',
          texto:   '#60A0E8',
        },
      },
      fontFamily: {
        display: ['var(--font-syne)', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-jetbrains-mono)', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom, 0px)',
      },
      borderRadius: {
        xl:  '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        card:    '0 1px 3px 0 rgba(0,0,0,0.4)',
        elevado: '0 4px 16px -4px rgba(0,0,0,0.5)',
        modal:   '0 20px 60px -10px rgba(0,0,0,0.7)',
        acento:  '0 4px 20px -4px rgba(224,123,57,0.35)',
      },
      zIndex: {
        header:   '50',
        nav:      '50',
        dropdown: '60',
        modal:    '70',
        toast:    '80',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-suave': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        'punto-critico': {
          '0%, 100%': { transform: 'scale(1)',   opacity: '1' },
          '50%':      { transform: 'scale(1.4)', opacity: '0.7' },
        },
      },
      animation: {
        'fade-in':        'fade-in 0.25s ease-out',
        'fade-in-slow':   'fade-in 0.4s ease-out',
        'fade-in-up':     'fade-in-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.32,0.72,0,1)',
        'slide-up':       'slide-up 0.35s cubic-bezier(0.32,0.72,0,1)',
        shimmer:          'shimmer 1.8s linear infinite',
        'pulse-suave':    'pulse-suave 2s ease-in-out infinite',
        'punto-critico':  'punto-critico 1.5s ease-in-out infinite',
        spin:             'spin 1s linear infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
