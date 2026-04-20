import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0faf4',
          100: '#dcf4e6',
          200: '#bbe8cf',
          300: '#8dd5ae',
          400: '#57ba86',
          500: '#339e68',
          600: '#237f52',
          700: '#1c6642',
          800: '#185135',
          900: '#14432c',
          950: '#0a2519',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        warm: {
          50: '#fafaf8',
          100: '#f4f4f0',
          200: '#e8e8e2',
          300: '#d4d4cc',
          400: '#a8a89e',
          500: '#78786e',
          600: '#5a5a52',
          700: '#3e3e38',
          800: '#28281f',
          900: '#1a1a14',
          950: '#0f0f0a',
        },
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        'display-md': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        card: '1rem',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
        'card-dark': '0 1px 3px 0 rgb(0 0 0 / 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
