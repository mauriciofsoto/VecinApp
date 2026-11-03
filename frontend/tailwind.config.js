/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: {
            light: '#BD88FD',
            DEFAULT: '#A749FC',
            dark: '#840CD2',
          },
          blue: {
            soft: '#E1EAFE',
            sky: '#A1C3FD',
            DEFAULT: '#499EFC',
            deep: '#4D49FC',
            navy: '#1809E2',
          },
          surface: {
            input: '#EEF2FF',
            header: '#A1C3FD',
          },
          neutral: {
            title: '#25252A',
            body: '#44444C',
            muted: '#66666E',
            border: '#D8D8DA',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        logo: ['"Lora"', 'serif'],
      }
    },
  },
  plugins: [],
}