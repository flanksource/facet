import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import facetFontScale from './postcss/facet-font-scale.mjs';

// Array form rather than the object map: the map's keys are resolved as package
// names, and facetFontScale is a repo-local file.
//
// Order is load-bearing. facetFontScale runs last so it rewrites the utilities
// Tailwind has just generated — including the arbitrary `text-[8pt]` classes
// the components use, which is most of the document's type.
export default {
  plugins: [tailwindcss(), autoprefixer(), facetFontScale()],
};
