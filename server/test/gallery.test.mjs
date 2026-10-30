/** The gallery of @gramlot/gramlot-examples and the gramlot command, on Node and on Bun. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createInterface} from 'node:readline';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {startGallery} from '../src/gallery.mjs';

const runtime = globalThis.Bun ? 'bun' : 'node';
const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));

test('the gallery stages one route per example under the mount prefix', async () => {
    const app = await startGallery({runtime, port: 0, mountPath: '/js/', serverlessDownloadUrl: '/downloads/gallery.zip'});
    const get = path => fetch(app.url + path);
    try {
        assert.equal(app.galleryUrl, `${app.url}/js/`);
        assert.ok(readFileSync(`${app.pages}/index.js`, "utf8").includes('logoUrl = "/js/assets/branding/svg/gramlot-horizontal-primary.svg"'));
        assert.match(readFileSync(`${app.pages}/index.js`, 'utf8'), /serverlessDownloadUrl = "\/downloads\/gallery.zip"/);
        const companion = `${app.pages}/pages/02-binding/01-paths_and_updates/foo_data.tytx`;
        assert.ok(existsSync(companion));
        assert.match(readFileSync(companion,'utf8'), /Ada Lovelace/);
        const index = await get('/js/');
        assert.equal(index.status, 200);
        assert.match(await index.text(), /<title>Gramlot examples<\/title>/);
        const manifestResponse = await get('/js/app.webmanifest');
        assert.equal(manifestResponse.headers.get('content-type'), 'application/manifest+json');
        const manifest = await manifestResponse.json();
        assert.equal(manifest.start_url, '/js/');
        assert.equal(manifest.icons[0].src, '/js/assets/branding/app-icon.png');
        assert.equal((await get(manifest.icons[0].src)).headers.get('content-type'), 'image/png');
        assert.equal((await fetch(app.url + '/js/app.webmanifest', {method: 'HEAD'})).status, 200);
        assert.equal((await fetch(app.url + '/js/app.webmanifest', {method: 'POST'})).status, 405);
        assert.equal((await get('/js/pages/00-html_svg/01-html_basics/01-hello_world/app.webmanifest')).status, 404);
        const main = JSON.parse((await get('/js/pages/00-html_svg/02-native_controls/01-forms').then(response => response.text()))
            .match(/new PageBootstrap\((.*)\)\.run\(\)/s)[1]);
        assert.deepEqual(main.resources.css.at(-1), '/js/pages/00-html_svg/02-native_controls/01-forms.css');
        assert.ok(main.resources.collections.some(item => item.name === 'grid'));
        assert.ok(main.resources.collections.some(item => item.name === 'typst'));
        const textboxHtml = await get('/js/pages/01-inputs/01-text/01-textbox').then(response => response.text());
        const textbox = JSON.parse(textboxHtml.match(/new PageBootstrap\((.*)\)\.run\(\)/s)[1]);
        assert.deepEqual(textbox.resources.collections.map(item => item.name), main.resources.collections.map(item => item.name));
        for (const collection of textbox.resources.collections) {
            const resource = await get(collection.url);
            assert.equal(resource.status, 200);
            assert.equal(resource.headers.get('cache-control'), 'public, max-age=31536000, immutable');
        }
        assert.equal((await get('/js/pages/00-html_svg/02-native_controls/01-forms.css')).status, 200);
        const aux = await get('/js/pages/03-controllers/01-logic/03-named_logic_aux.js');
        assert.equal(await aux.text(), 'export * from "/js/pages/03-controllers/01-logic/03-named_logic.js";\n');
        const logic = await get('/js/pages/03-controllers/01-logic/03-named_logic.js');
        assert.ok(logic.headers.get('content-type').startsWith('text/javascript'));
        assert.match(await logic.text(), /export class Logic/);
        assert.equal((await get('/js/pages/03-controllers/01-logic/03-named_logic.md')).headers.get('content-type'), 'text/plain');
        for (const path of ['/js/gallery/dist/gallery.js', '/js/gallery/dist/frame.js', '/js/gallery/gallery.css',
            '/js/assets/branding/svg/gramlot-horizontal-primary.svg', '/js/themes/gramlot-base/theme.css', '/js/assets/gramlot.js']) {
            assert.equal((await get(path)).status, 200, path);
        }
        for (const path of ['/', '/e01', '/gallery/gallery.css']) assert.equal((await get(path)).status, 404, path);
        // Setup quick starts belong to the server documentation, not gallery routes.
        assert.equal((await get(`/js/${runtime}-01`)).status, 404);
    } finally { await app.close(); }
    assert.equal(existsSync(app.pages), false, 'close removes the staged pages');
});

test('the companion of an example re-exports every name of its module: valid with and without Logic', async () => {
    const fixtures = new URL('./fixtures/gallery/', import.meta.url);
    const catalog = [fileURLToPath(new URL('catalog.json', fixtures)), fileURLToPath(new URL('pages/', fixtures))];
    const app = await startGallery({runtime, port: 0, mountPath: '/js', catalogs: [catalog]});
    const folder = await mkdtemp(join(tmpdir(), 'gramlot-linked-'));
    try {
        const keys = ['modules-01', 'modules-02'];
        for (const [key, file] of [[keys[0], '01_without_logic'], [keys[1], '02_with_logic']]) {
            const aux = await fetch(`${app.url}/js/pages/modules/${file}_aux.js`);
            assert.equal(aux.status, 200, key);
            const text = await aux.text();
            assert.equal(text, `export * from "/js/pages/modules/${file}.js";\n`);
            assert.ok((await fetch(`${app.url}/js/pages/modules/${file}.js`)).headers.get('content-type').startsWith('text/javascript'));
            // The page of the example names its companion, whatever the module exports.
            const html = await fetch(`${app.url}/js/pages/modules/${file}`).then(response => response.text());
            const {resources} = JSON.parse(html.match(/new PageBootstrap\((.*)\)\.run\(\)/s)[1]);
            assert.deepEqual(resources.js, [{url: `/js/pages/modules/${file}_aux.js`, group: null}], key);
            // The URL of the module is a path of the server: link the same module from its file, as the browser links the URL.
            await writeFile(join(folder, `${key}.mjs`), text.replace('"/js/pages/', `"${new URL('pages/', fixtures).href}`));
        }
        const [plain, logic] = await Promise.all(keys.map(key => import(pathToFileURL(join(folder, `${key}.mjs`)).href)));
        assert.equal(Object.hasOwn(plain, 'Logic'), false, 'no Logic to link: not an error');
        assert.equal(typeof plain.Page, 'function');
        assert.equal(typeof logic.Logic, 'function');
        assert.equal(new logic.Logic().twice({base: 'ok'}), 'okok');
    } finally {
        await app.close();
        await rm(folder, {recursive: true, force: true});
    }
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

test('neither runtime ships a setup quick-start catalogue', () => {
    for (const name of ['node', 'bun']) {
        assert.equal(existsSync(new URL(`../gallery/${name}/catalog.json`, import.meta.url)), false);
    }
});
