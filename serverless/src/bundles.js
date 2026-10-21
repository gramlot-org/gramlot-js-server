import {build as bundle} from 'esbuild';
import {GramlotServer} from '@gramlot/gramlot/gramlot-server';
import * as core from '@gramlot/gramlot';
import * as corePage from '@gramlot/gramlot/page';
import {realpath, stat} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {basename, dirname, extname, isAbsolute, join, relative, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const workerServer = fileURLToPath(new URL('./gramlot-worker-server.js', import.meta.url));
const require = createRequire(import.meta.url);

/** The names of the core entry @gramlot/gramlot/page, read from the entry itself. */
export const pageNames = Object.keys(corePage).filter(name => name !== 'default');

/** The window exposes the entry @gramlot/gramlot/page of its own core as GramlotStandalone (standalone.js exports
 * every name of that entry): a logic module imports it from there, so the window holds one core instance. */
const windowCore = {
    name: 'gramlot-window-core',
    setup(build) {
        build.onResolve({filter: /^@gramlot\/gramlot(?:\/page)?$/}, args => ({path: args.path.endsWith('/page') ? 'page' : 'core', namespace: 'gramlot-window-core'}));
        build.onLoad({filter: /.*/, namespace: 'gramlot-window-core'}, args => ({
            contents: `export const {${(args.path === 'page' ? pageNames : Object.keys(core)).join(', ')}} = globalThis.GramlotStandalone;`, loader: 'js',
        }));
    },
};

async function isFile(path) {
    try {
        return (await stat(path)).isFile();
    } catch (error) {
        if (['ENOENT', 'ENOTDIR'].includes(error.code)) return false;
        throw error;
    }
}

const inside = (filename, folder) => {
    const rel = relative(folder, filename);
    return rel === '' || !(rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel));
};

/** The _aux suffix is reserved for companions: a *_aux file is never a page. */
export function checkPage(page) {
    if (basename(page, extname(page)).endsWith('_aux')) {
        throw new TypeError(`A *_aux file is a page companion, not a page: ${page}`);
    }
}

/** Import the page module, as GramlotFileServer does; it must export a class Page. */
export async function loadPage(page) {
    const module = await import(pathToFileURL(page).href);
    if (typeof module.Page !== 'function') throw new TypeError(`The module exports no class Page: ${page}`);
    return module;
}

/** The page logic with the URL that names it, or null: the Logic export of the page module
 * foo.js, else the companion foo_aux.js beside it. Both at once raise an Error, as GramlotFileServer. */
export async function logicModule(page, module) {
    const stem = basename(page, extname(page));
    const aux = join(dirname(page), `${stem}_aux.js`);
    const found = [];
    if ('Logic' in module) found.push({file: page, url: `/${basename(page)}`});
    if (await isFile(aux)) found.push({file: aux, url: `/${basename(aux)}`});
    if (found.length === 2) throw new Error(`Two logic modules for one page: ${page} and ${aux}`);
    return found[0] ?? null;
}

/** The same-name stylesheet foo.css beside the page file, or null. */
export async function pageStylesheet(page) {
    const file = join(dirname(page), `${basename(page, extname(page))}.css`);
    return await isFile(file) ? file : null;
}

/** The URLs of the CSS of a page, in load order: its theme (GramlotServer.themeCss, the base theme unless
 * the page sets Page.css_theme), then Page.css. A repeated URL stays once, in its last position, as the Worker
 * returns them. */
export function pageStyleUrls(PageClass) {
    if (!Array.isArray(PageClass.css) || PageClass.css.some(url => typeof url !== 'string')) {
        throw new TypeError('Standalone Page.css must be an array of strings');
    }
    const urls = [...new GramlotServer().themeCss(PageClass), ...PageClass.css];
    return urls.filter((url, index) => urls.lastIndexOf(url) === index);
}

/** The files of the CSS of one file: the theme and /themes/… of Page.css from the @gramlot/gramlot package,
 * any other URL of Page.css from the folder of the page; then foo.css. A repeated file stays once, in its last
 * position. */
export async function inlineStylesheets(page, PageClass) {
    const folder = await realpath(dirname(page));
    const files = [];
    for (const url of pageStyleUrls(PageClass)) {
        if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) {
            throw new TypeError(`One file cannot include the stylesheet ${url}: only local files are inlined`);
        }
        if (url.split('/').some(segment => segment === '.' || segment === '..')) {
            throw new TypeError(`Page.css ${url} has a . or .. segment`);
        }
        let file;
        if (url.startsWith('/themes/')) {
            file = require.resolve(`@gramlot/gramlot${url}`);
        } else {
            file = join(folder, ...url.split('/').filter(Boolean));
            if (!inside(file, folder) || !(await isFile(file)) || !inside(await realpath(file), folder)) {
                throw new TypeError(`Page.css ${url} is not a file in the folder of the page: ${folder}`);
            }
        }
        files.push(file);
    }
    const own = await pageStylesheet(page);
    if (own) files.push(own);
    return files.filter((file, index) => files.lastIndexOf(file) === index);
}

/** The Worker script: GramlotWorkerServer and the Page. The logic module runs in the window. */
export async function workerBundle(page, options, {logic = null, stylesheet = null, inlineCss = false, collections = []} = {}) {
    const result = await bundle({...options, metafile: true, stdin: {
        resolveDir: dirname(page),
        contents: `import {GramlotWorkerServer} from ${JSON.stringify(workerServer)};
import {Page} from ${JSON.stringify(page)};
new GramlotWorkerServer(Page, ${JSON.stringify({logic, stylesheet, inlineCss, collections})});`,
    }});
    return {text: result.outputFiles[0].text, metafile: result.metafile};
}

/** The Logic export of the logic module as one ES module, imported by the window only. */
export async function logicBundle(logic, options) {
    return (await bundle({...options, format: 'esm', plugins: [windowCore], stdin: {
        resolveDir: dirname(logic.file),
        contents: `export {Logic} from ${JSON.stringify(logic.file)};`,
    }})).outputFiles[0].text;
}

/** Bundle a collection for the window, sharing the runtime used by page Logic. */
export async function collectionBundle(module, options) {
    return (await bundle({...options, format: 'esm', plugins: [windowCore],
        entryPoints: [module]})).outputFiles[0].text;
}
