/**
 * Colours are CSS variables so that light and dark swap values without any class name changing.
 * The existing pages keep using forest-*, paper and amber-*; those tokens now carry the
 * educational-government palette: teal #0F766E primary, cyan #0891B2 secondary, amber #F59E0B accent.
 */
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Figtree', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] },
      colors: {
        // kept names, new values
        forest: { 900: v('--c-ink'), 800: v('--c-primary'), 700: v('--c-muted'), 100: v('--c-line') },
        paper: v('--c-bg'),
        amber: { 500: v('--c-accent'), 600: v('--c-accent-strong') },
        // new names for anything written from here on
        brand: { DEFAULT: v('--c-primary'), soft: v('--c-primary-soft'), ink: v('--c-on-primary') },
        sky: { brand: v('--c-secondary') },
        nav: { DEFAULT: v('--c-nav'), deep: v('--c-nav-deep'), fg: v('--c-on-nav'), soft: v('--c-on-nav-soft') },
        surface: { DEFAULT: v('--c-surface'), sunken: v('--c-surface-sunken'), raised: v('--c-surface-raised') }
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      boxShadow: {
        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 2px 8px rgb(15 23 42 / 0.05)',
        panel: '0 10px 30px rgb(15 23 42 / 0.12)'
      },
      transitionProperty: { width: 'width' }
    }
  },
  plugins: []
};
