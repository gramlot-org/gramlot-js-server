import {build as bundle} from 'esbuild';
import {runtimeNotices} from './runtime-notices.js';
import {checkPage, loadPage, logicBundle, logicModule, pageStylesheet, workerBundle} from './bundles.js';
import {HtmlBuilder} from '@genrojs/builders';
import {copyFile, mkdir, readdir, realpath, rename, rm, stat, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const fromBrowser = createRequire(import.meta.url);
const standalone = fileURLToPath(new URL('./standalone.js', import.meta.url));
import {randomUUID} from 'node:crypto';
import {basename, dirname, extname, isAbsolute, join, relative, resolve, sep} from 'node:path';

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
        if (['assets/workers', 'assets/styles'].some(folder => target === folder || target.startsWith(`${folder}/`)) ||
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

/** Check the output path: absent (false) or a previous export holding assets/standalone.js
 * (true), replaced by the new one; anything else raises an Error. */
async function previousExport(destination) {
    if (await missing(destination)) return false;
    if ((await stat(destination)).isDirectory() && !(await missing(join(destination, 'assets/standalone.js')))) return true;
    throw new Error(`Output directory already exists and is not a previous export: ${destination}`);
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

/** The pages and assets of a folder: each .js or .mjs file at the first level is a page, its
 * name the route (index.js is the index route); a *_aux file is a companion. Modules imported
 * by the pages live in subfolders. Every other file, except names starting with a dot, is an
 * asset copied to the same relative path. */
export async function folderPages(folder) {
    const root = resolve(folder);
    const pages = {}, assets = [];
    for (const entry of await readdir(root, {recursive: true, withFileTypes: true})) {
        const file = join(entry.parentPath, entry.name);
        const target = relative(root, file).split(sep).join('/');
        if (!entry.isFile() || target.split('/').some(part => part.startsWith('.'))) continue;
        const script = ['.js', '.mjs'].includes(extname(entry.name));
        if (script && entry.parentPath === root && !basename(entry.name, extname(entry.name)).endsWith('_aux')) {
            const route = basename(entry.name, extname(entry.name));
            if (!routePattern.test(route)) {
                throw new TypeError(`Page file ${entry.name}: a page name starts with a lowercase letter, ` +
                    'followed by lowercase letters, digits, _ or -');
            }
            if (Object.hasOwn(pages, route)) throw new TypeError(`Two page files for the route ${route}`);
            pages[route] = file;
        } else if (!script) {
            assets.push({source: file, target});
        }
    }
    return {pages, assets};
}

/** Export a set of JS Pages that open directly from the resulting directory, replacing a
 * previous export at output (a directory with assets/standalone.js). The same-name
 * stylesheet foo.css of a page is written to assets/styles/<route>.css; a Page.css URL under
 * /themes/ is copied from the @gramlot/gramlot package unless an asset already has its path. */
export async function buildDirectory({pages, output, assets = []}) {
    const {entries, destination} = validate({pages, output, assets});
    await previousExport(destination);

    let core;
    const loaded = {};
    for (const [route, page] of entries) {
        await regularFile(page, `Page for ${route}`);
        const module = await loadPage(page);
        loaded[route] = {module, logic: await logicModule(page, module), stylesheet: await pageStylesheet(page)};
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
    if (core.entry !== await realpath(fromBrowser.resolve('@gramlot/gramlot'))) {
        throw new Error('Pages and @gramlot/gramlot-serverless must resolve the same Gramlot core installation');
    }
    await regularFile(join(dirname(core.runtime), 'runtime-notices.json'), 'Runtime notices');
    const copies = [...assets];
    for (const [, {module}] of Object.entries(loaded)) {
        for (const url of module.Page.css ?? []) {
            const target = url.slice(1);
            if (!url.startsWith('/themes/') || copies.some(asset => asset.target === target)) continue;
            checkTarget(target);
            copies.push({source: fromBrowser.resolve(`@gramlot/gramlot${url}`), target});
        }
    }
    for (const asset of copies) await regularFile(asset.source, 'Asset source');

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
            const {logic, stylesheet} = loaded[route];
            if (stylesheet) {
                await mkdir(join(stage, 'assets/styles'), {recursive: true});
                await copyFile(stylesheet, join(stage, 'assets/styles', `${route}.css`));
            }
            const worker = (await workerBundle(page, workerOptions, {logic: logic?.url ?? null,
                stylesheet: stylesheet ? `/assets/styles/${route}.css` : null})).text;
            const modules = logic ? {[logic.url]: await logicBundle(logic, workerOptions)} : {};
            await writeFile(join(stage, 'assets/workers', `${route}.js`), bootstrapFor(worker, modules, route));
            const htmlPath = route === 'index' ? join(stage, 'index.html') : join(stage, route, 'index.html');
            await mkdir(dirname(htmlPath), {recursive: true});
            await writeFile(htmlPath, documentFor(route));
        }
        for (const {source, target} of copies) {
            const path = join(stage, target);
            await mkdir(dirname(path), {recursive: true});
            await copyFile(source, path);
        }
        if (await previousExport(destination)) {
            const previous = `${destination}.${randomUUID()}.previous`;
            await rename(destination, previous);
            await rename(stage, destination);
            await rm(previous, {recursive: true, force: true});
        } else {
            await rename(stage, destination);
        }
        return {output: destination, routes: entries.map(([route]) => route)};
    } finally {
        await rm(stage, {recursive: true, force: true});
    }
}
