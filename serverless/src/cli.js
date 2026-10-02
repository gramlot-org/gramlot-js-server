#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {build} from './build.js';

try {
    const {values, positionals} = parseArgs({allowPositionals: true, options: {
        output: {type: 'string', short: 'o'}, help: {type: 'boolean', short: 'h'},
    }});
    if (values.help) {
        console.log('Usage: gramlot-serverless build PAGE.js -o OUTPUT.html');
    } else {
        if (positionals.length !== 2 || positionals[0] !== 'build' || !values.output) {
            throw new Error('Usage: gramlot-serverless build PAGE.js -o OUTPUT.html');
        }
        const result = await build({page: positionals[1], output: values.output});
        console.log(`Built ${result.output}: ${result.bytes} bytes, sha256 ${result.sha256}`);
    }
} catch (error) {
    console.error(`gramlot-serverless: ${error.message}`);
    process.exitCode = 1;
}
