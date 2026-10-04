/** The gallery of @gramlot/gramlot-examples and the gramlot command, on Node and on Bun. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import {startGallery} from '../src/gallery.mjs';

const runtime = globalThis.Bun ? 'bun' : 'node';
const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));

test('the gallery stages one route per example under the mount prefix', async () => {
    const app = await startGallery({runtime, port: 0, mountPath: '/js/'});
    const get = path => fetch(app.url + path);
    try {
        assert.equal(app.galleryUrl, `${app.url}/js/`);
        const index = await get('/js/');
        assert.equal(index.status, 200);
        assert.match(await index.text(), /<title>Gramlot examples<\/title>/);
        const main = JSON.parse((await get('/js/e06').then(response => response.text()))
            .match(/new PageBootstrap\((.*)\)\.run\(\)/s)[1]);
        assert.deepEqual(main.resources.css.at(-1), '/js/e06.css');
        assert.equal((await get('/js/e06.css')).status, 200);
        const aux = await get('/js/c03_aux.js');
        assert.equal(await aux.text(), 'export {Logic} from "/js/pages/controllers/03_named_logic.js";\n');
        const logic = await get('/js/pages/controllers/03_named_logic.js');
        assert.ok(logic.headers.get('content-type').startsWith('text/javascript'));
        assert.match(await logic.text(), /export class Logic/);
        assert.equal((await get('/js/pages/controllers/03_named_logic.md')).headers.get('content-type'), 'text/plain');
        for (const path of ['/js/gallery/dist/gallery.js', '/js/gallery/dist/frame.js', '/js/gallery/gallery.css',
            '/js/assets/branding/gramlot-logo-dark.svg', '/js/themes/gramlot-base/theme.css', '/js/assets/gramlot.js']) {
            assert.equal((await get(path)).status, 200, path);
        }
        for (const path of ['/', '/e01', '/gallery/gallery.css']) assert.equal((await get(path)).status, 404, path);
        // The catalogue of this package for the runtime: the README quick start.
        assert.match(await (await get(`/js/${runtime}-01`)).text(), /<title>Hello<\/title>/);
    } finally { await app.close(); }
    assert.equal(existsSync(app.pages), false, 'close removes the staged pages');
});

test('the command: usage, unknown runtime or option, invalid port', () => {
    const run = (...args) => spawnSync(process.execPath, [cli, ...args], {encoding: 'utf8'});
    assert.match(run('--help').stdout, /gramlot node gallery/);
    for (const [args, message] of [[['deno', 'gallery'], /Usage/], [['node', 'serve'], /Usage/],
        [['node', 'gallery', '--verbose'], /Unknown option --verbose/], [['node', 'gallery', '--port', 'x'], /Invalid port/],
        [['node', 'gallery', '--catalog', 'catalog.json'], /--catalog needs a value/]]) {
        const result = run(...args);
        assert.equal(result.status, 1, args.join(' '));
        assert.match(result.stderr, message);
    }
});

test('the command runs the gallery on the other runtime when asked', async () => {
    const other = runtime === 'node' ? 'bun' : 'node';
    if (spawnSync(other, ['--version']).error) return;
    const child = spawn(process.execPath, [cli, other, 'gallery', '--port', '0'], {stdio: ['ignore', 'pipe', 'inherit']});
    try {
        const line = await new Promise((done, fail) => {
            createInterface({input: child.stdout}).once('line', done);
            child.once('exit', code => fail(new Error(`exit ${code}`)));
        });
        assert.match(line, new RegExp(`^Gramlot gallery \\(${other}\\): http://127\\.0\\.0\\.1:\\d+/$`));
        assert.equal((await fetch(line.split(': ')[1])).status, 200);
    } finally {
        child.kill('SIGTERM');
        await new Promise(done => child.exitCode !== null ? done() : child.once('exit', done));
    }
});

test('the quick-start page of the runtime catalogues is the README quick start', async () => {
    const {readFile} = await import('node:fs/promises');
    const quickstart = await readFile(new URL('./fixtures/quickstart/index.js', import.meta.url), 'utf8');
    for (const name of ['node', 'bun']) {
        assert.equal(await readFile(new URL(`../gallery/${name}/pages/${name}_pages/01_quick_start.js`, import.meta.url), 'utf8'),
            quickstart, name);
    }
});
