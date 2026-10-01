import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  // Must cover src/ as a whole: App.tsx sits at src/App.tsx and was not matched
  // by the previous per-directory globs, so ~157 classes used only there were
  // silently purged from the build (hover/active states, primary tints, etc).
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['"Hanken Grotesk Variable"', 'system-ui', 'sans-serif'],
        headline: ['"Bricolage Grotesque Variable"', '"Hanken Grotesk Variable"', 'system-ui', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        // Money semantics: credit/debit read instantly and stay legible in
        // both themes. See --credit / --debit in src/globals.css.
        credit: {
          DEFAULT: 'hsl(var(--credit))',
          foreground: 'hsl(var(--credit-foreground))',
          subtle: 'hsl(var(--credit-subtle))',
        },
        debit: {
          DEFAULT: 'hsl(var(--debit))',
          foreground: 'hsl(var(--debit-foreground))',
          subtle: 'hsl(var(--debit-subtle))',
        },
        brand: {
          50: 'hsl(var(--brand-50))', 100: 'hsl(var(--brand-100))', 200: 'hsl(var(--brand-200))',
          300: 'hsl(var(--brand-300))', 400: 'hsl(var(--brand-400))', 500: 'hsl(var(--brand-500))',
          600: 'hsl(var(--brand-600))', 700: 'hsl(var(--brand-700))', 800: 'hsl(var(--brand-800))',
          900: 'hsl(var(--brand-900))', 950: 'hsl(var(--brand-950))',
        },
        gold: {
          50: 'hsl(var(--gold-50))', 100: 'hsl(var(--gold-100))', 200: 'hsl(var(--gold-200))',
          300: 'hsl(var(--gold-300))', 400: 'hsl(var(--gold-400))', 500: 'hsl(var(--gold-500))',
          600: 'hsl(var(--gold-600))', 700: 'hsl(var(--gold-700))', 800: 'hsl(var(--gold-800))',
          900: 'hsl(var(--gold-900))',
        },
        sand: {
          50: 'hsl(var(--sand-50))', 100: 'hsl(var(--sand-100))', 200: 'hsl(var(--sand-200))',
          300: 'hsl(var(--sand-300))', 400: 'hsl(var(--sand-400))', 500: 'hsl(var(--sand-500))',
          600: 'hsl(var(--sand-600))', 700: 'hsl(var(--sand-700))', 800: 'hsl(var(--sand-800))',
          900: 'hsl(var(--sand-900))', 950: 'hsl(var(--sand-950))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Layered surfaces and money semantics, from src/globals.css.
      backgroundColor: {
        'surface-1': 'hsl(var(--surface-1))',
        'surface-2': 'hsl(var(--surface-2))',
        'surface-3': 'hsl(var(--surface-3))',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        ring: 'var(--shadow-ring)',
      },
      // A real type scale with paired line-heights and tracking, rather than
      // per-component font sizes.
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.875rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.035em' }],
      },
      transitionTimingFunction: {
        'out-quint': 'var(--ease-out-quint)',
        spring: 'var(--ease-spring)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '320ms',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;