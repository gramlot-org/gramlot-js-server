/** The gallery of @gramlot/gramlot-examples on the Node or Bun host (GE-010 §025). */
import {copyFile, mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const JAVASCRIPT = 'text/javascript; charset=utf-8';
const RUNTIMES = {node: './node.mjs', bun: './bun.mjs'};

/** buildGallery and the gallery page of @gramlot/gramlot-examples, an optional peer dependency. */
async function examplesPackage() {
    try {
        return {buildGallery: (await import('@gramlot/gramlot-examples')).buildGallery,
            galleryPage: fileURLToPath(import.meta.resolve('@gramlot/gramlot-examples/gallery/page.js'))};
    } catch (error) {
        if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('@gramlot/gramlot-examples')) {
            throw new Error('The gallery needs @gramlot/gramlot-examples: npm install @gramlot/gramlot-examples');
        }
        throw error;
    }
}

/** The catalogue of this package for runtime, as a [catalog.json, pages folder] pair, when it exists. */
function runtimeCatalog(runtime) {
    const folder = fileURLToPath(new URL(`../gallery/${runtime}/`, import.meta.url));
    const catalog = join(folder, 'catalog.json');
    return existsSync(catalog) ? [[catalog, join(folder, 'pages')]] : [];
}

/** Stage one page module per route in folder: the gallery for index, and for each example a
 * subclass that appends frame.js, its stylesheet <key>.css and <key>_aux.js, which re-exports every
 * name of the logic module from its URL (`export *`): Logic when the module exports it, no Logic when it
 * does not, as the core allows. Returns the assets, with each logic module as JavaScript. */
async function stage(folder, {buildGallery, galleryPage}, catalogs, prefix, serverlessDownloadUrl) {
    const {routes, assets} = buildGallery({catalogs});
    const urlOf = Object.fromEntries(Object.entries(assets).map(([url, {file}]) => [file, url]));
    await writeFile(join(folder, 'index.js'), `import {Page as Gallery} from ${JSON.stringify(pathToFileURL(galleryPage).href)};
export class Page extends Gallery {
    static catalogs = ${JSON.stringify(catalogs)};
    static serverlessDownloadUrl = ${JSON.stringify(serverlessDownloadUrl)};
    static logoUrl = ${JSON.stringify(`${prefix}/assets/branding/svg/gramlot-horizontal-primary.svg`)};
}
`);
    await writeFile(join(folder, 'index_aux.js'), `export {Logic} from ${JSON.stringify(`${prefix}/gallery/dist/gallery.js`)};\n`);
    const galleryUrls = Object.fromEntries(Object.entries(routes).filter(([key]) => key !== 'index').map(([key, route]) => [key, `${prefix}/${route.url}`]));
    for (const [routeKey, {page, data, stylesheet, logic, url: key}] of Object.entries(routes)) {
        if (routeKey === 'index') continue;
        await mkdir(dirname(join(folder, `${key}.js`)), {recursive:true});
        await writeFile(join(folder, `${key}.js`), `import {Page as Example} from ${JSON.stringify(pathToFileURL(page).href)};
export class Page extends Example {
    static galleryUrls = ${JSON.stringify(galleryUrls)};
    async main(root, ...args) {
        await super.main(root, ...args);
        root.script({src: ${JSON.stringify(`${prefix}/gallery/dist/frame.js`)}});
    }
}
`);
        if (data) await copyFile(data, join(folder, `${key}_data.tytx`));
        if (stylesheet) await copyFile(stylesheet, join(folder, `${key}.css`));
        if (logic) {
            const url = urlOf[logic];
            if (!url) throw new Error(`The logic module of ${key} is not a gallery asset: ${logic}`);
            assets[url] = {...assets[url], type: JAVASCRIPT};
            await writeFile(join(folder, `${key}_aux.js`), `export * from ${JSON.stringify(prefix + url)};\n`);
        }
    }
    return assets;
}

/** Serve the gallery: the common families, the catalogue of this package for the runtime and
 * catalogs ([catalog.json, pages folder] pairs). mountPath is the prefix of every URL. */
export async function startGallery({runtime = 'node', catalogs = [], mountPath = '', serverlessDownloadUrl = null, ...options} = {}) {
    if (!Object.hasOwn(RUNTIMES, runtime)) throw new TypeError(`Unknown runtime: ${runtime}`);
    const examples = await examplesPackage();
    const {startServer} = await import(RUNTIMES[runtime]);
    const trimmed = mountPath.replace(/^\/+|\/+$/g, '');
    const prefix = trimmed ? `/${trimmed}` : '';
    const pages = await mkdtemp(join(tmpdir(), 'gramlot-gallery-'));
    try {
        const assets = await stage(pages, examples, [...runtimeCatalog(runtime), ...catalogs], prefix, serverlessDownloadUrl);
        const app = await startServer({...options, pages, mountPath: prefix, assets});
        return {...app, pages, url: app.url, galleryUrl: `${app.url}${prefix}/`,
            async close() { await app.close(); await rm(pages, {recursive: true, force: true}); }};
    } catch (error) {
        await rm(pages, {recursive: true, force: true});
        throw error;
    }
}
