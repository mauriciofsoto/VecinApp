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
            light: 'var(--color-primary-emphasis)',
            DEFAULT: 'var(--color-primary)',
            dark: 'var(--color-primary-hover)',
          },
          blue: {
            soft: 'var(--color-primary-soft)',
            sky: 'var(--color-primary-emphasis)',
            DEFAULT: 'var(--color-primary)',
            deep: 'var(--color-primary-hover)',
            navy: 'var(--color-primary-hover)',
          },
          surface: {
            input: 'var(--color-control-surface-solid)',
            header: 'var(--color-surface-elevated)',
            elevated: 'var(--color-surface-elevated)',
          },
          neutral: {
            title: 'var(--color-text-primary)',
            body: 'var(--color-text-secondary)',
            muted: 'var(--color-text-muted)',
            border: 'var(--color-border)',
          },
          success: {
            DEFAULT: 'var(--color-success)',
            soft: 'var(--color-success-subtle)',
            border: 'var(--color-success-border)',
            text: 'var(--color-success-text)',
          },
          danger: {
            DEFAULT: 'var(--color-danger)',
            soft: 'var(--color-danger-subtle)',
            border: 'var(--color-danger-border)',
            text: 'var(--color-danger-text)',
          },
          inverse: 'var(--color-text-inverse)',
        }
      },
      fontFamily: {
        sans: ['var(--font-family-primary)'],
        logo: ['var(--font-family-title)'],
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-xl)',
      },
      borderRadius: {
        xl: 'var(--radius-control)',
        '3xl': 'var(--radius-card)',
        full: 'var(--radius-pill)',
      },
      backdropBlur: {
        glass: 'var(--effect-glass-blur)',
      },
    },
  },
  plugins: [],
}
