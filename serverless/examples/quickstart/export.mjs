import {resolve} from 'node:path';
import {buildDirectory} from '../../src/build-directory.js';

// Usage: node examples/quickstart/export.mjs build/site
const output = resolve(process.argv[2] ?? 'build/site');
const here = import.meta.dirname;
const result = await buildDirectory({
    pages: {index: resolve(here, 'styled.js')},
    output,
    assets: [{source: resolve(here, 'theme.css'), target: 'theme.css'}],
});
console.log(`Exported ${result.routes.join(', ')} to ${result.output}`);
