import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as core from '@gramlot/gramlot';
import {GramlotServer} from '@gramlot/gramlot/server';
import {build} from '../src/build.js';
import {buildDirectory} from '../src/build-directory.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const libraries = new GramlotServer().libraryModules(new GramlotServer().collections);

const chartPage = `import {Bag, Page as BasePage} from '@gramlot/gramlot/page';
export class Page extends BasePage {
    static title = 'uPlot chart';
    main(root) {
        const rows = new Bag();
        for (let x = 0; x < 3; x++) rows.setItem('r' + x, null, {x, y: x * x});
        root.dataSetter({destination_path: 'rows', value: rows});
        root.dataSetter({destination_path: 'config', value: new Bag({engine: 'uplot', chartType: 'line', captionField: 'x'})});
        root.chartPane({storepath: 'rows', configpath: 'config', rowMode: 'attributes', height: '300px'});
    }
}
`;

/** Import one derived library module as the window does, with GramlotStandalone as the core of the window. */
async function importLibrary(text) {
    const previous = globalThis.GramlotStandalone;
    globalThis.GramlotStandalone = core;
    try { return await import('data:text/javascript;base64,' + Buffer.from(text).toString('base64')); }
    finally { globalThis.GramlotStandalone = previous; }
}

test('a page with a uPlot chart exports in both profiles; each library is a blob module of the window', async t => {
    const folder = await mkdtemp(join(root, 'tests/.build-'));
    t.after(() => rm(folder, {recursive: true, force: true}));
    const page = join(folder, 'chart.js');
    await writeFile(page, chartPage);
    for (const name of ['uplot', 'uplotStyle', 'xterm', 'xtermStyle']) {
        assert.match(libraries[name], new RegExp(`/assets/libraries/${name}\\.js$`), name);
    }

    // Directory: assets/collections.js holds the library modules; the route selects those of its graph.
    const output = join(folder, 'site');
    await buildDirectory({pages: {index: page}, output});
    const context = vm.createContext({});
    vm.runInContext(await readFile(join(output, 'assets/collections.js'), 'utf8'), context);
    const modules = vm.runInContext('gramlotCollectionModules', context);
    for (const url of Object.values(libraries)) {
        assert.equal(typeof modules[url], 'string', url);
        // One self-contained module: the chunks are inside and the core is the core of the window.
        assert.doesNotMatch(modules[url], /["']\.\/chunks\//, url);
        assert.doesNotMatch(modules[url], /from\s*["']@gramlot\/gramlot["']/, url);
    }
    const worker = await readFile(join(output, 'assets/workers/index.js'), 'utf8');
    for (const url of Object.values(libraries)) assert.ok(worker.includes(JSON.stringify(url)), url);
    const runtime = await readFile(join(output, 'assets/standalone.js'), 'utf8');
    assert.match(runtime, /import\(["']@gramlot\/libraries\/uplot["']\)/);
    assert.match(runtime, /import\(["']@gramlot\/libraries\/xterm["']\)/);
    assert.doesNotMatch(runtime, /u-cursor-x|xterm-helper-textarea|jodit-toolbar__box/, 'no library CSS in the window runtime');
    // A library loads on first use, after mount: the bootstrap revokes the other blob URLs and keeps its own.
    const created = new Map(), revoked = new Set();
    const bootstrap = vm.createContext({Blob, console, document: {baseURI: 'file:///site/'},
        URL: class extends URL {
            static createObjectURL(blob) { const url = `blob:${created.size}`; created.set(url, blob); return url; }
            static revokeObjectURL(url) { revoked.add(url); }
        },
        GramlotStandalone: {mount: async config => { bootstrap.mounted = config.modules; return {}; }}});
    vm.runInContext(await readFile(join(output, 'assets/collections.js'), 'utf8'), bootstrap);
    vm.runInContext(worker, bootstrap);
    await new Promise(resolve => setTimeout(resolve, 0));
    for (const [url, blob] of Object.entries(bootstrap.mounted)) {
        assert.equal(revoked.has(blob), Object.values(libraries).includes(url) ? false : true, url);
    }
    const uplot = await importLibrary(modules[libraries.uplot]);
    assert.equal(typeof uplot.default, 'function');
    assert.match((await importLibrary(modules[libraries.uplotStyle])).default, /\.uplot/);
    assert.match((await importLibrary(modules[libraries.xtermStyle])).default, /\.xterm/);

    // Single file: the same modules travel in the blob module map of the runtime script.
    const html = join(folder, 'chart.html');
    await build({page, output: html});
    const text = await readFile(html, 'utf8');
    for (const url of Object.values(libraries)) assert.ok(text.includes(JSON.stringify(url).slice(1, -1)), url);
    assert.match(text, /import\(["']@gramlot\/libraries\/uplot["']\)/);
});
