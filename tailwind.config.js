module.exports = {
  content: [
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/stories/**/*.{js,jsx,ts,tsx}",
    "./src/utils/**/*.{js,jsx,ts,tsx}",
    "./src/icons/**/*.{js,jsx,ts,tsx}",
    "./src/content/**/*.mdx",
    "./src/types/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      // Print-first type scale in points. facet's own dist/styles.css is built
      // by this config, so without it the shipped `.text-*` utilities are the
      // stock rem sizes and every consumer that just links the stylesheet gets
      // text-xs at 9pt instead of 7pt. Mirrors TEXT_SCALE in
      // cli/src/utils/type-scale.ts, which has a test asserting they agree.
      fontSize: {
        xs: ['7pt', { lineHeight: '9pt' }],
        sm: ['9pt', { lineHeight: '12pt' }],
        base: ['10pt', { lineHeight: '14pt' }],
        md: ['10pt', { lineHeight: '14pt' }],
        lg: ['15pt', { lineHeight: '19pt' }],
        xl: ['18pt', { lineHeight: '22pt' }],
        '2xl': ['24pt', { lineHeight: '28pt' }],
      },
      fontFamily: {
        'sans': ["Open Sans", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        'mono': ["Fira Code", "Consolas", "Monaco", "Courier New", "monospace"],
      },
      colors: {
        'flanksource-blue': '#2563eb',
        'flanksource-dark': '#1e293b',
      },
      maxWidth: {
        'a4': '210mm',
      },

    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    function orderedListStyles({ addBase }) {
      addBase({
        ol: {
          margin: '3mm 0 4mm 8mm',
          padding: '0',
          listStyleType: 'decimal',
        },
      });
    },
  ],
};
