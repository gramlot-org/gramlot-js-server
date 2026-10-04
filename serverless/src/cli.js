#!/usr/bin/env node
import {stat} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {build} from './build.js';
import {buildDirectory, folderPages} from './build-directory.js';
import {resolve} from 'node:path';

const usage = `Usage:
  gramlot-serverless build PAGE.js -o OUTPUT.html    one page to one HTML file
  gramlot-serverless build FOLDER -o OUTPUT          a folder of pages to a static directory
  gramlot-serverless gallery OUTPUT [--catalog CATALOG.json PAGES]...
                                                     the gallery of @gramlot/gramlot-examples`;

/** --catalog takes two values and repeats; parseArgs reads one value per option. */
function catalogs(args) {
    const pairs = [], rest = [];
    for (let index = 0; index < args.length; index++) {
        if (args[index] !== '--catalog') { rest.push(args[index]); continue; }
        if (index + 2 >= args.length || args.slice(index + 1, index + 3).some(arg => arg.startsWith('-'))) {
            throw new Error(`--catalog needs a catalog.json and a pages folder\n\n${usage}`);
        }
        pairs.push([resolve(args[index + 1]), resolve(args[index + 2])]);
        index += 2;
    }
    return {pairs, rest};
}

try {
    const {pairs, rest} = catalogs(process.argv.slice(2));
    const {values, positionals} = parseArgs({args: rest, allowPositionals: true, options: {
        output: {type: 'string', short: 'o'}, help: {type: 'boolean', short: 'h'},
    }});
    if (values.help) {
        console.log(usage);
    } else if (positionals[0] === 'gallery') {
        if (positionals.length !== 2 || values.output) throw new Error(usage);
        const {buildStaticGallery} = await import('./gallery.js');
        const result = await buildStaticGallery({output: positionals[1], catalogs: pairs});
        console.log(`Built ${result.output}: the gallery and ${result.routes.length - 1} examples; open index.html`);
    } else {
        if (pairs.length) throw new Error(usage);
        if (positionals.length !== 2 || positionals[0] !== 'build' || !values.output) throw new Error(usage);
        const input = positionals[1];
        if ((await stat(input)).isDirectory()) {
            const result = await buildDirectory({...await folderPages(input), output: values.output});
            console.log(`Built ${result.output}: ${result.routes.length} pages (${result.routes.join(', ')})`);
        } else {
            const result = await build({page: input, output: values.output});
            console.log(`Built ${result.output}: ${result.bytes} bytes, sha256 ${result.sha256}`);
        }
    }
} catch (error) {
    console.error(`gramlot-serverless: ${error.message}`);
    process.exitCode = 1;
}
