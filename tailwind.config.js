/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', "[data-theme='dark']"],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        navy: '#17213a',
        ink: '#182136',
        soft: '#33405a',
        mut: '#8d97a9',
        faint: '#9aa5b5',
        pri: '#5267f5',
        line: '#e7eaf1',
        line2: '#e0e5ee',
        dksurf: '#151d30',
        dkline: '#1b2440',
        dkline2: '#2a3552',
      },
      borderRadius: { card: '13px' },
      boxShadow: { card: '0 12px 34px rgba(39,50,83,.07)' },
      keyframes: { shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } } },
      animation: { shimmer: 'shimmer 1.2s infinite' },
      fontFamily: {
        vazir: ["'Vazirmatn'", 'Tahoma', 'sans-serif'],
        estedad: ["'Estedad'", 'Tahoma', 'sans-serif'],
        samim: ["'Samim'", 'Tahoma', 'sans-serif'],
        shabnam: ["'Shabnam'", 'Tahoma', 'sans-serif'],
        lalezar: ["'Lalezar'", 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
