#!/usr/bin/env node
/** gramlot <runtime> <command>: the runtime first (node, bun), then the command (gallery). */
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';

const usage = `Usage:
  gramlot node gallery [--host HOST] [--port PORT] [--mount PATH] [--catalog CATALOG.json PAGES]...
  gramlot bun gallery  [same options]

The gallery of @gramlot/gramlot-examples on the Node or Bun host. --mount serves every URL
under a prefix (/js); --catalog adds the families of one environment catalogue.`;

/** The options of gallery; --catalog takes two values and repeats. */
function galleryOptions(args) {
    const options = {hostname: '127.0.0.1', port: 8080, mountPath: '', catalogs: []};
    for (let index = 0; index < args.length; index++) {
        const name = args[index];
        const value = () => {
            if (index + 1 >= args.length || args[index + 1].startsWith('--')) throw new Error(`${name} needs a value\n\n${usage}`);
            return args[++index];
        };
        if (name === '--host') options.hostname = value();
        else if (name === '--port') {
            options.port = Number(value());
            if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) throw new Error(`Invalid port\n\n${usage}`);
        } else if (name === '--mount') options.mountPath = value();
        else if (name === '--catalog') options.catalogs.push([resolve(value()), resolve(value())]);
        else throw new Error(`Unknown option ${name}\n\n${usage}`);
    }
    return options;
}

/** Run this command again with the executable of the requested runtime. */
function rerun(executable) {
    const child = spawn(executable, [process.argv[1], ...process.argv.slice(2)], {stdio: 'inherit'});
    child.once('error', error => {
        console.error(error.code === 'ENOENT' ? `gramlot: ${executable} is not on PATH` : `gramlot: ${error.message}`);
        process.exitCode = 1;
    });
    // SIGINT and SIGTERM are passed to the child.
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
    child.once('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); process.exit(); });
}

try {
    const [runtime, command, ...args] = process.argv.slice(2);
    if (['-h', '--help', undefined].includes(runtime)) {
        console.log(usage);
    } else {
        if (!['node', 'bun'].includes(runtime) || command !== 'gallery') throw new Error(usage);
        const options = galleryOptions(args);
        if (runtime === 'bun' && !globalThis.Bun) rerun('bun');
        else if (runtime === 'node' && globalThis.Bun) rerun('node');
        else {
            const {startGallery} = await import('./gallery.mjs');
            const app = await startGallery({runtime, ...options});
            console.log(`Gramlot gallery (${runtime}): ${app.galleryUrl}`);
            for (const signal of ['SIGINT', 'SIGTERM']) {
                process.once(signal, async () => { await app.close(); process.exit(0); });
            }
        }
    }
} catch (error) {
    console.error(`gramlot: ${error.message}`);
    process.exitCode = 1;
}
