#!/usr/bin/env node
import {stat} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {build} from './build.js';
import {buildDirectory, folderPages} from './build-directory.js';

const usage = `Usage:
  gramlot-serverless build PAGE.js -o OUTPUT.html    one page to one HTML file
  gramlot-serverless build FOLDER -o OUTPUT          a folder of pages to a static directory`;

try {
    const {values, positionals} = parseArgs({allowPositionals: true, options: {
        output: {type: 'string', short: 'o'}, help: {type: 'boolean', short: 'h'},
    }});
    if (values.help) {
        console.log(usage);
    } else {
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
