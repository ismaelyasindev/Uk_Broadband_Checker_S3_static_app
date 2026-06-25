import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm "paper" surfaces — deliberately not pure white/grey.
        paper: {
          DEFAULT: '#f3f1ea',
          card: '#fbfaf5',
          sunk: '#eceae1',
        },
        // Near-black ink with a faint warmth, plus muted text steps.
        ink: {
          DEFAULT: '#16151b',
          soft: '#3c3b46',
          mute: '#75737f',
        },
        // Single confident accent used sparingly.
        flare: {
          DEFAULT: '#e0218a',
          deep: '#b30a6a',
          soft: '#fbe4f1',
        },
        line: 'rgba(22, 21, 27, 0.10)',
        // shadcn-compatible semantic tokens mapped onto the paper/ink/flare palette.
        // These let drop-in shadcn / mapcn components inherit our visual language
        // without us re-skinning every primitive.
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        ring: 'hsl(var(--ring))',
      },
      maxWidth: {
        62: '15.5rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      boxShadow: {
        lift: '0 1px 2px rgba(22,21,27,0.04), 0 12px 32px -12px rgba(22,21,27,0.18)',
        ring: '0 0 0 1px rgba(22,21,27,0.08), 0 18px 50px -20px rgba(22,21,27,0.28)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bars: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
        sheen: {
          '100%': { transform: 'translateX(200%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.5s ease-out both',
        bars: 'bars 1.1s ease-in-out infinite',
        sheen: 'sheen 1.6s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};
