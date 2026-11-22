const { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');

const step = process.argv[2];
const steps = existsSync('build-steps.json') ? JSON.parse(readFileSync('build-steps.json', 'utf8')) : [];
steps.push(step);
writeFileSync('build-steps.json', JSON.stringify(steps));

switch (step) {
  case 'components':
    rmSync('dist', { recursive: true });
    mkdirSync('dist/components', { recursive: true });
    writeFileSync('dist/components/index.js', 'export const Marker = "rebuilt";');
    break;
  case 'css':
    mkdirSync('dist/page-styles', { recursive: true });
    writeFileSync('dist/styles.css', '/* rebuilt css */');
    writeFileSync('dist/page-styles/index.mjs', 'export const pageStyles = {};');
    break;
  case 'runtime':
    mkdirSync('dist/runtime', { recursive: true });
    for (const name of ['importmap.json', 'barrels.json']) {
      writeFileSync(`dist/runtime/${name}`, '{}');
    }
    break;
  default:
    throw new Error(`Unexpected build step: ${step}`);
}
