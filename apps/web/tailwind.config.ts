import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/games/*/view.tsx'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-tajawal)', 'sans-serif'],
        heading: ['var(--font-lalezar)', 'sans-serif']
      },
      colors: {
        arcade: {
          dark: '#080410',
          card: '#160d2b',
          border: 'rgba(255, 255, 255, 0.1)',
          yellow: '#feca57',
          purple: '#5f27cd',
          green: '#2ecc71',
          red: '#ff4757',
          cyan: '#00d2d3'
        }
      }
    }
  },
  plugins: []
};

export default config;
