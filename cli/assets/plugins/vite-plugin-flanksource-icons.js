/**
 * Vite plugin to handle ~icons/flanksource/* imports
 * Maps them to @flanksource/icons/mi React components
 */

/**
 * Convert kebab-case to PascalCase for icon names
 * e.g., 'aws-cloudwatch' -> 'AwsCloudwatch'
 */
function kebabToPascal(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

export default function flanksourceIconsPlugin() {
  return {
    name: 'vite-plugin-flanksource-icons',
    enforce: 'pre',

    resolveId(id) {
      // Match ~icons/flanksource/* imports
      const match = id.match(/^~icons\/flanksource\/(.+)$/);
      if (match) {
        const iconKebabName = match[1];
        const iconPascalName = kebabToPascal(iconKebabName);

        // Return a virtual module ID that we'll handle in load()
        return `\0virtual:flanksource-icon:${iconPascalName}`;
      }
      return null;
    },

    load(id) {
      // Handle our virtual modules
      const match = id.match(/^\0virtual:flanksource-icon:(.+)$/);
      if (match) {
        const iconName = match[1];

        // Return code that imports and re-exports from @flanksource/icons/mi
        return `
import { ${iconName} } from '@flanksource/icons/mi';
export default ${iconName};
        `.trim();
      }
      return null;
    },
  };
}
