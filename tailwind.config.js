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
  ],
};
