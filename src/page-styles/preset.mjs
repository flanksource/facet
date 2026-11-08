import clickyPreset from '@flanksource/clicky-ui/tailwind-preset';

// Facet extends clicky-ui. Every literal is a CSS variable defined in
// src/styles.css so hosts can theme it at runtime without rebuilding.
export default {
  presets: [clickyPreset],
  theme: {
    extend: {
      fontFamily: {
        sans: 'var(--facet-font-sans)',
        mono: 'var(--facet-font-mono)',
      },
      colors: {
        'flanksource-blue': 'var(--facet-brand-blue)',
        'flanksource-dark': 'var(--facet-brand-dark)',
      },
      // clicky-ui binds rounded-sm/md/lg to its own --radius token, which print
      // documents (facet stylesheet without clicky-ui's) do not define.
      borderRadius: {
        sm: 'var(--facet-radius-sm)',
        md: 'var(--facet-radius-md)',
        lg: 'var(--facet-radius-lg)',
      },
      maxWidth: {
        a4: 'var(--facet-page-a4)',
      },
    },
  },
};
