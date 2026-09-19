/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#EDEAE5',
        card: '#FFFFFF',
        sunk: '#F5F2EE',
        hairline: 'rgba(23,23,23,0.09)',
        'hairline-2': 'rgba(23,23,23,0.16)',
        ink: { DEFAULT: '#191A1C', 2: '#4A5560', 3: '#8D9299' },
        graphite: { DEFAULT: '#1C1D1F', hi: '#26282B' },
        red: { DEFAULT: '#E1261B', deep: '#B81C13', wash: '#FBE7E5' },
        slate: { DEFAULT: '#3F535E', hi: '#33454E' },
        gold: { DEFAULT: '#8A6210', wash: '#FBF1DE', line: 'rgba(138,98,16,0.22)' },
        green: { DEFAULT: '#16775F', wash: '#E7F2EF' },
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glass: '0 1px 2px rgba(23,23,23,.04), 0 1px 10px rgba(23,23,23,.045)',
        lift: '0 2px 6px rgba(23,23,23,.06), 0 12px 28px rgba(23,23,23,.08)',
      },
      borderRadius: { xl2: '16px' },
    },
  },
  plugins: [],
};
