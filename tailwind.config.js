module.exports = {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx,mdx}",
    "./src/content/**/*.mdx",
    "./node_modules/@flanksource/facet/src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ["Open Sans", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        'mono': ["Consolas", "Monaco", "Courier New", "monospace"],
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
  ],
};
