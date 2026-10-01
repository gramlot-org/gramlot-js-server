import {build as bundle} from 'esbuild';
import {runtimeNotices} from './runtime-notices.js';
import {checkPage, companion, companionBundle, workerBundle} from './bundles.js';
import {HtmlBuilder} from '@genrojs/builders';
import {copyFile, mkdir, realpath, rename, rm, stat, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const fromServerless = createRequire(import.meta.url);
const standalone = fileURLToPath(new URL('./standalone.js', import.meta.url));
import {randomUUID} from 'node:crypto';
import {dirname, extname, isAbsolute, join, resolve} from 'node:path';

const workerOptions = {
    bundle: true, platform: 'browser', format: 'iife', target: 'es2022',
    write: false, legalComments: 'inline',
};
const routePattern = /^[a-z][a-z0-9_-]*$/;
const targetPattern = /^[A-Za-z0-9._/-]+$/;

function checkTarget(target) {
    if (typeof target !== 'string' || !targetPattern.test(target) ||
        target.startsWith('/') || target.split('/').some(part => !part || part === '.' || part === '..')) {
        throw new TypeError(`Invalid asset target: ${String(target)}`);
    }
    return target;
}

function conflicts(left, right) {
    return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function validate({pages, output, assets}) {
    if (!pages || typeof pages !== 'object' || Array.isArray(pages) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(pages))) {
        throw new TypeError('pages must be an object mapping route identifiers to absolute JS Page files');
    }
    const entries = Object.entries(pages).sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length || !Object.hasOwn(pages, 'index')) {
        throw new TypeError('pages must include an index route');
    }
    for (const [route, page] of entries) {
        if (!routePattern.test(route)) throw new TypeError(`Invalid route identifier: ${route}`);
        if (typeof page !== 'string' || !isAbsolute(page) || !['.js', '.mjs'].includes(extname(page))) {
            throw new TypeError(`Page for ${route} must be an absolute .js or .mjs file`);
        }
        checkPage(page);
    }
    if (typeof output !== 'string' || !output.trim()) {
        throw new TypeError('output must be a directory path');
    }
    if (!Array.isArray(assets)) throw new TypeError('assets must be an array');
    const generated = [
        'index.html', 'assets/standalone.js', 'assets/runtime-notices.json',
        ...entries.map(([route]) => `assets/workers/${route}.js`),
        ...entries.filter(([route]) => route !== 'index').map(([route]) => `${route}/index.html`),
    ];
    const copied = [];
    for (const asset of assets) {
        if (!asset || typeof asset !== 'object' || Array.isArray(asset) ||
            typeof asset.source !== 'string' || !isAbsolute(asset.source)) {
            throw new TypeError('Each asset needs an absolute source and a relative target');
        }
        const target = checkTarget(asset.target);
        if (target === 'assets/workers' || target.startsWith('assets/workers/') ||
            generated.some(path => conflicts(target, path)) || copied.some(path => conflicts(target, path))) {
            throw new TypeError(`Asset target conflicts with generated output: ${target}`);
        }
        copied.push(target);
    }
    return {entries, destination: resolve(output), assets};
}

async function regularFile(path, description) {
    const info = await stat(path);
    if (!info.isFile()) throw new TypeError(`${description} must be a file: ${path}`);
}

async function missing(path) {
    try { await stat(path); return false; }
    catch (error) {
        if (error.code === 'ENOENT') return true;
        throw error;
    }
}

function documentFor(route) {
    const relativeRoot = route === 'index' ? './' : '../';
    const document = new HtmlBuilder();
    const html = document.root.html({lang: 'en'});
    const head = html.head();
    head.meta({charset: 'utf-8'});
    head.meta({name: 'viewport', content: 'width=device-width,initial-scale=1'});
    head.title(route);
    const body = html.body();
    body.div({id: 'gramlot-root'});
    body.script(null, {src: `${relativeRoot}assets/standalone.js`});
    body.script(null, {src: `${relativeRoot}assets/workers/${route}.js`});
    return '<!doctype html>' + document.render();
}

function bootstrapFor(worker, modules, route) {
    const relativeRoot = route === 'index' ? './' : '../';
    return `(() => {
    const blob = text => URL.createObjectURL(new Blob([text], {type: 'text/javascript'}));
    const workerUrl = blob(${JSON.stringify(worker)});
    const modules = Object.fromEntries(Object.entries(${JSON.stringify(modules)}).map(([url, text]) => [url, blob(text)]));
    GramlotStandalone.mount({workerUrl, modules, assetRoot: new URL(${JSON.stringify(relativeRoot)}, document.baseURI).href})
        .then(app => { globalThis.gramlot = app; })
        .catch(error => { console.error(error); })
        .finally(() => { for (const url of [workerUrl, ...Object.values(modules)]) URL.revokeObjectURL(url); });
})();`;
}

/** Export a set of JS Pages that open directly from the resulting directory. */
export async function buildDirectory({pages, output, assets = []}) {
    const {entries, destination} = validate({pages, output, assets});
    if (!(await missing(destination))) throw new Error(`Output directory already exists: ${destination}`);

    let core;
    for (const [route, page] of entries) {
        await regularFile(page, `Page for ${route}`);
        const fromPage = createRequire(page);
        const resolved = {
            entry: await realpath(fromPage.resolve('@gramlot/gramlot')),
            runtime: await realpath(fromPage.resolve('@gramlot/gramlot/runtime')),
        };
        if (core && (core.entry !== resolved.entry || core.runtime !== resolved.runtime)) {
            throw new Error('All Pages must resolve the same Gramlot core installation');
        }
        core = resolved;
    }
    if (core.entry !== await realpath(fromServerless.resolve('@gramlot/gramlot'))) {
        throw new Error('Pages and Serverless must resolve the same Gramlot core installation');
    }
    await regularFile(join(dirname(core.runtime), 'runtime-notices.json'), 'Runtime notices');
    for (const asset of assets) await regularFile(asset.source, 'Asset source');

    await mkdir(dirname(destination), {recursive: true});
    const stage = `${destination}.${randomUUID()}.tmp`;
    await mkdir(stage);
    try {
        await mkdir(join(stage, 'assets/workers'), {recursive: true});
        const runtime = await bundle({...workerOptions, entryPoints: [standalone], globalName: 'GramlotStandalone'});
        await writeFile(join(stage, 'assets/standalone.js'), runtime.outputFiles[0].text);
        await writeFile(join(stage, 'assets/runtime-notices.json'),
            JSON.stringify(await runtimeNotices(core.runtime), null, 2) + '\n');
        for (const [route, page] of entries) {
            const aux = await companion(page);
            const worker = (await workerBundle(page, aux, workerOptions)).text;
            const modules = aux ? {[aux.url]: await companionBundle(aux, workerOptions)} : {};
            await writeFile(join(stage, 'assets/workers', `${route}.js`), bootstrapFor(worker, modules, route));
            const htmlPath = route === 'index' ? join(stage, 'index.html') : join(stage, route, 'index.html');
            await mkdir(dirname(htmlPath), {recursive: true});
            await writeFile(htmlPath, documentFor(route));
        }
        for (const {source, target} of assets) {
            const path = join(stage, target);
            await mkdir(dirname(path), {recursive: true});
            await copyFile(source, path);
        }
        if (!(await missing(destination))) throw new Error(`Output directory already exists: ${destination}`);
        await rename(stage, destination);
        return {output: destination, routes: entries.map(([route]) => route)};
    } finally {
        await rm(stage, {recursive: true, force: true});
    }
}
