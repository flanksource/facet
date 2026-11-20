import { generateDOCX, generatePPTX } from '@flanksource/facet/cli';

const [template, outputDir] = process.argv.slice(2);
if (!template || !outputDir) throw new Error('Expected a Markdown template and output directory');
const options = { template, outputDir, outputName: 'consumer', outputNameField: 'name', validate: true, verbose: false };
await generateDOCX(options);
await generatePPTX(options);
