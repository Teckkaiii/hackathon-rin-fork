/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F4F1',
        card: '#FFFFFF',
        sunk: '#F8F6F4',
        hairline: 'rgba(23,23,23,0.08)',
        'hairline-2': 'rgba(23,23,23,0.14)',
        ink: { DEFAULT: '#17171A', 2: '#4A5560', 3: '#8D9299' },
        red: { DEFAULT: '#E1261B', deep: '#B81C13', wash: '#FDECEA' },
        slate: { DEFAULT: '#3F535E', hi: '#33454E' },
        gold: { DEFAULT: '#8A6210', wash: '#FBF1DE', line: 'rgba(138,98,16,0.22)' },
        green: { DEFAULT: '#16775F', wash: '#E7F2EF' },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 1px 2px rgba(23,23,23,.04), 0 8px 24px rgba(23,23,23,.05), 0 24px 56px rgba(23,23,23,.06)',
        lift: '0 2px 4px rgba(23,23,23,.05), 0 10px 28px rgba(23,23,23,.07), 0 30px 64px rgba(23,23,23,.09)',
      },
      backdropBlur: { glass: '14px' },
      borderRadius: { xl2: '22px' },
    },
  },
  plugins: [],
};
