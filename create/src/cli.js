#!/usr/bin/env node
/** npm create @gramlot page|site <folder>: a new project from the template page or site. */
import {cp, mkdir, readdir, readFile, stat, writeFile} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import {basename, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const usage = `Usage:
  npm create @gramlot page <folder>    index.js: one page, built to index.html
  npm create @gramlot site <folder>    pages/: a site, built to dist/
  npm create @gramlot <folder>         asks: page or site?`;
const own = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

/** The package.json of the new project; the build script depends on the template. */
function manifest(name, template) {
    return {
        name, version: '0.1.0', private: true, type: 'module',
        scripts: {
            build: template === 'page' ? 'gramlot-serverless build index.js -o index.html' : 'gramlot-serverless build pages -o dist',
            start: 'node serve.mjs',
            'start:bun': 'bun serve.mjs',
        },
        dependencies: {
            '@gramlot/gramlot': '>=0.2.12',
            '@gramlot/gramlot-js-server': `^${own.version}`,
            '@gramlot/gramlot-serverless': `^${own.version}`,
        },
    };
}

/** A lowercase npm package name from the folder name. */
function packageName(folder) {
    const name = basename(folder).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[._-]+|[-]+$/g, '');
    return name || 'gramlot-project';
}

/** The template typed on stdin; stdin closed without an answer is an error. */
async function ask() {
    const lines = createInterface({input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY)});
    try {
        const typed = await new Promise((done, fail) => {
            lines.once('close', () => fail(new Error(`No answer to "page or site?"\n\n${usage}`)));
            lines.question('page or site? ').then(done, fail);
        });
        const answer = typed.trim().toLowerCase();
        if (!['page', 'site'].includes(answer)) throw new Error(`Answer page or site, not "${answer}"\n\n${usage}`);
        return answer;
    } finally { lines.close(); }
}

async function emptyOrMissing(folder) {
    try {
        if (!(await stat(folder)).isDirectory()) return false;
        return (await readdir(folder)).length === 0;
    } catch (error) {
        if (error.code === 'ENOENT') return true;
        throw error;
    }
}

try {
    const args = process.argv.slice(2);
    if (['-h', '--help'].includes(args[0])) {
        console.log(usage);
    } else {
        let template, folder;
        if (args.length === 2 && ['page', 'site'].includes(args[0])) [template, folder] = args;
        else if (args.length === 1 && !['page', 'site'].includes(args[0])) [folder, template] = [args[0], await ask()];
        else throw new Error(usage);
        const target = resolve(folder);
        if (!(await emptyOrMissing(target))) throw new Error(`${target} exists and is not an empty folder`);
        await mkdir(target, {recursive: true});
        await cp(fileURLToPath(new URL(`../templates/${template}/`, import.meta.url)), target, {recursive: true});
        const name = packageName(target);
        await writeFile(join(target, 'package.json'), JSON.stringify(manifest(name, template), null, 2) + '\n');
        // npm drops .gitignore from published packages: the file is written here.
        await writeFile(join(target, '.gitignore'), template === 'page' ? 'node_modules/\nindex.html\n' : 'node_modules/\ndist/\n');
        const readme = join(target, 'README.md');
        await writeFile(readme, (await readFile(readme, 'utf8')).replaceAll('{{name}}', name));
        console.log(`Created ${target} (${template}).

Next:
  cd ${folder}
  npm install
  npm run build
  npm start`);
    }
} catch (error) {
    console.error(`create-gramlot: ${error.message}`);
    process.exitCode = 1;
}
