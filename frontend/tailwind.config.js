/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 10% — Couleur de marque & accent
        primary: {
          50:  '#F9F0FC',
          100: '#F0DEFA',
          200: '#DFBDF5',
          300: '#BC94EF', // Améthyste Douce — brand, focus, highlights
          400: '#A569CE',
          500: '#8E44AD', // Orchidée Vibrante — CTA principal
          600: '#7D3C98',
          700: '#6C3483',
          800: '#5B2C6F',
          900: '#4A235A',
        },
        // 30% — Structure & texte
        ink: {
          50:  '#EBF0F5',
          100: '#D6E0EB',
          200: '#ADC0D7',
          300: '#84A0C3',
          400: '#607D8B',
          500: '#4A6275',
          600: '#3D5166',
          700: '#2C3E50', // Gris Ardoise Foncée — texte principal, navigation
          800: '#1E2D3A',
          900: '#111B24',
        },
        // 60% — Fond
        snow: '#F8FAFC', // Blanc Cassé — arrière-plan général
        // Sémantique succès
        mint: {
          50:  '#F0FBF6',
          100: '#D5F5E9',
          200: '#A8E6CF', // Vert Menthe Doux
          300: '#7DD3B0',
          400: '#4DB88A',
          500: '#2E9E6E',
          600: '#1E7A52',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
